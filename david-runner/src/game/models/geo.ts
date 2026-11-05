import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type V3 = [number, number, number];
export interface PartOpts {
  pos?: V3;
  rot?: V3;
  scale?: V3 | number;
  /** Variação de brilho por triângulo (0 = cor lisa). */
  jitter?: number;
}

const tmpColor = new THREE.Color();
const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();

let jitterSeed = 12345;
function jrand(): number {
  jitterSeed = (jitterSeed * 16807) % 2147483647;
  return jitterSeed / 2147483647;
}

/**
 * Monta modelos low-poly a partir de primitivas com cores por vértice e une tudo
 * numa única geometria — cada modelo vira 1 draw call.
 */
export class GeoBuilder {
  private parts: THREE.BufferGeometry[] = [];
  constructor(private defaultJitter = 0.05) {}

  add(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation, o: PartOpts = {}): this {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g === geo) g = geo.clone();
    geo.dispose();
    g.deleteAttribute('uv');
    if (g.getAttribute('uv1')) g.deleteAttribute('uv1');
    const s = o.scale ?? 1;
    tmpPos.set(...(o.pos ?? [0, 0, 0]));
    tmpEuler.set(...(o.rot ?? [0, 0, 0]));
    tmpQuat.setFromEuler(tmpEuler);
    if (typeof s === 'number') tmpScale.set(s, s, s);
    else tmpScale.set(...s);
    tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
    g.applyMatrix4(tmpMatrix);

    const count = g.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    tmpColor.set(color);
    const jitter = o.jitter ?? this.defaultJitter;
    for (let i = 0; i < count; i += 3) {
      const k = 1 + (jrand() * 2 - 1) * jitter;
      for (let v = 0; v < 3 && i + v < count; v++) {
        colors[(i + v) * 3] = Math.min(1, tmpColor.r * k);
        colors[(i + v) * 3 + 1] = Math.min(1, tmpColor.g * k);
        colors[(i + v) * 3 + 2] = Math.min(1, tmpColor.b * k);
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.parts.push(g);
    return this;
  }

  box(w: number, h: number, d: number, color: THREE.ColorRepresentation, o?: PartOpts): this {
    return this.add(new THREE.BoxGeometry(w, h, d), color, o);
  }
  cyl(rt: number, rb: number, h: number, seg: number, color: THREE.ColorRepresentation, o?: PartOpts): this {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, o);
  }
  sphere(r: number, ws: number, hs: number, color: THREE.ColorRepresentation, o?: PartOpts): this {
    return this.add(new THREE.SphereGeometry(r, ws, hs), color, o);
  }
  cone(r: number, h: number, seg: number, color: THREE.ColorRepresentation, o?: PartOpts): this {
    return this.add(new THREE.ConeGeometry(r, h, seg), color, o);
  }
  ico(r: number, detail: number, color: THREE.ColorRepresentation, o?: PartOpts): this {
    return this.add(new THREE.IcosahedronGeometry(r, detail), color, o);
  }
  dodeca(r: number, color: THREE.ColorRepresentation, o?: PartOpts): this {
    return this.add(new THREE.DodecahedronGeometry(r, 0), color, o);
  }
  torus(r: number, tube: number, rs: number, ts: number, color: THREE.ColorRepresentation, o?: PartOpts, arc = Math.PI * 2): this {
    return this.add(new THREE.TorusGeometry(r, tube, rs, ts, arc), color, o);
  }
  lathe(points: [number, number][], seg: number, color: THREE.ColorRepresentation, o?: PartOpts): this {
    return this.add(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg), color, o);
  }
  /** Prisma triangular (telhados, bandeirolas). */
  prism(w: number, h: number, d: number, color: THREE.ColorRepresentation, o?: PartOpts): this {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, h);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return this.add(g, color, o);
  }

  get empty(): boolean {
    return this.parts.length === 0;
  }

  build(): THREE.BufferGeometry {
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    if (!merged) throw new Error('GeoBuilder: falha ao unir geometrias');
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    return merged;
  }
}
