import * as THREE from 'three';
import type { CharacterLook } from '../../data/characters';
import { CharacterStyle, CharBuilder, luma, mix, seeded, shadeColor, smoothstep, type ColorFn, type V3 } from './characterExtras';
import { Materials } from './materials';

/** Articulações opcionais para movimento secundário e expressões. */
export interface CharacterExtras {
  /** Saia/barra da túnica (balanço e abertura com as pernas). */
  skirt?: THREE.Group;
  /** Cabelo (quica com o corpo). */
  hair?: THREE.Group;
  /** Cabelo comprido, tranças ou caimento do capuz (balança para trás). */
  hairBack?: THREE.Group;
  /** Pálpebras (rotation.x entre lidClosed e lidOpen). */
  lids?: THREE.Group;
  /** Sobrancelhas (rotation.x > 0 levanta). */
  brows?: THREE.Group;
  /** Boca (scale.y = abertura, scale.x = largura). */
  mouth?: THREE.Group;
  bag?: THREE.Group;
  cape?: THREE.Group;
  /** Animalzinho no ombro (pomba de Noé). */
  pet?: THREE.Group;
  lidOpen: number;
  lidClosed: number;
  longRobe: boolean;
  /** Carrega cajado na mão direita (braço direito balança menos). */
  holdsStaff: boolean;
}

/**
 * Personagem 3D estilizado, montado com geometria própria e um esqueleto simples
 * (grupos aninhados) animado por código. Para trocar por um modelo definitivo
 * (glTF), basta devolver um CharacterRig com as mesmas articulações.
 */
export interface CharacterRig {
  root: THREE.Group;
  pivot: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  foreL: THREE.Group;
  foreR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  shinL: THREE.Group;
  shinR: THREE.Group;
  hipHeight: number;
  extras?: CharacterExtras;
  dispose(): void;
}

const HIP = 0.8;
/** Comprimentos: coxa, canela, braço e antebraço. */
const TL = 0.36;
const SL = 0.31;
const UL = 0.27;
const FL = 0.24;
/** Espessura padrão do contorno cartoon. */
const OL = 0.011;
const PI = Math.PI;
/** Ângulo do antebraço em que o cajado fica na vertical. */
const STAFF_A = 0.95;

const SCLERA = '#fdfaf3';
const PUPIL = '#120a05';
const LASH = '#24140b';
const BLUSH = '#f07868';
const GOLD = '#e6b03c';
const MOUTH_IN = '#4a1410';

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function addMesh(geo: THREE.BufferGeometry, parent: THREE.Object3D, list: THREE.Mesh[], shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, Materials.character);
  m.castShadow = shadow;
  parent.add(m);
  list.push(m);
  return m;
}

/** Cor da íris (cada herói com um tom). */
function irisFor(look: CharacterLook): string {
  if (look.hairStyle === 'curly') return '#8b5124';
  if (look.hairStyle === 'long') return '#4f6f96';
  if (look.hairStyle === 'wavy') return '#4f7f34';
  if (look.hairStyle === 'braids') return '#6e3f17';
  if (look.headwear === 'turban') return '#5a3b1e';
  return '#6d4a26';
}

/** Linha do cabelo (u = direção unitária a partir do centro da cabeça). */
function hairlineY(u: THREE.Vector3, front = 0.5, side = 0.0, back = -0.62): number {
  const az = Math.abs(Math.atan2(u.x, -u.z)) / PI; // 0 = frente, 1 = nuca
  if (az < 0.5) return front + (side - front) * smoothstep(0, 1, az / 0.5);
  return side + (back - side) * smoothstep(0, 1, (az - 0.5) / 0.5);
}

/** Pontos bem distribuídos numa esfera (espiral de Fibonacci). */
function fibonacci(n: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const ga = PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = ga * i;
    out.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
  }
  return out;
}

/** Calota esférica voltada para -Z (íris, pupila). */
function capGeo(r: number, angle: number, ws = 20, hs = 6): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, ws, hs, 0, PI * 2, 0, angle);
  g.rotateX(-PI / 2);
  return g;
}

export function buildCharacter(look: CharacterLook): CharacterRig {
  // o contorno depende de o material desenhar só a face da frente
  CharacterStyle.outlines = Materials.character.side === THREE.FrontSide;
  const meshes: THREE.Mesh[] = [];
  const root = new THREE.Group();
  root.name = 'character';
  const pivot = group(root, 0, HIP, 0);
  const bulk = look.bulk;
  const bw = 1 + (bulk - 1) * 0.85;
  const bd = 1 + (bulk - 1) * 0.5;
  const hs = look.headScale;
  const longRobe = look.robeLength === 'long';
  const young = look.beard === 'none';
  const stripes = look.stripes && look.stripes.length ? look.stripes : null;
  const skin = new THREE.Color(look.skin);
  const skinDark = shadeColor(look.skin, 0.84);
  const tunic = new THREE.Color(look.tunic);
  const trim = new THREE.Color(look.tunicTrim);
  const hair = new THREE.Color(look.hair);
  const darkHair = luma(look.hair) < 0.08;
  const hairHi = darkHair ? mix(look.hair, '#a8784e', 0.42) : mix(look.hair, '#ffffff', 0.35);
  const hairLo = shadeColor(look.hair, darkHair ? 0.62 : 0.74);
  const beardCol = new THREE.Color(look.beardColor ?? look.hair);
  const holdsStaff = look.accessory === 'staff' || look.accessory === 'longStaff';
  const mantle = look.cape ?? (look.accessory === 'longStaff' ? '#' + mix(look.tunic, '#2a1810', 0.42).getHexString() : null);

  /** Cor da túnica numa altura (faixas do José). */
  const robeAt = (t: number, out: THREE.Color) => {
    if (!stripes) return out.copy(tunic);
    const i = Math.min(stripes.length - 1, Math.max(0, Math.floor(t * stripes.length)));
    return out.set(stripes[i]);
  };

  // ======================================================== SAIA (túnica de baixo)
  const skirt = group(pivot, 0, 0.06, 0);
  {
    const b = new CharBuilder({ outline: OL, shade: 0.14, jitter: 0.012 });
    const hemY = longRobe ? -0.68 : -0.41;
    const rTop = 0.226;
    const rBot = longRobe ? 0.39 : 0.335;
    const pts: [number, number][] = [
      [rBot - 0.04, hemY + 0.035],
      [rBot - 0.016, hemY - 0.004],
      [rBot, hemY + 0.002],
    ];
    // alturas das linhas: grade regular + divisas de cor (barra e faixas)
    const rows = new Set<number>();
    for (let i = 1; i <= 10; i++) rows.add(i / 10);
    rows.add(0.05 / -hemY);
    if (stripes) for (let k = 1; k < stripes.length; k++) rows.add(1 - k / stripes.length);
    const tl = [...rows].sort((a, b2) => a - b2).filter((t, i, arr) => i === 0 || t - arr[i - 1] > 0.02);
    for (const t of tl) pts.push([rBot + (rTop - rBot) * Math.pow(t, 0.8), hemY * (1 - t)]);
    pts.push([0.08, 0.01], [0.001, 0.012]);
    const folds = (phi: number) => Math.sin(phi * 9 + 0.8 * Math.sin(phi * 3));
    const fn: ColorFn = (_p, _n, c, out) => {
      const depth = Math.min(1, Math.max(0, -c.y / -hemY));
      const phi = Math.atan2(c.x, c.z);
      if (c.y < hemY + 0.05) out.copy(trim);
      else if (stripes) robeAt(depth * 0.999, out);
      else out.copy(tunic);
      // vales das dobras mais escuros + sombra sob o cinto
      out.multiplyScalar((1 - 0.1 * (1 - folds(phi)) * 0.5 * depth) * (0.88 + 0.12 * smoothstep(0.0, 0.12, depth)));
    };
    b.lathe(pts, 34, fn, {
      scale: [1.1 * bw, 1, 0.94 * bd],
      warp: (p) => {
        const depth = Math.min(1, Math.max(0, -p.y / -hemY));
        const phi = Math.atan2(p.x, p.z);
        const r = Math.hypot(p.x, p.z);
        if (r < 0.01) return;
        const k = (r + (longRobe ? 0.022 : 0.018) * Math.pow(depth, 1.2) * folds(phi)) / r;
        p.x *= k;
        p.z *= k;
      },
    });
    addMesh(b.build(), skirt, meshes);
  }

  // ======================================================== TRONCO
  const torso = group(pivot, 0, 0.02, 0);
  const TX = 1.1 * bw;
  const TZ = 0.82 * bd;
  const torsoProfile: [number, number][] = [
    [0.001, -0.03],
    [0.222, -0.02],
    [0.222, 0.05],
    [0.229, 0.13],
    [0.24, 0.22],
    [0.246, 0.31],
    [0.237, 0.39],
    [0.208, 0.455],
    [0.158, 0.497],
    [0.086, 0.522],
    [0.001, 0.527],
  ];
  const torsoR = (y: number) => {
    for (let i = 1; i < torsoProfile.length; i++) {
      const [r1, y1] = torsoProfile[i];
      const [r0, y0] = torsoProfile[i - 1];
      if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
    }
    return 0.1;
  };
  {
    const b = new CharBuilder({ outline: OL, shade: 0.12, jitter: 0.012 });
    const fn: ColorFn = (_p, _n, c, out) => {
      const r = Math.hypot(c.x, c.z);
      if (c.y > 0.47 && r < 0.17) out.copy(trim);
      else if (stripes) robeAt(Math.min(0.999, Math.max(0, (0.5 - c.y) / 0.52)), out);
      else out.copy(tunic);
      out.multiplyScalar(0.9 + 0.1 * smoothstep(0.05, 0.3, c.y));
    };
    const prof = [...torsoProfile];
    if (stripes) {
      for (let k = 1; k < stripes.length; k++) {
        const y = 0.5 - (k / stripes.length) * 0.52;
        prof.push([torsoR(y), y]);
      }
      prof.sort((a, b2) => a[1] - b2[1]);
    }
    b.lathe(prof, 26, fn, {
      scale: [TX, 1, TZ],
      warp: (p) => {
        const r = Math.hypot(p.x, p.z);
        if (r < 0.01) return;
        const phi = Math.atan2(p.x, p.z);
        const k = (r + 0.006 * Math.sin(phi * 9) * smoothstep(0.24, 0.05, p.y) * smoothstep(-0.02, 0.06, p.y)) / r;
        p.x *= k;
        p.z *= k;
      },
    });
    // gola
    b.torus(0.098, 0.017, 5, 24, look.tunicTrim, { pos: [0, 0.516, 0], rot: [PI / 2, 0, 0], scale: [TX * 1.02, TZ * 1.04, 1], outline: 0.006 });
    // ----- cinto
    const bx = torsoR(0.05) * TX + 0.012;
    const bz = torsoR(0.05) * TZ + 0.012;
    if (longRobe) {
      // faixa de tecido com nó e pontas
      b.cyl(1, 1, 0.1, 24, look.belt, { pos: [0, 0.045, 0], scale: [bx, 1, bz], outline: OL, shade: 0.16 });
      b.sphere(0.04, 10, 8, look.belt, { pos: [-0.1 * bw, 0.04, -bz - 0.012], scale: [1.2, 1, 0.8], outline: 0.007 });
      b.rbox(0.05, 0.2, 0.016, 0.008, look.belt, { pos: [-0.085 * bw, -0.07, -bz - 0.02], rot: [0.05, 0, 0.12], outline: 0.006 });
      b.rbox(0.045, 0.16, 0.016, 0.008, shadeColor(look.belt, 0.85), { pos: [-0.13 * bw, -0.05, -bz - 0.014], rot: [0.05, 0, -0.18], outline: 0.006 });
    } else {
      b.cyl(1, 1, 0.075, 24, look.belt, { pos: [0, 0.045, 0], scale: [bx, 1, bz], outline: OL, shade: 0.16 });
      b.rbox(0.075, 0.068, 0.024, 0.01, GOLD, { pos: [0, 0.045, -bz - 0.004], outline: 0.006 });
      b.rbox(0.042, 0.036, 0.012, 0.006, shadeColor(look.belt, 0.8), { pos: [0, 0.045, -bz - 0.014] });
    }
    // ----- alça da bolsa (do ombro direito ao quadril esquerdo)
    if (look.bag) {
      const tilt = 0.72;
      const yc = 0.24;
      const rz = torsoR(yc) * TZ + 0.014;
      const rx = (torsoR(yc) * TX + 0.016) / Math.cos(tilt);
      const g = new THREE.TorusGeometry(rz, 0.019, 4, 36);
      g.rotateX(PI / 2);
      g.scale(rx / rz, 1.0, 1);
      b.add(g, look.bagColor, { pos: [0, yc, 0], rot: [0, 0, tilt], outline: 0.006, shade: 0.12 });
    }
    addMesh(b.build(), torso, meshes);
  }

  // ======================================================== CABEÇA
  const head = group(torso, 0, 0.5, 0);
  const R = 0.272 * hs;
  const cy = 0.09 + R * 0.86;
  const HS: V3 = [1.0, 0.97, 0.95];
  const surfZ = (x: number, yRel: number) => {
    const q = 1 - (x / (HS[0] * R)) ** 2 - (yRel / (HS[1] * R)) ** 2;
    return -HS[2] * R * Math.sqrt(Math.max(0, q));
  };
  const re = 0.075 * hs;
  const ex = 0.102 * hs;
  const eyRel = 0.016 * hs;
  const EYE_S: V3 = [1, 1.12, 0.72];
  const ez = surfZ(ex, eyRel) + re * EYE_S[2] * 0.5;
  const ey = cy + eyRel;
  const bearded = look.beard !== 'none';
  {
    const b = new CharBuilder({ outline: OL, shade: 0.08, jitter: 0 });
    // pescoço
    b.cyl(0.066 * (1 + (bulk - 1) * 0.8), 0.074 * (1 + (bulk - 1) * 0.8), 0.18, 12, skinDark, { pos: [0, 0.06, 0.01], outline: 0.008 });
    // crânio + rosto (bochechas levemente mais largas)
    const blushK = young ? 0.5 : 0.28;
    const headFn: ColorFn = (p, _n, _c, out) => {
      const ux = p.x / R;
      const uy = p.y / R;
      const uz = p.z / R;
      out.copy(skin);
      let w = 0;
      for (const sx of [-1, 1]) {
        const d2 = (ux - sx * 0.52) ** 2 + (uy + 0.3) ** 2 * 1.3 + (uz + 0.78) ** 2;
        w += Math.exp(-d2 / 0.03);
      }
      out.lerp(_blush, Math.min(1, w) * blushK);
      out.multiplyScalar(0.8 + 0.2 * smoothstep(-0.98, -0.55, uy));
    };
    const _blush = new THREE.Color(BLUSH);
    b.sphere(R, 32, 22, headFn, {
      pos: [0, cy, 0],
      scale: HS,
      warp: (p) => {
        const uy = p.y / R;
        const uz = p.z / R;
        const m = Math.exp(-((uy + 0.32) ** 2) / 0.09) * smoothstep(0.45, -0.55, uz);
        p.x *= 1 + 0.075 * m;
        // queixo levemente arredondado para a frente
        p.z -= 0.025 * R * smoothstep(-0.45, -0.85, uy) * smoothstep(0.2, -0.6, uz);
      },
    });
    // orelhas
    for (const sx of [-1, 1]) {
      b.sphere(0.062 * hs, 10, 8, look.skin, { pos: [sx * R * 0.97, cy - 0.03, 0.025], rot: [0, sx * 0.35, sx * 0.12], scale: [0.42, 1, 0.72], outline: 0.008 });
      b.sphere(0.036 * hs, 8, 6, mix(look.skin, '#b8564c', 0.3), { pos: [sx * (R * 0.97 + 0.016), cy - 0.03, 0.018], rot: [0, sx * 0.35, 0], scale: [0.3, 0.8, 0.55], outline: 0 });
    }
    // nariz
    const nyRel = -0.038 * hs;
    b.sphere(0.036 * hs, 12, 9, mix(look.skin, BLUSH, 0.16), {
      pos: [0, cy + nyRel, surfZ(0, nyRel) + 0.012],
      scale: [1.05, 0.82, 0.9],
      outline: 0.006,
    });
    // olhos: esclera, íris em degradê, pupila e dois brilhos
    const iris = new THREE.Color(irisFor(look));
    const irisDark = shadeColor(irisFor(look), 0.45);
    const irisLight = mix(irisFor(look), '#ffe7b0', 0.35);
    const irisA = 0.7;
    const irisFn: ColorFn = (p, _n, _c, out) => {
      const a = Math.acos(Math.min(1, Math.max(-1, -p.z / (re * 1.02))));
      const t = a / irisA;
      out.copy(iris).lerp(irisLight, smoothstep(0.1, -1, p.y / re) * 0.8);
      out.lerp(irisDark, smoothstep(0.55, 1.0, t));
    };
    const scleraFn: ColorFn = (p, _n, _c, out) => {
      out.set(SCLERA).multiplyScalar(0.82 + 0.18 * smoothstep(0.85, 0.2, p.y / re));
    };
    for (const sx of [-1, 1]) {
      const c: V3 = [sx * ex, ey, ez];
      b.sphere(re, 18, 12, scleraFn, { pos: c, scale: EYE_S, outline: 0, shade: 0 });
      b.add(capGeo(re * 1.02, irisA, 18, 5), irisFn, { pos: c, scale: EYE_S, outline: 0, shade: 0 });
      b.add(capGeo(re * 1.036, 0.34, 14, 3), PUPIL, { pos: c, scale: EYE_S, outline: 0, shade: 0 });
      const hl = (dx: number, dy: number, r: number) => {
        const d = new THREE.Vector3(dx, dy, -1).normalize().multiplyScalar(re * 1.05);
        b.sphere(r, 7, 5, '#ffffff', { pos: [c[0] + d.x * EYE_S[0], c[1] + d.y * EYE_S[1], c[2] + d.z * EYE_S[2]], outline: 0, shade: 0 });
      };
      hl(0.34, 0.36, re * 0.2);
      hl(-0.22, -0.26, re * 0.09);
    }
    // barba
    if (look.beard !== 'none') {
      const long = look.beard === 'long';
      const bHi = mix(beardCol, '#ffffff', 0.12);
      const bLo = shadeColor(beardCol, 0.8);
      const beardFn: ColorFn = (_p, n, _c, out) => {
        out.copy(bLo).lerp(beardCol, smoothstep(-0.8, 0.2, n.y)).lerp(bHi, smoothstep(0.2, 1, n.y) * 0.7);
      };
      const blob = (x: number, y: number, z: number, r: number, s: V3, rot: V3 = [0, 0, 0]) =>
        b.sphere(r * R, 14, 10, beardFn, { pos: [x * R, cy + y * R, z * R], scale: s, rot, outline: OL, jitter: 0.015 });
      blob(0, -0.74, -0.6, 0.36, [1.3, 0.85, 0.9]);
      for (const sx of [-1, 1]) {
        blob(sx * 0.55, -0.52, -0.55, 0.3, [0.92, 1.0, 0.95], [0, 0, sx * 0.3]);
        blob(sx * 0.84, -0.2, -0.3, 0.21, [0.6, 1.45, 1.0], [0, sx * 0.5, sx * 0.1]);
        blob(sx * 0.68, -0.6, -0.12, 0.25, [0.85, 0.9, 1.0]);
      }
      // bigode
      for (const sx of [-1, 1]) {
        b.sphere(0.045 * hs, 10, 8, beardCol, {
          pos: [sx * 0.045 * hs, cy - 0.082 * hs, surfZ(0.045, -0.082 * hs) - 0.004],
          rot: [0, sx * -0.2, sx * 0.38],
          scale: [1.55, 0.62, 0.8],
          outline: 0.007,
        });
      }
      if (long) {
        // barba longa em camadas até o peito
        blob(0, -1.02, -0.66, 0.38, [1.3, 1, 0.82]);
        blob(0, -1.34, -0.66, 0.33, [1.25, 1, 0.8]);
        blob(0, -1.64, -0.62, 0.26, [1.2, 1, 0.78]);
        blob(0, -1.9, -0.58, 0.17, [1.1, 1.1, 0.8]);
        for (const sx of [-1, 1]) blob(sx * 0.42, -1.05, -0.58, 0.26, [0.9, 1.2, 0.8], [0, 0, sx * 0.25]);
      }
    }
    // ----- cabelo curto (fica sob o turbante ou capuz)
    if (look.hairStyle === 'short' && look.headwear === 'hood') {
      for (let i = 0; i < 4; i++) {
        const x = -0.36 + i * 0.24;
        b.sphere(0.05 * hs, 8, 6, i % 2 ? hair : hairHi, { pos: [x * R, cy + R * 0.66, surfZ(x * R, R * 0.66) + 0.006], rot: [0.3, 0, (i - 1.5) * 0.4], scale: [1.4, 0.7, 0.8], outline: 0.006 });
      }
    } else if (look.hairStyle === 'short') {
      const capFn: ColorFn = (p, _n, _c, out) => {
        out.copy(hair).lerp(hairHi, smoothstep(0.3, 1, p.y / R) * 0.5);
      };
      b.sphere(R * 1.045, 24, 16, capFn, {
        pos: [0, cy + 0.005, 0.005],
        scale: HS,
        clip: (c) => {
          const u = c.clone().normalize();
          return u.y < hairlineY(u, 0.52, -0.05, -0.55);
        },
        outline: OL,
      });
      for (const sx of [-1, 1]) {
        b.sphere(0.05 * hs, 8, 6, hair, { pos: [sx * R * 0.93, cy - 0.02, -R * 0.2], scale: [0.4, 1.3, 0.8], outline: 0.006 });
      }
    }
    // ----- adereços de cabeça
    if (look.headwear === 'hood') {
      const hc = new THREE.Color(look.headwearColor);
      const rimC = mix(look.headwearColor, '#fff4dc', 0.18);
      const f = new THREE.Vector3(0, 0.08, -1).normalize();
      const openCos = Math.cos(1.0);
      const hoodR = R * 1.2;
      const hoodFn: ColorFn = (p, _n, _c, out) => {
        out.copy(hc).multiplyScalar(0.88 + 0.12 * smoothstep(-0.6, 0.8, p.y / hoodR));
      };
      b.sphere(hoodR, 26, 18, hoodFn, {
        pos: [0, cy + 0.02, 0.03],
        scale: [1.04, 1.05, 1.06],
        warp: (p) => {
          const phi = Math.atan2(p.x, p.z);
          const k = 1 + 0.025 * Math.sin(phi * 7) * smoothstep(0.2, -0.6, p.y / hoodR);
          p.x *= k;
          p.z *= k;
        },
        clip: (c) => {
          const u = c.clone().normalize();
          if (u.dot(f) > openCos) return true;
          return u.y < -0.62;
        },
        lining: shadeColor(look.headwearColor, 0.55),
        outline: OL,
      });
      // borda da abertura do rosto
      const rimR = hoodR * Math.sin(1.0);
      b.torus(rimR, 0.032, 6, 28, rimC, {
        pos: [0, cy + 0.02 + f.y * hoodR * Math.cos(1.0), 0.03 + f.z * hoodR * Math.cos(1.0) * 1.06],
        rot: [-0.08, 0, 0],
        scale: [1.04, 1.05, 1],
        outline: 0.008,
      });
      // caimento atrás do pescoço
      b.sphere(0.2, 14, 10, hoodFn, { pos: [0, cy - R * 1.0, R * 0.55], scale: [1.35, 0.75, 0.85], outline: OL });
    } else if (look.headwear === 'turban') {
      const tc = new THREE.Color(look.headwearColor);
      const tc2 = mix(look.headwearColor, '#8a7454', 0.28);
      b.sphere(R * 1.06, 22, 14, tc, {
        pos: [0, cy + R * 0.3, 0.02],
        scale: [1.0, 0.8, 1.0],
        clip: (c) => c.y < -R * 0.15,
        outline: OL,
        shade: 0.18,
      });
      const wraps: [number, number, number, number, THREE.Color][] = [
        [0.42, 1.0, 0.16, 0.05, tc],
        [0.56, 0.95, -0.14, -0.07, tc2],
        [0.7, 0.82, 0.2, 0.06, tc],
      ];
      for (const [y, r, rx, rz, c] of wraps) {
        b.torus(R * r, 0.068 * hs, 8, 28, c, { pos: [0, cy + R * y, 0.015], rot: [PI / 2 + rx, 0, rz], scale: [1.02, 0.98, 1], outline: OL, shade: 0.16 });
      }
      // joia na frente
      const jz = surfZ(0, R * 0.5) * 1.17;
      b.torus(0.042 * hs, 0.012, 5, 12, GOLD, { pos: [0, cy + R * 0.52, jz], outline: 0.005 });
      b.sphere(0.036 * hs, 10, 8, '#c4213f', { pos: [0, cy + R * 0.52, jz - 0.006], scale: [1, 1.15, 0.7], outline: 0 });
      b.cone(0.03 * hs, 0.14, 8, '#f3ead2', { pos: [0, cy + R * 0.82, jz + 0.03], rot: [-0.25, 0, 0], outline: 0.006 });
    } else if (look.headwear === 'headband') {
      b.torus(R * 1.1, 0.024, 6, 30, look.headwearColor, { pos: [0, cy + R * 0.4, 0.01], rot: [PI / 2 + 0.14, 0, 0], scale: [1.02, 0.97, 1], outline: 0.007 });
      b.sphere(0.034 * hs, 10, 8, '#3f8fd6', { pos: [0, cy + R * 0.48, -R * 1.07], scale: [1, 1.2, 0.6], outline: 0.005 });
    }
    addMesh(b.build(), head, meshes);
  }

  // ----- pálpebras (piscar e expressões)
  const lidOuter = group(head, 0, ey, ez);
  lidOuter.scale.set(...EYE_S);
  const lids = group(lidOuter);
  {
    const b = new CharBuilder({ outline: 0, shade: 0.05, jitter: 0 });
    const lidC = mix(look.skin, '#b8705c', 0.14);
    for (const sx of [-1, 1]) {
      b.add(new THREE.SphereGeometry(re * 1.075, 16, 6, PI, PI, 0, PI / 2), lidC, { pos: [sx * ex, 0, 0] });
      b.torus(re * 1.08, 0.0088 * hs, 4, 16, LASH, { pos: [sx * ex, 0, 0], rot: [-PI / 2, 0, 0] }, PI);
      // cílio no canto de fora
      b.sphere(0.014 * hs, 6, 4, LASH, { pos: [sx * (ex + re * 1.0), 0.012, -re * 0.28], rot: [0, 0, sx * 0.6], scale: [1.7, 0.55, 0.6] });
    }
    addMesh(b.build(), lids, meshes, false);
  }

  // ----- sobrancelhas (grupo gira no centro da cabeça: sobe/desce pela testa)
  const brows = group(head, 0, cy, 0);
  {
    const b = new CharBuilder({ outline: 0, shade: 0.06, jitter: 0 });
    const browC = mix(look.beard === 'long' ? beardCol : hair, '#000000', 0.18);
    const big = look.beard === 'long' ? 1.3 : bulk > 1.15 ? 1.15 : 1;
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const t = i / 2;
        const x = sx * (ex - 0.058 * hs + t * 0.118 * hs);
        const yRel = eyRel + re * 1.12 + 0.034 * hs + 0.016 * Math.sin(PI * t) - 0.012 * (1 - t);
        const z = surfZ(x, yRel) + 0.002;
        const r = (0.027 - 0.008 * t) * hs * big;
        b.sphere(r, 8, 6, browC, { pos: [x, yRel, z], rot: [0, -sx * 0.32, sx * (0.32 - t * 0.55)], scale: [1.75, 0.72, 0.62] });
      }
    }
    addMesh(b.build(), brows, meshes, false);
  }

  // ----- boca (abre para baixo a partir do lábio de cima)
  const myRel = -0.094 * hs;
  const md = 0.03 * hs;
  const mouth = group(head, 0, cy + myRel, surfZ(0, myRel) + md * 0.72);
  {
    const b = new CharBuilder({ outline: 0, shade: 0, jitter: 0 });
    const mw = 0.08 * hs * (bearded ? 0.8 : 1);
    const mh = 0.058 * hs;
    const Rf = R * 0.98;
    const warp = (p: THREE.Vector3) => {
      p.y += (3.0 / hs) * p.x * p.x;
      p.z += Rf - Math.sqrt(Math.max(0, Rf * Rf - p.x * p.x));
    };
    const inner = new THREE.SphereGeometry(1, 16, 6, PI, PI, PI / 2, PI / 2);
    inner.scale(mw, mh, md);
    const innerC = new THREE.Color(MOUTH_IN);
    const innerFn: ColorFn = (p, _n, _c, out) => {
      out.copy(innerC).multiplyScalar(0.75 + 0.5 * smoothstep(0, -md, p.z));
    };
    b.add(inner, innerFn, { warp });
    const teeth = new THREE.BoxGeometry(mw * 1.45, 0.017 * hs, 0.01, 6, 1, 1);
    teeth.translate(0, -0.0085 * hs, -md * 1.0);
    b.add(teeth, '#fffaf0', { warp });
    const tongue = new THREE.SphereGeometry(1, 10, 6);
    tongue.scale(mw * 0.55, mh * 0.36, md * 0.42);
    tongue.translate(0, -mh * 0.74, -md * 0.42);
    b.add(tongue, '#d9625a', { warp });
    addMesh(b.build(), mouth, meshes, false);
  }

  // ======================================================== CABELO
  let hairG: THREE.Group | undefined;
  let hairBack: THREE.Group | undefined;
  {
    const origin = new THREE.Vector3(0, cy - R * 0.25, 0.03);
    const b = new CharBuilder({ outline: OL, shade: 0.2, jitter: 0 });
    const rnd = seeded(look.hair.length * 97 + Math.round(R * 1000));
    const style = look.hairStyle;
    if (style === 'curly' || style === 'wavy' || style === 'long' || style === 'braids') {
      const capR = R * 1.05;
      const capFn: ColorFn = (p, _n, _c, out) => {
        out.copy(hair).lerp(hairHi, smoothstep(0.2, 1, p.y / capR) * 0.45).lerp(hairLo, smoothstep(0.1, -0.7, p.y / capR) * 0.5);
      };
      const front = style === 'curly' ? 0.5 : style === 'wavy' ? 0.52 : 0.55;
      b.sphere(capR, 26, 18, capFn, {
        pos: [0, cy + 0.012, 0.012],
        scale: [HS[0] * 1.02, HS[1], HS[2] * 1.04],
        clip: (c) => {
          const u = c.clone().normalize();
          return u.y < hairlineY(u, front, -0.02, style === 'curly' ? -0.55 : -0.7);
        },
      });
    }
    if (style === 'curly') {
      // cachos volumosos castanhos (Davi): cada cacho com brilho no topo
      const curlHi = mix(look.hair, '#ffc985', 0.42);
      const curlLo = shadeColor(look.hair, 0.62);
      const curlFn = (tint: number): ColorFn => {
        const base = tint >= 0 ? mix(look.hair, '#ffd9a8', tint * 0.3) : shadeColor(look.hair, 1 + tint * 0.25);
        return (_p, n, _c, out) => {
          const l = smoothstep(-0.75, 0.95, n.y * 0.85 - n.z * 0.15 + n.x * 0.1);
          out.copy(curlLo).lerp(base, smoothstep(0, 0.55, l)).lerp(curlHi, smoothstep(0.55, 1, l) * 0.85);
        };
      };
      const pts = fibonacci(62);
      for (const u of pts) {
        const hl = hairlineY(u, 0.5, -0.02, -0.5);
        if (u.y < hl + 0.04) continue;
        const rr = (0.085 + rnd() * 0.035) * hs * (u.y < hl + 0.2 ? 0.86 : 1);
        const out = R * (1.07 + rnd() * 0.05) + (u.y > 0.5 ? 0.025 : 0);
        b.ico(rr, 1, curlFn(rnd() * 2 - 1), {
          pos: [u.x * out * HS[0], cy + 0.02 + u.y * out * HS[1], 0.015 + u.z * out * HS[2]],
          scale: [1, 0.84 + rnd() * 0.18, 1],
          outline: 0.009,
          jitter: 0,
        });
      }
      // franja de cachos caindo na testa
      const fringe: [number, number, number][] = [
        [-0.52, 0.48, 0.92],
        [-0.25, 0.58, 1.05],
        [0.05, 0.55, 1.12],
        [0.33, 0.6, 1.0],
        [0.57, 0.45, 0.9],
      ];
      for (const [x, y, s] of fringe) {
        const u = new THREE.Vector3(x, y, -Math.sqrt(Math.max(0, 1 - x * x - y * y))).normalize();
        const out = R * 1.04;
        b.ico(0.078 * hs * s, 1, curlFn(0.35), {
          pos: [u.x * out * HS[0], cy + u.y * out * HS[1], u.z * out * HS[2]],
          scale: [1.05, 0.86, 0.9],
          outline: 0.009,
        });
      }
      // ganchinhos de cacho na silhueta (laterais e nuca)
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * PI * 2 + 0.35;
        const yy = 0.05 + rnd() * 0.45;
        const rr2 = Math.sqrt(1 - yy * yy);
        const u = new THREE.Vector3(Math.sin(a) * rr2, yy, Math.cos(a) * rr2);
        if (u.z < -0.2) continue;
        const out = R * 1.18;
        b.torus(0.034 * hs, 0.017 * hs, 5, 9, curlFn(0.5), {
          pos: [u.x * out, cy + 0.02 + u.y * out, 0.015 + u.z * out],
          rot: [rnd() * 3, a, rnd() * 3],
          outline: 0.007,
        }, PI * 1.3);
      }
    } else if (style === 'wavy') {
      // mechas onduladas penteadas para o lado (José)
      const lockFn = (tint: number): ColorFn => {
        const base = mix(look.hair, '#8a5a36', 0.2 + tint * 0.2);
        return (_p, n, _c, out) => {
          out.copy(hairLo).lerp(base, smoothstep(-0.7, 0.2, n.y)).lerp(hairHi, smoothstep(0.35, 1, n.y) * 0.9);
        };
      };
      /** Mecha alongada tangente à cabeça: az = azimute (0 = frente), el = elevação. */
      const lock = (az: number, el: number, r: number, sweep: number, s: V3, out = 1.03) => {
        const ce = Math.cos(el);
        const u = new THREE.Vector3(Math.sin(az) * ce, Math.sin(el), -Math.cos(az) * ce);
        b.sphere(r * hs, 10, 7, lockFn(rnd()), {
          pos: [u.x * R * out * HS[0], cy + 0.01 + u.y * R * out * HS[1], 0.01 + u.z * R * out * HS[2]],
          rot: [-el * 0.6 * Math.cos(az), -az, sweep],
          scale: s,
          outline: 0.009,
        });
      };
      // franja varrida para o lado direito
      for (let i = 0; i < 5; i++) lock(-0.85 + i * 0.42, 0.56 + (i % 2) * 0.06, 0.085, -0.55, [1.75, 0.6, 0.75]);
      // volume no alto e atrás
      for (let i = 0; i < 6; i++) lock(-1.6 + i * 0.64 + 0.3, 0.95 - (i % 2) * 0.12, 0.12, 0.2, [1.5, 0.55, 1.1], 0.98);
      for (let i = 0; i < 7; i++) lock(PI * 0.55 + i * 0.3, 0.2 + (i % 2) * 0.18, 0.1, 0.35 * (i % 2 ? 1 : -1), [1.4, 0.7, 0.8]);
      // costeletas
      for (const sx of [-1, 1]) lock(sx * 1.45, -0.05, 0.075, sx * 1.2, [1.5, 0.65, 0.7]);
    } else if (style === 'long') {
      // volume nas têmporas (Moisés) — cabelo longo cai atrás e dos lados
      for (const sx of [-1, 1]) {
        b.sphere(0.1 * hs, 12, 8, hairHi, { pos: [sx * R * 0.78, cy + R * 0.42, -R * 0.12], rot: [0, sx * 0.4, sx * 0.55], scale: [0.7, 1.1, 1.3], outline: 0.009 });
      }
      // mechas laterais até os ombros
      for (const sx of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          b.sphere(0.075 * hs, 10, 8, k % 2 ? hair : hairHi, {
            pos: [sx * R * (0.98 + k * 0.02), cy - 0.06 - k * 0.1, 0.06 + k * 0.03],
            rot: [0.1, 0, sx * 0.12],
            scale: [0.65, 1.6, 0.95],
            outline: 0.009,
          });
        }
      }
    }
    if (!b.empty) {
      const g = b.build();
      g.translate(-origin.x, -origin.y, -origin.z);
      hairG = group(head, origin.x, origin.y, origin.z);
      addMesh(g, hairG, meshes);
    }

    // ----- parte que balança atrás: cabelo longo, tranças, caimento do capuz
    const back = new CharBuilder({ outline: OL, shade: 0.18, jitter: 0 });
    const bo = new THREE.Vector3(0, cy - R * 0.1, R * 0.55);
    if (style === 'long') {
      for (let i = 0; i < 9; i++) {
        const a = -1.25 + (i / 8) * 2.5;
        const x = Math.sin(a) * R * 0.82;
        const z = Math.cos(a) * R * 0.8 + 0.02;
        const len = 0.36 + (1 - Math.abs(a) / 1.25) * 0.1;
        back.sphere(0.07 * hs, 10, 8, i % 2 ? hair : hairHi, {
          pos: [x, cy - 0.12 - len * 0.35, z],
          rot: [0.12, a, 0],
          scale: [0.95, len / 0.14, 0.75],
          outline: OL,
        });
      }
    } else if (style === 'braids') {
      // sete tranças (Juízes 16:13)
      for (let i = 0; i < 7; i++) {
        const a = -1.3 + (i / 6) * 2.6;
        const sx = Math.sin(a);
        const cz = Math.cos(a);
        const start = new THREE.Vector3(sx * R * 0.9, cy + R * 0.05, cz * R * 0.86 + 0.02);
        const n = 6;
        const len = 0.4;
        const pts: V3[] = [];
        for (let k = 0; k < n; k++) {
          const t = k / (n - 1);
          pts.push([start.x + sx * 0.035 * t, start.y - t * len, start.z + cz * (0.015 + 0.06 * t)]);
        }
        // trançado: faixas diagonais claras/escuras ao longo do tubo
        const braidFn: ColorFn = (p, nn, _c, out) => {
          const f = Math.sin(p.y * 115 + Math.atan2(nn.x, nn.z) * 2);
          out.copy(hairLo).lerp(hairHi, 0.5 + 0.5 * f);
        };
        back.tube(pts, 0.03 * hs, 16, 6, braidFn, { outline: 0.007 });
        const end = pts[n - 1];
        back.cyl(0.026 * hs, 0.026 * hs, 0.024, 8, '#c08a44', { pos: [end[0], end[1] - 0.005, end[2]], outline: 0.004 });
        back.cone(0.028 * hs, 0.07, 8, hair, { pos: [end[0], end[1] - 0.05, end[2]], rot: [PI, 0, 0], outline: 0.005 });
      }
    }
    if (!back.empty) {
      const g = back.build();
      g.translate(-bo.x, -bo.y, -bo.z);
      hairBack = group(head, bo.x, bo.y, bo.z);
      addMesh(g, hairBack, meshes);
    }
  }

  // ======================================================== BRAÇOS
  const sleeveColor = stripes ? stripes[2 % stripes.length] : look.tunic;
  const hb = 1 + (bulk - 1) * 0.6;
  const buildArm = (side: 1 | -1) => {
    const arm = group(torso, side * 0.29 * bw, 0.42, 0);
    const ub = new CharBuilder({ outline: OL, shade: 0.12, jitter: 0.01 });
    const ar = 0.07 * bulk;
    ub.sphere(0.09 * bulk, 12, 9, sleeveColor, { pos: [0, -0.005, 0] });
    ub.cyl(ar, ar * 0.86, UL, 12, look.skin, { pos: [0, -UL / 2, 0] });
    if (bulk > 1.15) {
      ub.sphere(0.066 * bulk, 10, 8, look.skin, { pos: [0, -UL * 0.52, -0.024 * bulk], scale: [0.95, 1.45, 0.9] });
      ub.sphere(0.06 * bulk, 10, 8, look.skin, { pos: [0, -UL * 0.45, 0.02 * bulk], scale: [0.9, 1.4, 0.85] });
    }
    ub.sphere(ar * 0.9, 10, 8, look.longSleeves ? sleeveColor : look.skin, { pos: [0, -UL, 0] });
    const sr = 0.102 * bulk;
    const sleeveFn = (h: number): ColorFn | string => {
      if (!stripes) return sleeveColor;
      return (_p, _n, c, out) => {
        const t = Math.min(0.999, Math.max(0, (h / 2 - c.y) / h));
        out.set(stripes[(Math.floor(t * 4) + (side === 1 ? 1 : 3)) % stripes.length]);
      };
    };
    if (look.longSleeves) {
      ub.cyl(sr, sr * 1.05, UL + 0.05, 14, sleeveFn(UL + 0.05), { pos: [0, -UL / 2 + 0.005, 0] }, stripes ? 4 : 1, true);
    } else {
      const sh = bulk > 1.15 ? 0.07 : 0.15;
      ub.cyl(sr, sr * 1.1, sh, 14, sleeveColor, { pos: [0, -sh / 2 + 0.02, 0] }, 1, true);
      ub.cyl(sr * 1.12, sr * 1.13, 0.026, 14, look.tunicTrim, { pos: [0, -sh + 0.025, 0], outline: 0.006 });
    }
    addMesh(ub.build(), arm, meshes);

    const fore = group(arm, 0, -UL, 0);
    const fb = new CharBuilder({ outline: OL, shade: 0.12, jitter: 0.01 });
    fb.cyl(ar * 0.86, ar * 0.72, FL, 12, look.skin, { pos: [0, -FL / 2, 0] });
    if (bulk > 1.15) fb.sphere(0.056 * bulk, 10, 8, look.skin, { pos: [0, -FL * 0.32, -0.01], scale: [1, 1.5, 0.95] });
    if (look.longSleeves) {
      fb.cyl(sr * 1.02, sr * 1.25, FL * 0.82, 14, sleeveFn(FL * 0.82), { pos: [0, -FL * 0.4, 0] }, stripes ? 3 : 1, true);
      fb.cyl(sr * 1.27, sr * 1.29, 0.026, 14, look.tunicTrim, { pos: [0, -FL * 0.81, 0], outline: 0.006 });
    }
    if (bulk > 1.15) {
      // braçadeiras com rebites
      fb.cyl(ar * 0.98, ar * 0.9, 0.13, 12, '#6b4120', { pos: [0, -FL + 0.07, 0], outline: 0.007 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI * 2 + 0.4;
        fb.sphere(0.011, 6, 5, GOLD, { pos: [Math.sin(a) * ar * 0.98, -FL + 0.07, Math.cos(a) * ar * 0.92], outline: 0 });
      }
    } else if (!look.longSleeves) {
      fb.cyl(ar * 0.8, ar * 0.78, 0.05, 12, '#6e4322', { pos: [0, -FL + 0.035, 0], outline: 0.006 });
    }
    // mão em "luva" com polegar
    const hy = -FL - 0.045;
    fb.sphere(0.056 * hb, 12, 9, look.skin, { pos: [0, hy, 0], scale: [0.82, 1.0, 1.08], outline: 0.008 });
    fb.sphere(0.05 * hb, 10, 8, mix(look.skin, BLUSH, 0.08), { pos: [0, hy - 0.036, -0.016], scale: [0.8, 0.82, 0.98], outline: 0.008 });
    fb.capsule(0.019 * hb, 0.03, 3, 7, look.skin, { pos: [-side * 0.032 * hb, hy - 0.005, -0.042 * hb], rot: [0.9, 0, -side * 0.55], outline: 0.006 });
    if (side === 1 && holdsStaff) {
      // O cajado atravessa o punho inclinado: fica em pé quando o antebraço
      // está a STAFF_A rad para a frente (pose parada) e acompanha o braço na corrida.
      const long = look.accessory === 'longStaff';
      const sy = hy - 0.02;
      const wood = long ? '#7a4f2a' : '#8d5d33';
      const dy = Math.cos(STAFF_A);
      const dz = -Math.sin(STAFF_A);
      const at = (t: number, ox = 0, oy = 0): V3 => [ox, sy + dy * t + oy, dz * t];
      const woodFn: ColorFn = (p, _n, _c, out) => {
        const t = p.y * dy + p.z * dz;
        out.set(wood).multiplyScalar(0.9 + 0.12 * Math.sin(t * 55 + Math.sin(t * 13) * 2));
      };
      if (long) {
        // cajado de Moisés com a curva (gancho) no alto, para fora
        fb.tube(
          [at(-0.82), at(-0.35, 0.006), at(0.2, -0.006), at(0.7, 0.005), at(1.05), at(1.15, 0.03), at(1.2, 0.1), at(1.15, 0.17), at(1.07, 0.16)],
          0.026, 30, 6, woodFn, { outline: 0.008, shade: 0.1 },
        );
        fb.sphere(0.032, 8, 6, shadeColor(wood, 0.8), { pos: at(0.5), outline: 0.005 });
      } else {
        fb.tube([at(-0.58), at(-0.2, 0.008), at(0.25), at(0.64, -0.01)], 0.022, 14, 6, woodFn, { outline: 0.007, shade: 0.1 });
        // nó da madeira e empunhadura de couro
        fb.sphere(0.027, 8, 6, shadeColor(wood, 0.8), { pos: at(0.42, 0.004), outline: 0.005 });
        fb.cyl(0.028, 0.028, 0.08, 8, '#5a341a', { pos: at(0.09), rot: [-STAFF_A, 0, 0], outline: 0.005 });
      }
    }
    if (side === -1 && look.accessory === 'scroll') {
      const sy = hy - 0.02;
      const parchFn: ColorFn = (p, _n, _c, out) => {
        out.set('#f3e4bb').multiplyScalar(0.9 + 0.1 * Math.sin(p.y * 140));
      };
      fb.cyl(0.045, 0.045, 0.22, 12, parchFn, { pos: [0, sy, -0.01], rot: [0, 0, PI / 2], outline: 0.007 });
      fb.cyl(0.013, 0.013, 0.3, 8, '#7a4a26', { pos: [0, sy, -0.01], rot: [0, 0, PI / 2], outline: 0.005 });
      for (const sx of [-1, 1]) fb.sphere(0.022, 10, 8, '#7a4a26', { pos: [sx * 0.155, sy, -0.01], outline: 0.005 });
      fb.torus(0.047, 0.008, 5, 16, '#b3203a', { pos: [0.03, sy, -0.01], rot: [0, PI / 2, 0], outline: 0 });
    }
    addMesh(fb.build(), fore, meshes);
    return { arm, fore };
  };
  const R_ = buildArm(1);
  const L_ = buildArm(-1);

  // ======================================================== PERNAS
  const buildLeg = (side: 1 | -1) => {
    const leg = group(pivot, side * 0.112 * bw, -0.03, 0);
    const tb = new CharBuilder({ outline: OL, shade: 0.1, jitter: 0.008 });
    tb.sphere(0.092, 8, 6, look.skin, { pos: [0, 0, 0], outline: 0 });
    tb.cyl(0.09, 0.07, TL, 12, look.skin, { pos: [0, -TL / 2, 0] });
    tb.sphere(0.069, 10, 8, look.skin, { pos: [0, -TL, 0] });
    addMesh(tb.build(), leg, meshes);
    const shin = group(leg, 0, -TL, 0);
    const sb = new CharBuilder({ outline: OL, shade: 0.1, jitter: 0.008 });
    sb.cyl(0.066, 0.05, SL, 12, look.skin, { pos: [0, -SL / 2, 0] });
    sb.sphere(0.054, 10, 8, look.skin, { pos: [0, -0.11, 0.022], scale: [0.95, 1.7, 0.9], outline: 0.006 });
    sb.sphere(0.05, 8, 6, look.skin, { pos: [0, -SL, 0], outline: 0 });
    // pé
    const fy = -SL - 0.036;
    sb.sphere(0.06, 12, 9, look.skin, { pos: [0, fy, -0.055], scale: [0.92, 0.62, 1.6], outline: 0.007 });
    sb.sphere(0.032, 8, 6, mix(look.skin, BLUSH, 0.1), { pos: [0, fy - 0.006, -0.14], scale: [1.55, 0.8, 1], outline: 0.005 });
    // sandália: sola + tiras
    const sand = look.sandal;
    sb.rbox(0.13, 0.03, 0.27, 0.013, shadeColor(sand, 0.85), { pos: [0, fy - 0.04, -0.062], outline: 0.007, shade: 0.2 }, 1);
    sb.torus(0.058, 0.012, 4, 10, sand, { pos: [0, fy - 0.024, -0.118], scale: [1.05, 0.95, 1], outline: 0.004 }, PI);
    sb.torus(0.056, 0.012, 4, 10, sand, { pos: [0, fy - 0.022, -0.03], scale: [1.08, 1.05, 1], outline: 0.004 }, PI);
    sb.torus(0.053, 0.012, 4, 14, sand, { pos: [0, -SL + 0.012, 0], rot: [PI / 2, 0, 0], outline: 0.004 });
    // tiras cruzadas subindo pela canela
    sb.torus(0.06, 0.0105, 4, 14, sand, { pos: [0, -SL * 0.66, 0.006], rot: [PI / 2 + 0.05, 0, side * 0.42], scale: [1, 1.04, 1], outline: 0.004 });
    sb.torus(0.064, 0.0105, 4, 14, sand, { pos: [0, -SL * 0.42, 0.01], rot: [PI / 2 - 0.05, 0, -side * 0.42], scale: [1, 1.08, 1], outline: 0.004 });
    addMesh(sb.build(), shin, meshes);
    return { leg, shin };
  };
  const RL = buildLeg(1);
  const LL = buildLeg(-1);

  // ======================================================== BOLSA
  let bag: THREE.Group | undefined;
  if (look.bag) {
    bag = group(torso, -0.27 * bw, 0.02, -0.03);
    const b = new CharBuilder({ outline: OL, shade: 0.14, jitter: 0.02 });
    const bc = look.bagColor;
    b.rbox(0.085, 0.17, 0.2, 0.032, bc, { pos: [-0.012, -0.1, 0] });
    b.rbox(0.094, 0.088, 0.21, 0.026, shadeColor(bc, 0.8), { pos: [-0.018, -0.045, 0], outline: 0.007 });
    b.rbox(0.02, 0.034, 0.04, 0.008, GOLD, { pos: [-0.066, -0.078, 0], outline: 0.004 });
    b.torus(0.022, 0.007, 5, 10, GOLD, { pos: [-0.01, 0.0, 0], rot: [0, PI / 2, 0], outline: 0 });
    addMesh(b.build(), bag, meshes);
  }

  // ======================================================== MANTO (Moisés)
  let cape: THREE.Group | undefined;
  if (mantle) {
    cape = group(torso, 0, 0.47, 0.03);
    const b = new CharBuilder({ outline: OL, shade: 0.12, jitter: 0.012 });
    const h = longRobe ? 1.0 : 0.7;
    const th0 = -1.25;
    const thL = 2.5;
    const mc = new THREE.Color(mantle);
    const tc = trim;
    const mFn: ColorFn = (_p, _n, c, out) => {
      const th = Math.atan2(c.x, c.z);
      const edge = Math.min(Math.abs(th - th0), Math.abs(th - (th0 + thL)));
      if (edge < 0.1 || c.y < -h / 2 + 0.05) out.copy(tc);
      else out.copy(mc);
    };
    const g = new THREE.CylinderGeometry(0.27, 0.4, h, 22, 6, true, th0, thL);
    b.add(g, mFn, {
      pos: [0, -h / 2, 0],
      scale: [1.12 * bw, 1, 0.82 * bd],
      warp: (p) => {
        const t = (h / 2 - p.y) / h;
        const th = Math.atan2(p.x, p.z);
        const k = 1 + 0.06 * Math.sin(th * 8) * t;
        p.x *= k;
        p.z *= k * (1 + 0.15 * t);
      },
      lining: shadeColor(mantle, 0.55),
    });
    // presilhas douradas nos ombros
    for (const sx of [-1, 1]) {
      b.sphere(0.03, 10, 8, GOLD, { pos: [sx * 0.29 * bw * Math.sin(1.2), 0.0, 0.27 * 0.82 * Math.cos(1.2) - 0.03], outline: 0.005 });
    }
    addMesh(b.build(), cape, meshes);
  }

  // ======================================================== POMBA (Noé)
  let pet: THREE.Group | undefined;
  if (look.accessory === 'dove') {
    pet = group(torso, -0.31 * bw, 0.53, -0.02);
    pet.userData.baseY = 0.53;
    const b = new CharBuilder({ outline: 0.006, shade: 0.16, jitter: 0.01 });
    b.sphere(0.064, 12, 9, '#fbfbf7', { pos: [0, 0.05, 0], scale: [0.85, 0.78, 1.35] });
    b.sphere(0.043, 10, 8, '#ffffff', { pos: [0, 0.105, -0.07] });
    b.cone(0.012, 0.036, 8, '#f2a03a', { pos: [0, 0.098, -0.118], rot: [-PI / 2, 0, 0], outline: 0.003 });
    for (const sx of [-1, 1]) {
      b.sphere(0.008, 6, 5, '#1a1a1a', { pos: [sx * 0.026, 0.115, -0.09], outline: 0 });
      b.sphere(0.052, 10, 7, '#e9ecef', { pos: [sx * 0.05, 0.06, 0.012], rot: [0.25, 0, sx * 0.25], scale: [0.32, 0.62, 1.3] });
    }
    b.sphere(0.042, 10, 6, '#e9ecef', { pos: [0, 0.06, 0.1], rot: [-0.35, 0, 0], scale: [0.9, 0.26, 1.4] });
    // raminho de oliveira no bico (Gênesis 8:11)
    b.tube([[0.0, 0.094, -0.13], [0.03, 0.088, -0.14], [0.07, 0.078, -0.13]], 0.004, 6, 4, '#6b4a2a', { outline: 0 });
    for (let i = 0; i < 3; i++) {
      b.sphere(0.014, 8, 6, '#78a640', { pos: [0.025 + i * 0.022, 0.08 - i * 0.004, -0.14 + (i % 2) * 0.012], rot: [0, 0.4, 0.5], scale: [1.6, 0.4, 0.8], outline: 0.003 });
    }
    addMesh(b.build(), pet, meshes, false);
  }

  return {
    root,
    pivot,
    torso,
    head,
    armL: L_.arm,
    armR: R_.arm,
    foreL: L_.fore,
    foreR: R_.fore,
    legL: LL.leg,
    legR: RL.leg,
    shinL: LL.shin,
    shinR: RL.shin,
    hipHeight: HIP,
    extras: {
      skirt,
      hair: hairG,
      hairBack,
      lids,
      brows,
      mouth,
      bag,
      cape,
      pet,
      lidOpen: 0.78,
      lidClosed: -1.45,
      longRobe,
      holdsStaff,
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      root.removeFromParent();
    },
  };
}
