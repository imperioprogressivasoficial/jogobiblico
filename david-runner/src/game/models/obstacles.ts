import * as THREE from 'three';
import { GeoBuilder } from './geo';
import { PI, amphora, crate, rock, scallop, sheepBody, stripedCloth, wheel, type GeoFactory } from './shapes';

// ============================================================================
// OBSTÁCULOS — centrados em x=0, apoiados em y=0, ocupando o comprimento em z.
// ============================================================================

export const OBSTACLE_FACTORIES: Record<string, GeoFactory> = {
  vaso: (p) => {
    const b = new GeoBuilder();
    amphora(b, p.clay, -0.48, 0, 1.0, p.clayDark);
    amphora(b, p.clayDark, 0.45, 0.05, 0.92, p.clay);
    amphora(b, p.clay, 0.0, 0.3, 0.62);
    return b.build();
  },
  caixa: (p) => {
    const b = new GeoBuilder();
    crate(b, p, 0.95, 0.95, 0.95, [-0.48, 0, 0]);
    crate(b, p, 0.85, 0.85, 0.9, [0.5, 0, 0.02]);
    b.box(0.5, 0.12, 0.5, '#e7d3a1', { pos: [0.5, 0.92, 0] });
    return b.build();
  },
  cesto: () => {
    const b = new GeoBuilder();
    for (const x of [-0.5, 0.5]) {
      b.cyl(0.5, 0.38, 0.75, 10, '#c89a55', { pos: [x, 0.375, 0], jitter: 0.1 });
      b.torus(0.48, 0.05, 4, 12, '#9a6e35', { pos: [x, 0.75, 0], rot: [PI / 2, 0, 0] });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2;
        b.sphere(0.15, 6, 5, i % 2 ? '#d93b2b' : '#f2a23a', { pos: [x + Math.cos(a) * 0.25, 0.82, Math.sin(a) * 0.25] });
      }
      b.sphere(0.15, 6, 5, '#7fbf3f', { pos: [x, 0.9, 0] });
    }
    return b.build();
  },
  pedra: (p) => {
    const b = new GeoBuilder();
    rock(b, p.stone, -0.45, 0, 0, 0.62);
    rock(b, p.stoneDark, 0.5, 0, 0.1, 0.55);
    rock(b, p.stoneLight, 0.05, 0, -0.25, 0.42);
    return b.build();
  },
  bloco: (p) => {
    const b = new GeoBuilder();
    b.box(1.85, 0.9, 1.0, p.stone, { pos: [0, 0.45, 0], jitter: 0.06 });
    b.box(1.9, 0.12, 1.05, p.stoneLight, { pos: [0, 0.86, 0] });
    for (const x of [-0.5, 0, 0.5]) b.box(0.08, 0.45, 0.02, p.stoneDark, { pos: [x, 0.45, 0.51] });
    return b.build();
  },
  tronco_curto: (p) => {
    const b = new GeoBuilder();
    b.cyl(0.4, 0.42, 1.9, 9, p.trunk, { pos: [0, 0.4, 0], rot: [0, 0, PI / 2], jitter: 0.08 });
    b.cyl(0.36, 0.36, 0.02, 9, '#d8b27a', { pos: [0.96, 0.4, 0], rot: [0, 0, PI / 2] });
    b.cyl(0.36, 0.36, 0.02, 9, '#d8b27a', { pos: [-0.96, 0.4, 0], rot: [0, 0, PI / 2] });
    return b.build();
  },
  ovelha: (p) => {
    const b = new GeoBuilder();
    sheepBody(b, p.wool, '#3a2c26');
    return b.build();
  },
  cabra: () => {
    const b = new GeoBuilder();
    sheepBody(b, '#9a7048', '#4a3020');
    b.cone(0.05, 0.25, 5, '#d8cbb0', { pos: [0.66, 1.15, 0.08], rot: [0, 0, -0.6] });
    b.cone(0.05, 0.25, 5, '#d8cbb0', { pos: [0.66, 1.15, -0.08], rot: [0, 0, -0.6] });
    return b.build();
  },

  // ----- deslizar por baixo -----
  barreira: (p) => {
    const b = new GeoBuilder();
    for (const x of [-0.98, 0.98]) {
      b.box(0.16, 2.8, 0.16, p.woodDark, { pos: [x, 1.4, 0] });
      b.box(0.3, 0.12, 0.3, p.wood, { pos: [x, 0.06, 0] });
    }
    b.box(2.2, 0.16, 0.18, p.wood, { pos: [0, 2.65, 0] });
    stripedCloth(b, [p.cloth[0], p.cloth[1]], 1.8, 1.3, [0, 1.92, 0], 6, 0.06);
    scallop(b, [p.cloth[1], p.cloth[0]], 1.8, [0, 1.27, 0.0], 6);
    return b.build();
  },
  lancas: (p) => {
    const b = new GeoBuilder();
    for (const x of [-0.98, 0.98]) b.box(0.18, 2.8, 0.18, p.woodDark, { pos: [x, 1.4, 0] });
    for (const y of [1.45, 1.9, 2.4]) {
      b.cyl(0.04, 0.04, 2.2, 5, p.wood, { pos: [0, y, 0], rot: [0, 0, PI / 2] });
    }
    for (let i = 0; i < 5; i++) {
      b.cone(0.07, 0.25, 4, '#b8b8c0', { pos: [-0.8 + i * 0.4, 1.3, 0], rot: [PI, 0, 0] });
    }
    stripedCloth(b, [p.cloth[2], p.cloth[0]], 1.7, 0.3, [0, 2.15, 0.02], 4);
    return b.build();
  },

  // ----- pista inteira -----
  tronco: (p) => {
    const b = new GeoBuilder();
    b.cyl(0.4, 0.44, 7.6, 10, p.trunk, { pos: [0, 0.42, 0], rot: [0, 0, PI / 2], jitter: 0.07 });
    b.cyl(0.38, 0.38, 0.02, 10, '#d8b27a', { pos: [3.81, 0.42, 0], rot: [0, 0, PI / 2] });
    b.cyl(0.38, 0.38, 0.02, 10, '#d8b27a', { pos: [-3.81, 0.42, 0], rot: [0, 0, PI / 2] });
    b.cyl(0.08, 0.12, 0.6, 5, p.trunk, { pos: [-1.5, 0.9, 0], rot: [0.3, 0, 0.4] });
    b.cyl(0.08, 0.12, 0.5, 5, p.trunk, { pos: [1.9, 0.85, 0.1], rot: [-0.3, 0, -0.5] });
    b.ico(0.22, 0, p.leaf, { pos: [-1.65, 1.15, 0.08] });
    b.ico(0.2, 0, p.leaf, { pos: [2.05, 1.05, 0.15] });
    return b.build();
  },
  coluna_caida: (p) => {
    const b = new GeoBuilder();
    b.cyl(0.45, 0.45, 7.6, 12, p.stone, { pos: [0, 0.45, 0], rot: [0, 0, PI / 2], jitter: 0.04 });
    for (const x of [-3, -1.5, 0, 1.5, 3]) b.cyl(0.47, 0.47, 0.12, 12, p.stoneDark, { pos: [x, 0.45, 0], rot: [0, 0, PI / 2] });
    b.box(1.1, 0.95, 1.1, p.stoneLight, { pos: [-3.3, 0.47, 0] });
    return b.build();
  },
  muro_baixo: (p) => {
    const b = new GeoBuilder();
    b.box(7.6, 0.8, 0.8, p.accent, { pos: [0, 0.4, 0], jitter: 0.05 });
    b.box(7.7, 0.14, 0.9, p.gold, { pos: [0, 0.86, 0] });
    for (let i = 0; i < 9; i++) b.box(0.5, 0.4, 0.04, p.stoneLight, { pos: [-3.4 + i * 0.85, 0.4, 0.41] });
    return b.build();
  },
  portao: (p) => {
    const b = new GeoBuilder();
    for (const x of [-3.75, 3.75]) {
      b.box(0.4, 3.6, 0.4, p.woodDark, { pos: [x, 1.8, 0] });
      b.box(0.6, 0.2, 0.6, p.wood, { pos: [x, 0.1, 0] });
    }
    b.box(8.2, 0.3, 0.4, p.wood, { pos: [0, 3.5, 0] });
    b.box(7.6, 0.22, 0.3, p.woodDark, { pos: [0, 2.55, 0] });
    stripedCloth(b, [p.cloth[0], p.cloth[1], p.cloth[2]], 7.2, 1.25, [0, 1.85, 0], 12, 0.06);
    scallop(b, [p.cloth[1], p.cloth[0], p.cloth[2]], 7.2, [0, 1.22, 0], 12);
    for (const x of [-2.5, 0, 2.5]) b.sphere(0.18, 6, 4, p.gold, { pos: [x, 3.75, 0] });
    return b.build();
  },
  portao_egipcio: (p) => {
    const b = new GeoBuilder();
    for (const x of [-3.7, 3.7]) {
      b.cyl(0.42, 0.5, 3.6, 10, p.stone, { pos: [x, 1.8, 0] });
      b.cyl(0.65, 0.42, 0.45, 10, p.accent, { pos: [x, 3.8, 0] });
    }
    b.box(8.6, 0.6, 0.9, p.stone, { pos: [0, 4.2, 0] });
    b.box(8.6, 0.12, 0.92, p.gold, { pos: [0, 3.95, 0] });
    // painel suspenso
    b.box(7.0, 1.4, 0.25, p.stoneLight, { pos: [0, 1.95, 0] });
    for (let i = 0; i < 7; i++) b.box(0.6, 0.6, 0.05, i % 2 ? p.accent : p.gold, { pos: [-3 + i, 2.0, 0.14] });
    b.box(7.0, 0.1, 0.3, p.stoneDark, { pos: [0, 1.25, 0] });
    b.box(0.2, 1.6, 0.2, p.stoneDark, { pos: [0, 3.2, 0] });
    return b.build();
  },
  portao_azul: (p) => {
    const b = new GeoBuilder();
    for (const x of [-3.9, 3.9]) {
      b.box(0.9, 4.6, 0.9, p.accent, { pos: [x, 2.3, 0] });
      for (const dz of [-0.3, 0.3]) b.box(0.3, 0.3, 0.3, p.accent, { pos: [x + dz, 4.75, 0] });
      b.box(0.92, 0.12, 0.92, p.gold, { pos: [x, 3.0, 0] });
    }
    b.box(8.7, 0.9, 0.8, p.accent, { pos: [0, 4.15, 0] });
    for (let i = 0; i < 9; i++) b.box(0.35, 0.35, 0.82, p.accent, { pos: [-3.6 + i * 0.9, 4.75, 0] });
    b.box(8.7, 0.14, 0.85, p.gold, { pos: [0, 3.7, 0] });
    // grade levadiça parcialmente baixada
    for (let i = 0; i < 12; i++) b.box(0.08, 2.4, 0.08, '#4a4038', { pos: [-3.3 + i * 0.6, 2.45, 0] });
    for (const y of [1.35, 2.1, 2.9]) b.box(7.0, 0.1, 0.1, '#4a4038', { pos: [0, y, 0] });
    for (let i = 0; i < 12; i++) b.cone(0.06, 0.18, 4, '#4a4038', { pos: [-3.3 + i * 0.6, 1.2, 0], rot: [PI, 0, 0] });
    return b.build();
  },

  // ----- bloqueios (desviar) -----
  barraca: (p) => {
    const b = new GeoBuilder();
    for (const x of [-0.9, 0.9]) for (const z of [-0.9, 0.9]) b.box(0.12, 2.6, 0.12, p.woodDark, { pos: [x, 1.3, z] });
    b.box(1.95, 0.9, 1.4, p.wood, { pos: [0, 0.45, 0.25], jitter: 0.06 });
    b.box(2.0, 0.08, 1.45, p.woodDark, { pos: [0, 0.92, 0.25] });
    amphora(b, p.clay, -0.55, 0.3, 0.45);
    amphora(b, p.clayDark, 0.0, 0.45, 0.38);
    for (let i = 0; i < 5; i++) b.sphere(0.13, 6, 4, i % 2 ? '#d93b2b' : '#f2a23a', { pos: [0.45 + (i % 2) * 0.2, 1.05, 0.1 + i * 0.12] });
    // toldo listrado
    for (let i = 0; i < 6; i++) {
      b.box(0.34, 0.06, 2.1, i % 2 ? p.cloth[1] : p.cloth[0], { pos: [-0.85 + i * 0.34, 2.68, 0], rot: [0.0, 0, (i - 2.5) * -0.04], jitter: 0.02 });
    }
    scallop(b, [p.cloth[0], p.cloth[1]], 2.04, [0, 2.6, 1.06], 6);
    return b.build();
  },
  carroca: (p) => {
    const b = new GeoBuilder();
    // carroça orientada ao longo de z (comprimento 3,6)
    b.box(1.75, 0.18, 3.4, p.woodDark, { pos: [0, 0.75, 0] });
    for (const x of [-0.85, 0.85]) b.box(0.08, 0.6, 3.4, p.wood, { pos: [x, 1.12, 0], jitter: 0.08 });
    b.box(1.75, 0.6, 0.08, p.wood, { pos: [0, 1.12, 1.66] });
    b.box(1.75, 0.6, 0.08, p.wood, { pos: [0, 1.12, -1.66] });
    for (const z of [-1.1, 1.1]) for (const x of [-0.95, 0.95]) wheel(b, p, x, 0.5, z, 0.5);
    // carga: feno, sacos, jarros
    b.box(1.6, 0.9, 1.5, '#e2c35a', { pos: [0, 1.75, -0.8], jitter: 0.12 });
    b.box(1.5, 0.5, 1.3, '#d4b24a', { pos: [0, 2.35, -0.8], jitter: 0.12 });
    b.sphere(0.4, 7, 5, '#c9b28a', { pos: [-0.4, 1.6, 0.8], scale: [1, 0.8, 1] });
    b.sphere(0.38, 7, 5, '#b89c72', { pos: [0.4, 1.6, 0.9], scale: [1, 0.8, 1] });
    b.sphere(0.35, 7, 5, '#c9b28a', { pos: [0.0, 2.05, 0.8], scale: [1, 0.8, 1] });
    amphora(b, p.clay, 0.45, 1.3, 0.75);
    return b.build();
  },
  rocha_grande: (p) => {
    const b = new GeoBuilder();
    rock(b, p.stone, 0, 0, 0, 1.3, 1.1);
    rock(b, p.stoneDark, 0.6, 0, 0.5, 0.7);
    rock(b, p.stoneLight, -0.7, 0, 0.3, 0.6);
    return b.build();
  },
  ruina: (p) => {
    const b = new GeoBuilder();
    b.box(1.9, 2.8, 0.9, p.stone, { pos: [0, 1.4, 0], jitter: 0.08 });
    b.box(0.8, 0.6, 0.95, p.stoneLight, { pos: [-0.55, 3.0, 0] });
    b.box(0.6, 1.1, 0.4, p.stoneDark, { pos: [0, 1.2, 0.46] });
    rock(b, p.stoneDark, 0.8, 0, 0.7, 0.35);
    return b.build();
  },
  tenda: (p) => {
    const b = new GeoBuilder();
    b.add(new THREE.ConeGeometry(1.35, 2.9, 4), p.cloth[2], { pos: [0, 1.45, 0], rot: [0, PI / 4, 0], jitter: 0.05 });
    b.add(new THREE.ConeGeometry(0.5, 1.4, 4), p.woodDark, { pos: [0, 0.7, 0.62], rot: [0, PI / 4, 0] });
    b.cyl(0.04, 0.04, 0.6, 4, p.woodDark, { pos: [0, 3.0, 0] });
    b.box(0.5, 0.3, 0.02, p.cloth[0], { pos: [0.25, 3.15, 0] });
    return b.build();
  },
  estatua: (p) => {
    const b = new GeoBuilder();
    b.box(1.9, 0.6, 1.6, p.stoneDark, { pos: [0, 0.3, 0] });
    b.box(1.3, 1.2, 1.0, p.stone, { pos: [0, 1.2, 0] });
    b.box(0.9, 1.0, 0.6, p.stone, { pos: [0, 2.2, 0] });
    b.sphere(0.36, 8, 6, p.stone, { pos: [0, 2.95, 0] });
    // toucado listrado
    for (let i = 0; i < 5; i++) b.box(0.95 - i * 0.05, 0.12, 0.7, i % 2 ? p.gold : p.accent, { pos: [0, 3.15 - i * 0.18, 0.05] });
    b.box(0.2, 0.2, 0.05, p.gold, { pos: [0, 3.25, 0.37] });
    return b.build();
  },
  leao: (p) => {
    const b = new GeoBuilder();
    b.box(1.9, 0.8, 2.2, p.accent, { pos: [0, 0.4, 0] });
    b.box(1.95, 0.1, 2.25, p.gold, { pos: [0, 0.82, 0] });
    b.box(0.9, 0.9, 1.6, p.gold, { pos: [0, 1.35, 0.1], jitter: 0.08 });
    b.ico(0.6, 0, '#c98a2e', { pos: [0, 2.0, 0.85], jitter: 0.1 });
    b.box(0.45, 0.4, 0.4, p.gold, { pos: [0, 1.9, 1.25] });
    for (const x of [-0.3, 0.3]) b.box(0.25, 0.8, 0.3, p.gold, { pos: [x, 1.2, 0.9] });
    b.cyl(0.06, 0.06, 0.9, 5, p.gold, { pos: [0, 1.7, -0.75], rot: [0.9, 0, 0] });
    return b.build();
  },
};
