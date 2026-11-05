import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Ferramentas de modelagem dos personagens (complementam o GeoBuilder):
 * - cores por vértice calculadas por função (degradês, blush, íris, faixas);
 * - deformação (warp) com normais suaves recalculadas;
 * - recorte de triângulos (abrir o rosto do capuz, linha do cabelo);
 * - contorno cartoon por "casco invertido" unido na MESMA geometria
 *   (cópia inflada com a ordem dos vértices invertida e cor escura): o contorno
 *   não custa draw call extra, só triângulos.
 */

export type V3 = [number, number, number];
/** p = posição local do vértice, n = normal local, c = centro do triângulo (local). */
export type ColorFn = (p: THREE.Vector3, n: THREE.Vector3, c: THREE.Vector3, out: THREE.Color) => void;

export interface CPartOpts {
  pos?: V3;
  rot?: V3;
  scale?: V3 | number;
  /** Variação de brilho por triângulo (0 = liso). */
  jitter?: number;
  /** Espessura do contorno (m). 0 = sem contorno. */
  outline?: number;
  /** Cor do contorno (padrão: versão bem escura da cor da peça). */
  outlineColor?: THREE.ColorRepresentation;
  /** Intensidade do degradê "luz de cima" gravado nas cores. */
  shade?: number;
  /** Deforma a geometria no espaço local (antes de posicionar). */
  warp?: (p: THREE.Vector3) => void;
  /** Descarta triângulos cujo centro (local) satisfaz a condição. */
  clip?: (c: THREE.Vector3) => boolean;
  /** Recalcula normais suaves (une vértices coincidentes). */
  smooth?: boolean;
  /** Adiciona a face interna (forro) com esta cor — tecido de duas faces. */
  lining?: THREE.ColorRepresentation;
  /** Geometria (mais simples) usada só para o casco do contorno. */
  hull?: THREE.BufferGeometry;
}

const OUTLINE_DARK = new THREE.Color('#1e0f07');
const _c = new THREE.Color();
const _c2 = new THREE.Color();
const _p = new THREE.Vector3();
const _n = new THREE.Vector3();
const _cen = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _t = new THREE.Vector3();
const _s = new THREE.Vector3();

let jSeed = 4242;
function jrand(): number {
  jSeed = (jSeed * 16807) % 2147483647;
  return jSeed / 2147483647;
}

/** Contornos ligados (pode ser desligado se o material deixar de ser FrontSide). */
export const CharacterStyle = { outlines: true, outlineScale: 1 };

function stripUv(g: THREE.BufferGeometry): void {
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
}

/** Inverte a ordem dos vértices (e as normais) de uma geometria não indexada. */
function flipWinding(g: THREE.BufferGeometry, negateNormals: boolean): void {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const nor = g.getAttribute('normal') as THREE.BufferAttribute;
  const pa = pos.array as Float32Array;
  const na = nor.array as Float32Array;
  for (let i = 0; i < pos.count; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = (i + 1) * 3 + k;
      const b = (i + 2) * 3 + k;
      let t = pa[a];
      pa[a] = pa[b];
      pa[b] = t;
      t = na[a];
      na[a] = na[b];
      na[b] = t;
    }
  }
  if (negateNormals) for (let i = 0; i < na.length; i++) na[i] = -na[i];
}

function clipTriangles(g: THREE.BufferGeometry, clip: (c: THREE.Vector3) => boolean): THREE.BufferGeometry {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const nor = g.getAttribute('normal') as THREE.BufferAttribute;
  const keepP: number[] = [];
  const keepN: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    _cen.set(0, 0, 0);
    for (let v = 0; v < 3; v++) _cen.add(_p.set(pos.getX(i + v), pos.getY(i + v), pos.getZ(i + v)));
    _cen.multiplyScalar(1 / 3);
    if (clip(_cen)) continue;
    for (let v = 0; v < 3; v++) {
      keepP.push(pos.getX(i + v), pos.getY(i + v), pos.getZ(i + v));
      keepN.push(nor.getX(i + v), nor.getY(i + v), nor.getZ(i + v));
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(keepP, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(keepN, 3));
  g.dispose();
  return out;
}

export class CharBuilder {
  private parts: THREE.BufferGeometry[] = [];
  constructor(
    private defaults: { jitter?: number; outline?: number; shade?: number } = {},
  ) {}

  get empty(): boolean {
    return this.parts.length === 0;
  }

  add(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation | ColorFn, o: CPartOpts = {}): this {
    stripUv(geo);
    // 1) deformação + normais suaves (na geometria indexada)
    let g = geo;
    if (o.warp) {
      const pos = g.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        _p.fromBufferAttribute(pos, i);
        o.warp(_p);
        pos.setXYZ(i, _p.x, _p.y, _p.z);
      }
    }
    if (o.warp || o.smooth) {
      g.deleteAttribute('normal');
      const merged = mergeVertices(g, 1e-5);
      g.dispose();
      g = merged;
      g.computeVertexNormals();
    } else if (!g.getAttribute('normal')) g.computeVertexNormals();

    // 2) casco do contorno (normais médias por posição → casco contínuo)
    const thick = (o.outline ?? this.defaults.outline ?? 0) * CharacterStyle.outlineScale;
    let hull: THREE.BufferGeometry | null = null;
    if (thick > 0 && CharacterStyle.outlines) {
      const src = o.hull ?? g;
      if (o.hull && o.warp) {
        const hp = o.hull.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < hp.count; i++) {
          _p.fromBufferAttribute(hp, i);
          o.warp(_p);
          hp.setXYZ(i, _p.x, _p.y, _p.z);
        }
      }
      const h0 = new THREE.BufferGeometry();
      h0.setAttribute('position', (src.getAttribute('position') as THREE.BufferAttribute).clone());
      if (src.index) h0.setIndex(src.index.clone());
      if (o.hull) o.hull.dispose();
      const hm = mergeVertices(h0, 1e-4);
      h0.dispose();
      hm.computeVertexNormals();
      hull = hm.toNonIndexed();
      hm.dispose();
      if (o.clip) hull = clipTriangles(hull, o.clip);
    } else if (o.hull) o.hull.dispose();

    // 3) não indexada + recorte
    let ng = g.index ? g.toNonIndexed() : g;
    if (ng !== g) g.dispose();
    if (o.clip) ng = clipTriangles(ng, o.clip);

    // 4) cores (espaço local)
    const pos = ng.getAttribute('position') as THREE.BufferAttribute;
    const nor = ng.getAttribute('normal') as THREE.BufferAttribute;
    const count = pos.count;
    const colors = new Float32Array(count * 3);
    const fn = typeof color === 'function' ? (color as ColorFn) : null;
    if (!fn) _c2.set(color as THREE.ColorRepresentation);
    const jitter = o.jitter ?? this.defaults.jitter ?? 0.02;
    for (let i = 0; i < count; i += 3) {
      if (fn) {
        _cen.set(0, 0, 0);
        for (let v = 0; v < 3; v++) _cen.add(_p.set(pos.getX(i + v), pos.getY(i + v), pos.getZ(i + v)));
        _cen.multiplyScalar(1 / 3);
      }
      const k = 1 + (jrand() * 2 - 1) * jitter;
      for (let v = 0; v < 3; v++) {
        const idx = i + v;
        if (fn) {
          _p.fromBufferAttribute(pos, idx);
          _n.fromBufferAttribute(nor, idx);
          fn(_p, _n, _cen, _c);
        } else _c.copy(_c2);
        colors[idx * 3] = _c.r * k;
        colors[idx * 3 + 1] = _c.g * k;
        colors[idx * 3 + 2] = _c.b * k;
      }
    }

    // 5) posiciona
    const s = o.scale ?? 1;
    _t.set(...(o.pos ?? [0, 0, 0]));
    _e.set(...(o.rot ?? [0, 0, 0]));
    _q.setFromEuler(_e);
    if (typeof s === 'number') _s.set(s, s, s);
    else _s.set(...s);
    _m.compose(_t, _q, _s);
    ng.applyMatrix4(_m);

    // 6) degradê de luz gravado (normal já transformada)
    const shade = o.shade ?? this.defaults.shade ?? 0.1;
    if (shade) {
      for (let i = 0; i < count; i++) {
        const f = 1 + shade * (nor.getY(i) - 0.25);
        colors[i * 3] *= f;
        colors[i * 3 + 1] *= f;
        colors[i * 3 + 2] *= f;
      }
    }
    for (let i = 0; i < colors.length; i++) colors[i] = Math.min(1, Math.max(0, colors[i]));
    ng.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.parts.push(ng);

    // 7) forro (face interna)
    if (o.lining !== undefined) {
      const lin = ng.clone();
      flipWinding(lin, true);
      _c.set(o.lining);
      const lc = lin.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < lc.count; i++) lc.setXYZ(i, _c.r, _c.g, _c.b);
      this.parts.push(lin);
    }

    // 8) contorno
    if (hull) {
      hull.applyMatrix4(_m);
      const hp = hull.getAttribute('position') as THREE.BufferAttribute;
      const hn = hull.getAttribute('normal') as THREE.BufferAttribute;
      for (let i = 0; i < hp.count; i++) {
        hp.setXYZ(i, hp.getX(i) + hn.getX(i) * thick, hp.getY(i) + hn.getY(i) * thick, hp.getZ(i) + hn.getZ(i) * thick);
      }
      flipWinding(hull, true);
      if (o.outlineColor !== undefined) _c.set(o.outlineColor);
      else {
        // contorno "colorido": cor da peça bem escurecida
        if (fn) {
          _p.set(0, 0, 0);
          _n.set(0, 1, 0);
          fn(_p, _n, _p, _c);
        } else _c.copy(_c2);
        _c.multiplyScalar(0.22).lerp(OUTLINE_DARK, 0.55);
      }
      const hc = new Float32Array(hp.count * 3);
      for (let i = 0; i < hp.count; i++) {
        hc[i * 3] = _c.r;
        hc[i * 3 + 1] = _c.g;
        hc[i * 3 + 2] = _c.b;
      }
      hull.setAttribute('color', new THREE.BufferAttribute(hc, 3));
      this.parts.push(hull);
    }
    return this;
  }

  private wantsHull(o?: CPartOpts): boolean {
    return CharacterStyle.outlines && (o?.outline ?? this.defaults.outline ?? 0) > 0;
  }
  sphere(r: number, ws: number, hs: number, color: THREE.ColorRepresentation | ColorFn, o?: CPartOpts): this {
    const hull = this.wantsHull(o) ? new THREE.SphereGeometry(r, Math.max(8, Math.round(ws * 0.6)), Math.max(6, Math.round(hs * 0.6))) : undefined;
    return this.add(new THREE.SphereGeometry(r, ws, hs), color, { hull, ...o });
  }
  cyl(rt: number, rb: number, h: number, seg: number, color: THREE.ColorRepresentation | ColorFn, o?: CPartOpts, hseg = 1, open = false): this {
    const hull = this.wantsHull(o) ? new THREE.CylinderGeometry(rt, rb, h, Math.max(8, Math.round(seg * 0.6)), hseg, open) : undefined;
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg, hseg, open), color, { hull, ...o });
  }
  capsule(r: number, len: number, capSeg: number, radSeg: number, color: THREE.ColorRepresentation | ColorFn, o?: CPartOpts): this {
    return this.add(new THREE.CapsuleGeometry(r, len, capSeg, radSeg), color, o);
  }
  torus(r: number, tube: number, rs: number, ts: number, color: THREE.ColorRepresentation | ColorFn, o?: CPartOpts, arc = Math.PI * 2): this {
    const hull = this.wantsHull(o) ? new THREE.TorusGeometry(r, tube, Math.max(4, Math.round(rs * 0.6)), Math.max(6, Math.round(ts * 0.6)), arc) : undefined;
    return this.add(new THREE.TorusGeometry(r, tube, rs, ts, arc), color, { hull, ...o });
  }
  lathe(points: [number, number][], seg: number, color: THREE.ColorRepresentation | ColorFn, o?: CPartOpts): this {
    const v = points.map(([x, y]) => new THREE.Vector2(x, y));
    const hull = this.wantsHull(o) ? new THREE.LatheGeometry(v, Math.max(10, Math.round(seg * 0.6))) : undefined;
    return this.add(new THREE.LatheGeometry(v, seg), color, { smooth: true, hull, ...o });
  }
  rbox(w: number, h: number, d: number, radius: number, color: THREE.ColorRepresentation | ColorFn, o?: CPartOpts, segs = 2): this {
    const rr = Math.min(radius, w / 2, h / 2, d / 2) * 0.999;
    const hull = this.wantsHull(o) ? new RoundedBoxGeometry(w, h, d, 1, rr) : undefined;
    return this.add(new RoundedBoxGeometry(w, h, d, segs, rr), color, { hull, ...o });
  }
  ico(r: number, detail: number, color: THREE.ColorRepresentation | ColorFn, o?: CPartOpts): this {
    return this.add(new THREE.IcosahedronGeometry(r, detail), color, o);
  }
  cone(r: number, h: number, seg: number, color: THREE.ColorRepresentation | ColorFn, o?: CPartOpts): this {
    return this.add(new THREE.ConeGeometry(r, h, seg), color, o);
  }
  /** Tubo ao longo de uma curva suave (cajados, alças, tranças). */
  tube(points: V3[], radius: number, tSeg: number, rSeg: number, color: THREE.ColorRepresentation | ColorFn, o?: CPartOpts, closed = false): this {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed);
    const hull = this.wantsHull(o) ? new THREE.TubeGeometry(curve, Math.max(4, Math.round(tSeg * 0.6)), radius, Math.max(5, Math.round(rSeg * 0.7)), closed) : undefined;
    return this.add(new THREE.TubeGeometry(curve, tSeg, radius, rSeg, closed), color, { hull, ...o });
  }

  build(): THREE.BufferGeometry {
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    if (!merged) throw new Error('CharBuilder: falha ao unir geometrias');
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    return merged;
  }
}

// ---------------------------------------------------------------- cores
export function col(hex: THREE.ColorRepresentation): THREE.Color {
  return new THREE.Color(hex);
}
/** Mistura duas cores (em espaço linear). */
export function mix(a: THREE.ColorRepresentation, b: THREE.ColorRepresentation, t: number): THREE.Color {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}
export function shadeColor(a: THREE.ColorRepresentation, f: number): THREE.Color {
  return new THREE.Color(a).multiplyScalar(f);
}
/** Luminância aproximada (0..1) de uma cor. */
export function luma(a: THREE.ColorRepresentation): number {
  const c = new THREE.Color(a);
  return c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Gerador pseudoaleatório determinístico (modelos sempre iguais). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Mola amortecida para movimento secundário (cabelo, bolsa, manto). */
export class Spring {
  x = 0;
  v = 0;
  constructor(
    public k: number,
    public c: number,
  ) {}
  step(target: number, dt: number): number {
    const a = this.k * (target - this.x) - this.c * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
    return this.x;
  }
  reset(x = 0): void {
    this.x = x;
    this.v = 0;
  }
}
