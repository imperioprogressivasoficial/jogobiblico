import * as THREE from 'three';
import type { CharacterLook } from '../../data/characters';
import { GeoBuilder } from './geo';
import { Materials } from './materials';

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
  dispose(): void;
}

const HIP = 0.82;

function mesh(geo: THREE.BufferGeometry, parent: THREE.Object3D, list: THREE.Mesh[]): THREE.Mesh {
  const m = new THREE.Mesh(geo, Materials.character);
  m.castShadow = true;
  parent.add(m);
  list.push(m);
  return m;
}

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function hemisphere(r: number, color: string, b: GeoBuilder, pos: [number, number, number], thetaLen = Math.PI * 0.55, scale: [number, number, number] = [1, 1, 1]) {
  b.add(new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, thetaLen), color, { pos, scale, jitter: 0.04 });
}

export function buildCharacter(look: CharacterLook): CharacterRig {
  const meshes: THREE.Mesh[] = [];
  const root = new THREE.Group();
  root.name = 'character';
  const pivot = group(root, 0, HIP, 0);
  const bulk = look.bulk;
  const hs = look.headScale;
  const longRobe = look.robeLength === 'long';

  // ---------- Saia / quadril ----------
  {
    const b = new GeoBuilder(0.03);
    const bottom = longRobe ? -0.6 : -0.34;
    const top = 0.06;
    const h = top - bottom;
    if (look.stripes && look.stripes.length) {
      const n = look.stripes.length;
      for (let i = 0; i < n; i++) {
        const y0 = bottom + (h * i) / n;
        const y1 = bottom + (h * (i + 1)) / n;
        const rAt = (y: number) => 0.27 + (top - y) * 0.2;
        b.cyl(rAt(y1), rAt(y0), y1 - y0 + 0.002, 12, look.stripes[(n - 1 - i) % n], { pos: [0, (y0 + y1) / 2, 0] });
      }
    } else {
      b.cyl(0.27, 0.27 + h * 0.2, h, 12, look.tunic, { pos: [0, bottom + h / 2, 0] });
    }
    b.cyl(0.27 + h * 0.2 + 0.01, 0.27 + h * 0.2 + 0.015, 0.05, 12, look.tunicTrim, { pos: [0, bottom + 0.02, 0] });
    mesh(b.build(), pivot, meshes);
  }

  // ---------- Tronco ----------
  const torso = group(pivot, 0, 0.02, 0);
  {
    const b = new GeoBuilder(0.03);
    const tunicTop = look.stripes ? look.stripes[0] : look.tunic;
    if (look.stripes) {
      const n = 3;
      for (let i = 0; i < n; i++) {
        const y0 = 0.04 + (0.46 * i) / n;
        b.cyl(0.25 * bulk - i * 0.005, 0.26 * bulk - i * 0.005, 0.46 / n + 0.002, 12, look.stripes[(i * 2 + 1) % look.stripes.length], {
          pos: [0, y0 + 0.46 / n / 2, 0],
        });
      }
    } else {
      b.cyl(0.24 * bulk, 0.26, 0.48, 12, look.tunic, { pos: [0, 0.27, 0] });
    }
    // ombros
    b.sphere(0.12 * bulk, 8, 6, tunicTop, { pos: [0.24 * bulk, 0.44, 0] });
    b.sphere(0.12 * bulk, 8, 6, tunicTop, { pos: [-0.24 * bulk, 0.44, 0] });
    // gola
    b.torus(0.15, 0.035, 5, 12, look.tunicTrim, { pos: [0, 0.5, 0], rot: [Math.PI / 2, 0, 0] });
    // cinto
    b.cyl(0.272, 0.272, 0.08, 12, look.belt, { pos: [0, 0.06, 0] });
    b.box(0.08, 0.07, 0.03, look.tunicTrim, { pos: [0, 0.06, -0.272] });
    if (look.bag) {
      // alça diagonal + bolsa lateral
      b.box(0.06, 0.78, 0.04, look.bagColor, { pos: [0, 0.26, -0.255], rot: [0, 0, 0.72] });
      b.box(0.06, 0.78, 0.04, look.bagColor, { pos: [0, 0.26, 0.255], rot: [0, 0, -0.72] });
      b.box(0.2, 0.2, 0.12, look.bagColor, { pos: [-0.3, -0.06, 0.02], jitter: 0.08 });
      b.box(0.21, 0.08, 0.13, look.belt, { pos: [-0.3, 0.02, 0.02] });
    }
    if (look.cape) {
      b.box(0.5, 0.8, 0.04, look.cape, { pos: [0, 0.1, 0.27], rot: [0.12, 0, 0] });
    }
    if (look.accessory === 'dove') {
      // pomba no ombro esquerdo
      b.sphere(0.09, 8, 6, '#ffffff', { pos: [-0.27, 0.6, 0.02], scale: [1, 0.85, 1.3] });
      b.sphere(0.06, 8, 6, '#ffffff', { pos: [-0.27, 0.68, -0.1] });
      b.cone(0.025, 0.06, 5, '#f2a03a', { pos: [-0.27, 0.68, -0.17], rot: [-Math.PI / 2, 0, 0] });
      b.box(0.18, 0.02, 0.1, '#eeeeee', { pos: [-0.27, 0.62, 0.05], rot: [0, 0, 0.3] });
    }
    mesh(b.build(), torso, meshes);
  }

  // ---------- Cabeça ----------
  const head = group(torso, 0, 0.5, 0);
  {
    const b = new GeoBuilder(0.02);
    const r = 0.3 * hs;
    const cy = 0.29 * hs;
    b.cyl(0.08, 0.09, 0.12, 8, look.skin, { pos: [0, 0.04, 0] });
    b.sphere(r, 14, 10, look.skin, { pos: [0, cy, 0], scale: [1, 1.02, 0.98], jitter: 0.015 });
    // orelhas
    b.sphere(0.06, 6, 5, look.skin, { pos: [r * 0.98, cy, 0.02], scale: [0.6, 1, 1] });
    b.sphere(0.06, 6, 5, look.skin, { pos: [-r * 0.98, cy, 0.02], scale: [0.6, 1, 1] });
    // olhos (o rosto aponta para -Z)
    for (const sx of [-1, 1]) {
      b.sphere(0.07 * hs, 8, 6, '#ffffff', { pos: [sx * 0.105 * hs, cy + 0.03, -r * 0.86], scale: [0.9, 1.1, 0.55], jitter: 0 });
      b.sphere(0.042 * hs, 8, 6, '#3a2414', { pos: [sx * 0.1 * hs, cy + 0.025, -r * 0.93], scale: [1, 1.1, 0.6], jitter: 0 });
      b.sphere(0.014 * hs, 4, 3, '#ffffff', { pos: [sx * 0.085 * hs, cy + 0.05, -r * 0.985], jitter: 0 });
      // sobrancelhas
      b.box(0.1 * hs, 0.026, 0.03, look.beard === 'long' ? look.beardColor ?? look.hair : look.hair, {
        pos: [sx * 0.11 * hs, cy + 0.13 * hs, -r * 0.9],
        rot: [0, 0, sx * -0.18],
        jitter: 0,
      });
    }
    // nariz e boca
    b.sphere(0.04 * hs, 6, 5, look.skin, { pos: [0, cy - 0.03, -r * 1.0], jitter: 0.03 });
    b.torus(0.06 * hs, 0.016, 4, 8, '#8a2e22', { pos: [0, cy - 0.085 * hs, -r * 0.92], rot: [0.25, 0, Math.PI], jitter: 0 }, Math.PI);
    // bochechas
    b.sphere(0.045, 6, 4, '#f08a7a', { pos: [0.17 * hs, cy - 0.05, -r * 0.78], scale: [1, 0.6, 0.4], jitter: 0 });
    b.sphere(0.045, 6, 4, '#f08a7a', { pos: [-0.17 * hs, cy - 0.05, -r * 0.78], scale: [1, 0.6, 0.4], jitter: 0 });

    // ----- Cabelo -----
    const hair = look.hair;
    if (look.hairStyle === 'curly' || look.hairStyle === 'wavy') {
      hemisphere(r * 1.04, hair, b, [0, cy + 0.01, 0.01], Math.PI * 0.52);
      const curls = look.hairStyle === 'curly' ? 34 : 18;
      let seed = 7;
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let i = 0; i < curls; i++) {
        const u = rnd();
        const v = rnd();
        const theta = u * Math.PI * 2;
        const phi = Math.acos(1 - v * 1.25); // hemisfério superior + um pouco abaixo
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.cos(phi);
        const z = Math.sin(phi) * Math.sin(theta);
        if (z < -0.35 && y < 0.55) continue; // deixa o rosto livre
        if (y < -0.1 && z < 0.2) continue;
        const cr = (look.hairStyle === 'curly' ? 0.11 : 0.12) * hs * (0.85 + rnd() * 0.35);
        b.ico(cr, 0, hair, { pos: [x * r * 1.02, cy + y * r * 1.02, z * r * 1.02], jitter: 0.08 });
      }
      // franja
      b.ico(0.1 * hs, 0, hair, { pos: [-0.12 * hs, cy + r * 0.82, -r * 0.55] });
      b.ico(0.11 * hs, 0, hair, { pos: [0.05 * hs, cy + r * 0.88, -r * 0.58] });
      b.ico(0.09 * hs, 0, hair, { pos: [0.17 * hs, cy + r * 0.75, -r * 0.6] });
    } else if (look.hairStyle === 'short') {
      hemisphere(r * 1.05, hair, b, [0, cy + 0.02, 0.02], Math.PI * 0.5);
      b.sphere(r * 1.0, 10, 6, hair, { pos: [0, cy - 0.02, 0.06], scale: [1, 0.9, 1] });
    } else if (look.hairStyle === 'long') {
      hemisphere(r * 1.06, hair, b, [0, cy + 0.02, 0.02], Math.PI * 0.55);
      b.box(r * 1.9, 0.55, 0.16, hair, { pos: [0, cy - 0.22, r * 0.62], rot: [0.08, 0, 0] });
      b.box(0.1, 0.4, 0.2, hair, { pos: [r * 0.95, cy - 0.12, 0.06] });
      b.box(0.1, 0.4, 0.2, hair, { pos: [-r * 0.95, cy - 0.12, 0.06] });
    } else if (look.hairStyle === 'braids') {
      hemisphere(r * 1.06, hair, b, [0, cy + 0.02, 0.02], Math.PI * 0.55);
      // sete tranças (Juízes 16:13)
      for (let i = 0; i < 7; i++) {
        const a = -1.2 + (i / 6) * 2.4;
        const bx = Math.sin(a) * r * 0.85;
        const bz = Math.cos(a) * r * 0.75 + 0.05;
        for (let k = 0; k < 4; k++) {
          b.sphere(0.055, 6, 4, hair, { pos: [bx * (1 + k * 0.04), cy - 0.08 - k * 0.12, bz + k * 0.02], scale: [1, 1.3, 1] });
        }
      }
    }
    // ----- Barba -----
    const beardColor = look.beardColor ?? hair;
    if (look.beard === 'short') {
      b.sphere(r * 0.78, 10, 6, beardColor, { pos: [0, cy - 0.12, -0.05], scale: [1.05, 0.75, 0.95] });
      b.box(0.2, 0.04, 0.04, look.skin, { pos: [0, cy - 0.08, -r * 0.93], jitter: 0 });
    } else if (look.beard === 'long') {
      b.sphere(r * 0.8, 10, 6, beardColor, { pos: [0, cy - 0.14, -0.04], scale: [1.05, 0.8, 0.95] });
      b.cone(0.2, 0.5, 8, beardColor, { pos: [0, cy - 0.42, -0.12], rot: [Math.PI - 0.15, 0, 0] });
      b.box(0.16, 0.035, 0.04, '#8a2e22', { pos: [0, cy - 0.09, -r * 0.94], jitter: 0 });
    }
    // ----- Chapéus -----
    if (look.headwear === 'headband') {
      b.torus(r * 1.02, 0.03, 4, 16, look.headwearColor, { pos: [0, cy + 0.1, 0], rot: [Math.PI / 2 + 0.1, 0, 0] });
    } else if (look.headwear === 'hood') {
      // capuz aberto na frente (o rosto aponta para -Z, phi = 270°)
      b.add(new THREE.SphereGeometry(r * 1.16, 12, 8, (11 * Math.PI) / 6, (4 * Math.PI) / 3, 0, Math.PI * 0.62), look.headwearColor, {
        pos: [0, cy + 0.02, 0.03],
        jitter: 0.04,
      });
      b.torus(r * 0.98, 0.05, 5, 14, look.headwearColor, { pos: [0, cy + 0.02, -r * 0.35], rot: [0.35, 0, 0] }, Math.PI);
      b.box(r * 2.1, 0.5, 0.1, look.headwearColor, { pos: [0, cy - 0.22, r * 0.85], rot: [0.15, 0, 0] });
    } else if (look.headwear === 'turban') {
      b.torus(r * 0.95, 0.09, 6, 14, look.headwearColor, { pos: [0, cy + 0.14, 0.02], rot: [Math.PI / 2 + 0.12, 0, 0] });
      b.sphere(r * 0.95, 10, 6, look.headwearColor, { pos: [0, cy + 0.2, 0.03], scale: [1, 0.7, 1] });
      b.sphere(0.06, 6, 4, '#e8bf4a', { pos: [0, cy + 0.2, -r * 0.98] });
    }
    mesh(b.build(), head, meshes);
  }

  // ---------- Braços ----------
  const sleeveColor = look.stripes ? look.stripes[2 % look.stripes.length] : look.tunic;
  const buildArm = (side: 1 | -1) => {
    const arm = group(torso, side * 0.3 * bulk, 0.42, 0);
    const ub = new GeoBuilder(0.03);
    const ar = 0.078 * bulk;
    ub.cyl(ar, ar * 0.92, 0.3, 8, look.skin, { pos: [0, -0.15, 0] });
    if (look.longSleeves) ub.cyl(ar * 1.35, ar * 1.25, 0.31, 8, sleeveColor, { pos: [0, -0.15, 0] });
    else ub.cyl(ar * 1.35, ar * 1.3, 0.13, 8, sleeveColor, { pos: [0, -0.05, 0] });
    ub.sphere(ar * 1.05, 6, 5, look.longSleeves ? sleeveColor : look.skin, { pos: [0, -0.3, 0] });
    mesh(ub.build(), arm, meshes);
    const fore = group(arm, 0, -0.3, 0);
    const fb = new GeoBuilder(0.03);
    fb.cyl(ar * 0.92, ar * 0.8, 0.26, 8, look.skin, { pos: [0, -0.13, 0] });
    if (look.longSleeves) fb.cyl(ar * 1.3, ar * 1.5, 0.2, 8, sleeveColor, { pos: [0, -0.09, 0] });
    if (look.bulk > 1.1) fb.cyl(ar * 1.05, ar * 1.05, 0.08, 8, '#5a3a1a', { pos: [0, -0.21, 0] });
    fb.sphere(0.082 * bulk, 8, 6, look.skin, { pos: [0, -0.29, 0] });
    if (side === 1 && (look.accessory === 'staff' || look.accessory === 'longStaff')) {
      const long = look.accessory === 'longStaff';
      const len = long ? 2.0 : 1.25;
      // O cajado é perpendicular ao antebraço: fica na vertical com o cotovelo dobrado.
      fb.cyl(0.035, 0.04, len, 6, '#7b5230', { pos: [0, -0.29, long ? -0.25 : -0.05], rot: [Math.PI / 2, 0, 0], jitter: 0.1 });
      if (long) fb.torus(0.12, 0.035, 5, 10, '#7b5230', { pos: [0, -0.17, -1.25], rot: [0, Math.PI / 2, 0] }, Math.PI * 1.2);
    }
    if (side === -1 && look.accessory === 'scroll') {
      fb.cyl(0.05, 0.05, 0.3, 8, '#f2e3b8', { pos: [0, -0.3, 0], rot: [0, 0, Math.PI / 2] });
      fb.cyl(0.03, 0.03, 0.36, 6, '#8a5530', { pos: [0, -0.3, 0], rot: [0, 0, Math.PI / 2] });
    }
    mesh(fb.build(), fore, meshes);
    return { arm, fore };
  };
  const R = buildArm(1);
  const L = buildArm(-1);

  // ---------- Pernas ----------
  const buildLeg = (side: 1 | -1) => {
    const leg = group(pivot, side * 0.13, -0.02, 0);
    const tb = new GeoBuilder(0.03);
    tb.cyl(0.1, 0.085, 0.38, 8, look.skin, { pos: [0, -0.19, 0] });
    mesh(tb.build(), leg, meshes);
    const shin = group(leg, 0, -0.38, 0);
    const sb = new GeoBuilder(0.04);
    sb.cyl(0.082, 0.068, 0.34, 8, look.skin, { pos: [0, -0.17, 0] });
    // sandália
    sb.box(0.15, 0.06, 0.3, look.sandal, { pos: [0, -0.365, -0.05] });
    sb.box(0.13, 0.045, 0.16, look.skin, { pos: [0, -0.32, -0.1] });
    sb.torus(0.075, 0.018, 4, 10, look.sandal, { pos: [0, -0.28, 0], rot: [Math.PI / 2, 0, 0] });
    sb.torus(0.07, 0.016, 4, 10, look.sandal, { pos: [0, -0.18, 0], rot: [Math.PI / 2, 0, 0] });
    sb.box(0.15, 0.02, 0.04, look.sandal, { pos: [0, -0.31, -0.13] });
    mesh(sb.build(), shin, meshes);
    return { leg, shin };
  };
  const RL = buildLeg(1);
  const LL = buildLeg(-1);

  return {
    root,
    pivot,
    torso,
    head,
    armL: L.arm,
    armR: R.arm,
    foreL: L.fore,
    foreR: R.fore,
    legL: LL.leg,
    legR: RL.leg,
    shinL: LL.shin,
    shinR: RL.shin,
    hipHeight: HIP,
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      root.removeFromParent();
    },
  };
}
