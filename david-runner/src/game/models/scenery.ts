import * as THREE from 'three';
import { GeoBuilder } from './geo';
import { PI, amphora, crate, house, palm, rock, sheepBody, stripedCloth, tree, type GeoFactory, type Palette } from './shapes';

export const SIDE_FACTORIES: Record<string, GeoFactory> = {
  // ---------------- Jerusalém ----------------
  casa: (p) => {
    const b = new GeoBuilder();
    house(b, p, 4.4, 3.6, 4, -2, 0, { awning: true });
    amphora(b, p.clay, 0.3, 1.9, 0.55);
    amphora(b, p.clayDark, 0.5, 1.4, 0.45);
    return b.build();
  },
  casa_alta: (p) => {
    const b = new GeoBuilder();
    house(b, p, 4.2, 6.4, 4, -2, 0, { color: '#e8d3a8' });
    house(b, p, 3.0, 3.0, 3, -2.5, 3.8);
    b.box(0.08, 0.06, 7.5, '#6a4a30', { pos: [0.1, 5.2, 1.5] });
    for (let i = 0; i < 6; i++) b.box(0.05, 0.6, 0.45, i % 2 ? p.cloth[2] : '#f2f2f2', { pos: [0.12, 4.85, -1.5 + i * 1.1] });
    return b.build();
  },
  torre: (p) => {
    const b = new GeoBuilder();
    b.box(3.4, 9, 3.4, p.stone, { pos: [-2.2, 4.5, 0], jitter: 0.05 });
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) b.box(0.6, 0.7, 0.6, p.stone, { pos: [-2.2 + s * 1.4, 9.3, -1.4 + i * 0.93] });
    for (const y of [3.2, 5.8]) b.box(0.06, 0.9, 0.3, '#2b1d14', { pos: [-0.49, y, 0] });
    b.box(3.6, 0.25, 3.6, p.stoneLight, { pos: [-2.2, 6.9, 0] });
    return b.build();
  },
  mercado: (p) => {
    const b = new GeoBuilder();
    for (const zz of [-1.4, 1.4]) for (const xx of [-1.3, 0.6]) b.box(0.12, 2.4, 0.12, p.woodDark, { pos: [xx, 1.2, zz] });
    b.box(2.2, 0.85, 2.8, p.wood, { pos: [-0.35, 0.42, 0], jitter: 0.07 });
    for (let i = 0; i < 6; i++) {
      b.box(2.4, 0.06, 0.5, i % 2 ? p.cloth[0] : '#f6efe0', { pos: [-0.3, 2.45 - i * 0.01, -1.25 + i * 0.5], rot: [0, 0, -0.18] });
    }
    b.cyl(0.4, 0.33, 0.35, 10, '#c89a55', { pos: [0.2, 1.02, -0.8] });
    for (let i = 0; i < 6; i++) b.sphere(0.12, 6, 4, i % 2 ? '#d93b2b' : '#f2a23a', { pos: [0.1 + (i % 3) * 0.12, 1.22, -0.95 + Math.floor(i / 3) * 0.25] });
    amphora(b, p.clay, 0.15, 0.85, 0.5);
    amphora(b, p.clayDark, -0.25, 1.4, 0.45);
    b.box(0.6, 0.25, 0.6, '#7a4ac0', { pos: [0.2, 0.98, 0.5] });
    b.box(0.6, 0.25, 0.6, '#4ac07a', { pos: [-0.5, 0.98, 0.6] });
    return b.build();
  },
  oliveira: (p) => {
    const b = new GeoBuilder();
    tree(b, p, -1.2, 0, 1.1, 'olive');
    rock(b, p.stone, 0.2, 0, 1.2, 0.35);
    return b.build();
  },
  palmeira: (p) => {
    const b = new GeoBuilder();
    palm(b, p, -1.4, 0, 1.05);
    return b.build();
  },
  jarros: (p) => {
    const b = new GeoBuilder();
    amphora(b, p.clay, -0.3, -0.6, 0.85, p.clayDark);
    amphora(b, p.clayDark, 0.3, 0.2, 0.7);
    amphora(b, p.clay, -0.6, 0.8, 0.6);
    crate(b, p, 0.8, 0.7, 0.8, [-1.4, 0, 0]);
    return b.build();
  },
  poco: (p) => {
    const b = new GeoBuilder();
    b.cyl(0.9, 1.0, 0.9, 12, p.stone, { pos: [-1.2, 0.45, 0], jitter: 0.08 });
    b.cyl(0.75, 0.75, 0.92, 12, '#2a2a2a', { pos: [-1.2, 0.46, 0] });
    for (const z of [-0.8, 0.8]) b.box(0.12, 1.9, 0.12, p.woodDark, { pos: [-1.2, 1.4, z] });
    b.cyl(0.07, 0.07, 1.8, 6, p.wood, { pos: [-1.2, 2.2, 0], rot: [PI / 2, 0, 0] });
    b.prism(2.0, 0.6, 1.6, p.cloth[0], { pos: [-1.2, 2.3, 0], rot: [0, PI / 2, 0] });
    return b.build();
  },
  // ---------------- Deserto ----------------
  duna: (p) => {
    const b = new GeoBuilder(0.03);
    b.sphere(4.5, 10, 6, p.sand, { pos: [-4, -1.6, 0], scale: [1, 0.6, 1.5] });
    b.sphere(3, 9, 5, '#e9c88e', { pos: [-1.6, -1.2, 3.5], scale: [1, 0.55, 1.2] });
    return b.build();
  },
  cacto: (p) => {
    const b = new GeoBuilder();
    b.cyl(0.32, 0.36, 3.2, 8, '#4f8a3a', { pos: [-1.2, 1.6, 0] });
    b.sphere(0.32, 8, 5, '#4f8a3a', { pos: [-1.2, 3.2, 0] });
    b.cyl(0.2, 0.2, 0.9, 7, '#4f8a3a', { pos: [-0.75, 1.8, 0], rot: [0, 0, PI / 2] });
    b.cyl(0.2, 0.2, 1.0, 7, '#4f8a3a', { pos: [-0.35, 2.3, 0] });
    b.sphere(0.2, 6, 4, '#4f8a3a', { pos: [-0.35, 2.8, 0] });
    b.cyl(0.18, 0.18, 0.7, 7, '#5f9a48', { pos: [-1.6, 1.4, 0], rot: [0, 0, PI / 2] });
    b.cyl(0.18, 0.18, 0.8, 7, '#5f9a48', { pos: [-1.95, 1.8, 0] });
    b.sphere(0.25, 5, 4, '#f06ea0', { pos: [-1.2, 3.5, 0] });
    rock(b, p.stone, 0.2, 0, 0.6, 0.4);
    return b.build();
  },
  rochas: (p) => {
    const b = new GeoBuilder();
    rock(b, p.stone, -2, 0, 0, 1.6, 1.0);
    rock(b, p.stoneDark, -0.6, 0, 1.2, 0.8);
    rock(b, p.stoneLight, -3.2, 0, -1.4, 1.1);
    return b.build();
  },
  colunas: (p) => {
    const b = new GeoBuilder();
    for (const [z, h] of [[-1.5, 4.5], [0.3, 2.6], [2.0, 3.6]] as const) {
      b.cyl(0.42, 0.48, h, 10, p.stone, { pos: [-1.6, h / 2, z], jitter: 0.05 });
      b.box(1.1, 0.3, 1.1, p.stoneLight, { pos: [-1.6, 0.15, z] });
      if (h > 3) b.box(1.1, 0.35, 1.1, p.stoneLight, { pos: [-1.6, h + 0.17, z] });
    }
    rock(b, p.stoneLight, -0.4, 0, 0.8, 0.45);
    return b.build();
  },
  arvore_seca: (p) => {
    const b = new GeoBuilder();
    b.cyl(0.12, 0.22, 2.2, 6, '#7a5a3a', { pos: [-1.5, 1.1, 0], rot: [0, 0, 0.1] });
    b.cyl(0.06, 0.1, 1.2, 5, '#7a5a3a', { pos: [-1.1, 2.4, 0.2], rot: [0.3, 0, -0.7] });
    b.cyl(0.06, 0.1, 1.0, 5, '#7a5a3a', { pos: [-1.95, 2.3, -0.2], rot: [-0.2, 0, 0.8] });
    rock(b, p.stone, -0.6, 0, -0.8, 0.5);
    return b.build();
  },
  tenda_beduina: (p) => {
    const b = new GeoBuilder();
    for (const z of [-1.6, 0, 1.6]) for (const x of [-3, -0.6]) b.cyl(0.06, 0.06, 2.2, 4, p.woodDark, { pos: [x, 1.1, z] });
    b.box(2.8, 0.1, 3.6, '#5a3a2a', { pos: [-1.8, 2.3, 0], rot: [0, 0, 0.25] });
    stripedCloth(b, ['#5a3a2a', '#c9a46a'], 3.6, 1.6, [-3.05, 1.1, 0], 6, 0.06, PI / 2);
    b.box(1.6, 0.4, 1.2, p.cloth[0], { pos: [-1.4, 0.2, 0.4] });
    return b.build();
  },
  // ---------------- Vale de Elá ----------------
  arvore: (p) => {
    const b = new GeoBuilder();
    tree(b, p, -1.6, 0, 1.25, 'round');
    return b.build();
  },
  pinheiro: (p) => {
    const b = new GeoBuilder();
    tree(b, p, -1.4, 0, 1.2, 'pine');
    tree(b, p, -3.2, 1.6, 0.9, 'pine');
    return b.build();
  },
  arbustos: (p) => {
    const b = new GeoBuilder();
    for (let i = 0; i < 5; i++) b.ico(0.5 + (i % 3) * 0.15, 0, i % 2 ? p.leaf : p.leafDark, { pos: [-0.8 - (i % 3) * 0.9, 0.35, -1.8 + i * 0.9], jitter: 0.1 });
    for (let i = 0; i < 8; i++) b.sphere(0.09, 5, 3, i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#f2d046' : '#e86a8a', { pos: [-0.3 - (i % 4) * 0.5, 0.12, -1.6 + i * 0.45] });
    return b.build();
  },
  rebanho: (p) => {
    const b = new GeoBuilder();
    sheepBody(b, p.wool, '#3a2c26', -1.2, -0.8, 0.6);
    sheepBody(b, p.wool, '#3a2c26', -2.6, 0.9, -0.3);
    for (let i = 0; i < 5; i++) b.box(0.12, 0.9, 0.12, p.woodDark, { pos: [-0.3, 0.45, -2.4 + i * 1.2] });
    b.box(0.08, 0.1, 5, p.wood, { pos: [-0.3, 0.75, 0] });
    b.box(0.08, 0.1, 5, p.wood, { pos: [-0.3, 0.4, 0] });
    return b.build();
  },
  acampamento: (p) => {
    const b = new GeoBuilder();
    b.add(new THREE.ConeGeometry(1.6, 2.6, 4), p.cloth[2], { pos: [-2.2, 1.3, 0], rot: [0, PI / 4, 0] });
    b.add(new THREE.ConeGeometry(1.2, 2.0, 4), '#d8c8a8', { pos: [-2.0, 1.0, 3.0], rot: [0, PI / 4, 0] });
    b.cyl(0.05, 0.05, 3.2, 4, p.woodDark, { pos: [-0.6, 1.6, 1.5] });
    stripedCloth(b, [p.cloth[0], p.cloth[1]], 0.9, 0.6, [-0.6, 2.8, 1.95], 3, 0.03, PI / 2);
    // fogueira
    for (let i = 0; i < 6; i++) rock(b, p.stoneDark, -0.7 + Math.cos(i) * 0.4, 0, -1.5 + Math.sin(i) * 0.4, 0.15);
    b.cone(0.22, 0.5, 5, '#ff9a2a', { pos: [-0.7, 0.25, -1.5] });
    return b.build();
  },
  // ---------------- Egito ----------------
  obelisco: (p) => {
    const b = new GeoBuilder();
    b.box(1.6, 0.6, 1.6, p.stoneDark, { pos: [-1.6, 0.3, 0] });
    b.cyl(0.42, 0.62, 7, 4, p.stoneLight, { pos: [-1.6, 4.1, 0], rot: [0, PI / 4, 0], jitter: 0.04 });
    b.cone(0.42, 0.8, 4, p.gold, { pos: [-1.6, 8.0, 0], rot: [0, PI / 4, 0] });
    for (let i = 0; i < 5; i++) b.box(0.03, 0.2, 0.25, p.accent, { pos: [-1.17, 2 + i * 1.0, 0] });
    return b.build();
  },
  templo: (p) => {
    const b = new GeoBuilder();
    b.box(4, 0.4, 7, p.stoneDark, { pos: [-2.5, 0.2, 0] });
    for (let i = 0; i < 4; i++) {
      b.cyl(0.38, 0.42, 4.6, 10, p.stone, { pos: [-0.9, 2.7, -2.7 + i * 1.8], jitter: 0.04 });
      b.cyl(0.65, 0.38, 0.5, 10, p.accent, { pos: [-0.9, 5.2, -2.7 + i * 1.8] });
    }
    b.box(1.2, 0.7, 7.4, p.stoneLight, { pos: [-0.9, 5.8, 0] });
    b.box(1.22, 0.14, 7.42, p.gold, { pos: [-0.9, 5.5, 0] });
    b.box(3.2, 5.5, 7, p.stone, { pos: [-3.2, 2.75, 0] });
    return b.build();
  },
  esfinge: (p) => {
    const b = new GeoBuilder();
    b.box(2.2, 0.6, 4.6, p.stoneDark, { pos: [-1.8, 0.3, 0] });
    b.box(1.5, 1.2, 3.4, p.sand, { pos: [-1.8, 1.2, 0.3] });
    b.box(1.0, 1.6, 1.1, p.sand, { pos: [-1.8, 2.0, -1.4] });
    for (let i = 0; i < 4; i++) b.box(1.2 - i * 0.08, 0.16, 1.0, i % 2 ? p.accent : p.gold, { pos: [-1.8, 2.75 - i * 0.22, -1.35] });
    b.box(0.5, 0.25, 1.6, p.sand, { pos: [-1.25, 0.75, -1.9] });
    b.box(0.5, 0.25, 1.6, p.sand, { pos: [-2.35, 0.75, -1.9] });
    return b.build();
  },
  papiro: () => {
    const b = new GeoBuilder();
    for (let i = 0; i < 9; i++) {
      const x = -0.6 - (i % 3) * 0.6;
      const z = -1 + Math.floor(i / 3) * 0.9;
      b.cyl(0.03, 0.04, 2.2 + (i % 2) * 0.6, 4, '#5f9a48', { pos: [x, 1.1, z], rot: [(i % 3) * 0.06, 0, (i % 2) * 0.08] });
      b.cone(0.3, 0.4, 6, '#8bc46a', { pos: [x, 2.4 + (i % 2) * 0.6, z], rot: [PI, 0, 0] });
    }
    b.cyl(1.8, 1.8, 0.06, 10, '#3f8fb0', { pos: [-1.2, 0.03, 0] });
    return b.build();
  },
  casa_egipcia: (p) => {
    const b = new GeoBuilder();
    house(b, p, 4.0, 3.4, 4, -2, 0, { color: '#e4c48c', awning: true });
    b.box(0.06, 0.5, 2.2, p.accent, { pos: [0.02, 3.0, 0] });
    return b.build();
  },
  // ---------------- Babilônia ----------------
  muralha_azul: (p) => {
    const b = new GeoBuilder();
    b.box(2.2, 6, 7, p.accent, { pos: [-1.6, 3, 0], jitter: 0.04 });
    for (let i = 0; i < 7; i++) b.box(2.2, 0.6, 0.6, p.accent, { pos: [-1.6, 6.3, -3 + i]  });
    b.box(2.25, 0.18, 7.05, p.gold, { pos: [-1.6, 5.0, 0] });
    b.box(2.25, 0.18, 7.05, p.gold, { pos: [-1.6, 1.0, 0] });
    // leões em relevo
    for (const z of [-1.8, 1.8]) {
      b.box(0.1, 0.9, 2.0, p.gold, { pos: [-0.48, 2.6, z] });
      b.box(0.1, 0.6, 0.6, p.gold, { pos: [-0.48, 3.25, z - 0.9] });
      b.box(0.1, 0.5, 0.2, p.gold, { pos: [-0.48, 1.9, z - 0.7] });
      b.box(0.1, 0.5, 0.2, p.gold, { pos: [-0.48, 1.9, z + 0.7] });
    }
    for (let i = 0; i < 8; i++) b.sphere(0.12, 6, 4, '#ffffff', { pos: [-0.48, 4.4, -3.2 + i * 0.9] });
    return b.build();
  },
  jardim: (p) => {
    const b = new GeoBuilder();
    for (let i = 0; i < 3; i++) {
      const s = 5 - i * 1.3;
      b.box(s, 1.6, s, p.stoneLight, { pos: [-1.6 - i * 0.3, 0.8 + i * 1.6, 0], jitter: 0.04 });
      b.box(s + 0.2, 0.3, s + 0.2, p.leaf, { pos: [-1.6 - i * 0.3, 1.65 + i * 1.6, 0] });
      for (let k = 0; k < 5; k++) b.box(0.1, 0.9, 0.35, p.leafDark, { pos: [-1.6 - i * 0.3 + s / 2 + 0.05, 1.25 + i * 1.6, -s / 2 + 0.4 + k * (s - 0.8) / 4] });
      for (let k = 0; k < 3; k++) b.ico(0.45, 0, k % 2 ? p.leaf : p.leafDark, { pos: [-1.6 - i * 0.3 + (k - 1) * 0.9, 2.1 + i * 1.6, (k - 1) * 0.9] });
    }
    b.sphere(0.15, 5, 3, '#e86a8a', { pos: [0.95, 1.4, 0.4] });
    b.sphere(0.15, 5, 3, '#ffffff', { pos: [0.95, 1.2, -0.8] });
    return b.build();
  },
  torre_azul: (p) => {
    const b = new GeoBuilder();
    b.box(3, 8, 3, p.accent, { pos: [-2, 4, 0] });
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) b.box(0.55, 0.7, 0.55, p.accent, { pos: [-2 + s * 1.2, 8.35, -1.2 + i * 0.8] });
    for (const y of [2, 4, 6]) b.box(3.05, 0.15, 3.05, p.gold, { pos: [-2, y, 0] });
    for (let i = 0; i < 3; i++) b.sphere(0.14, 6, 4, '#ffffff', { pos: [-0.48, 5, -0.9 + i * 0.9] });
    return b.build();
  },
};

// ============================================================================
// FUNDO DISTANTE (sem neblina) — horizonte de cada mapa.
// ============================================================================

export type BackdropFactory = (p: Palette, haze: THREE.Color) => THREE.BufferGeometry;

function hazed(color: string, haze: THREE.Color, amount: number): THREE.Color {
  return new THREE.Color(color).lerp(haze, amount);
}

function hills(b: GeoBuilder, color: string, haze: THREE.Color, amount: number, n: number, dist: number, height: number, seed: number) {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = -260 + t * 520;
    const r = 30 + ((seed * (i + 3)) % 17) * 2.2;
    const h = height * (0.6 + (((seed * (i + 7)) % 11) / 11) * 0.7);
    b.sphere(r, 10, 6, hazed(color, haze, amount).getStyle(), { pos: [x, -r * 0.35 * (h / height), -dist - ((i * 37) % 30)], scale: [1, h / r, 0.6], jitter: 0.03 });
  }
}

export const BACKDROP_FACTORIES: Record<string, BackdropFactory> = {
  jerusalem: (p, haze) => {
    const b = new GeoBuilder(0.03);
    hills(b, '#b9a97a', haze, 0.55, 12, 260, 34, 5);
    hills(b, '#9fae6a', haze, 0.35, 14, 210, 22, 9);
    // muralha e cidade na colina
    const wall = hazed(p.stoneLight, haze, 0.3).getStyle();
    const wallDark = hazed(p.stone, haze, 0.3).getStyle();
    b.box(150, 12, 4, wall, { pos: [0, 12, -200] });
    for (let i = 0; i < 9; i++) b.box(10, 22, 8, wallDark, { pos: [-72 + i * 18, 14, -198] });
    for (let i = 0; i < 26; i++) b.box(4 + (i % 3) * 2, 6 + (i % 4) * 3, 4, i % 2 ? wall : wallDark, { pos: [-60 + i * 4.8, 20 + (i % 4) * 1.5, -204] });
    // templo no alto
    b.box(26, 14, 10, wall, { pos: [8, 26, -210] });
    b.box(30, 2, 12, hazed(p.gold, haze, 0.25).getStyle(), { pos: [8, 34, -210] });
    for (let i = 0; i < 6; i++) b.box(2, 12, 2, wallDark, { pos: [-3 + i * 4.4, 25, -204.5] });
    return b.build();
  },
  deserto: (p, haze) => {
    const b = new GeoBuilder(0.03);
    hills(b, p.sand, haze, 0.35, 14, 220, 18, 3);
    const mesa = hazed('#c46a3a', haze, 0.45).getStyle();
    const mesaTop = hazed('#d98a4a', haze, 0.45).getStyle();
    for (let i = 0; i < 7; i++) {
      const x = -200 + i * 66 + ((i * 13) % 20);
      const w = 30 + (i % 3) * 14;
      const h = 30 + (i % 4) * 10;
      b.cyl(w * 0.8, w, h, 7, mesa, { pos: [x, h / 2 - 2, -250 - (i % 2) * 20] });
      b.cyl(w * 0.82, w * 0.8, 2, 7, mesaTop, { pos: [x, h - 1, -250 - (i % 2) * 20] });
    }
    return b.build();
  },
  vale: (p, haze) => {
    const b = new GeoBuilder(0.03);
    hills(b, '#5e8a4a', haze, 0.45, 12, 260, 50, 7);
    hills(b, p.leaf, haze, 0.25, 14, 200, 26, 4);
    const snow = hazed('#8a9a8a', haze, 0.5).getStyle();
    for (let i = 0; i < 5; i++) b.cone(40, 70, 6, snow, { pos: [-180 + i * 90, 25, -300] });
    return b.build();
  },
  egito: (p, haze) => {
    const b = new GeoBuilder(0.03);
    hills(b, p.sand, haze, 0.3, 14, 220, 12, 2);
    const pyr = hazed('#e2bf7c', haze, 0.3).getStyle();
    const pyrShade = hazed('#c9a262', haze, 0.3).getStyle();
    const pyramids: [number, number, number][] = [[-60, 60, 250], [10, 85, 280], [70, 50, 240], [-140, 40, 260]];
    for (const [x, s, d] of pyramids) {
      b.add(new THREE.ConeGeometry(s, s * 0.95, 4), pyr, { pos: [x, s * 0.47 - 2, -d], rot: [0, PI / 4, 0], jitter: 0.0 });
      b.add(new THREE.ConeGeometry(s * 0.5, s * 0.48, 4), pyrShade, { pos: [x + s * 0.2, s * 0.24 - 2, -d + s * 0.4], rot: [0, PI / 4, 0] });
    }
    b.box(500, 1, 30, hazed('#3f8fb0', haze, 0.4).getStyle(), { pos: [0, 0.1, -190] });
    return b.build();
  },
  babilonia: (p, haze) => {
    const b = new GeoBuilder(0.03);
    hills(b, '#c9a46a', haze, 0.4, 12, 240, 14, 8);
    const zig = hazed(p.stoneLight, haze, 0.3).getStyle();
    const zigDark = hazed(p.stone, haze, 0.3).getStyle();
    for (let i = 0; i < 6; i++) {
      const s = 70 - i * 11;
      b.box(s, 9, s, i % 2 ? zig : zigDark, { pos: [20, 4.5 + i * 9, -260] });
    }
    b.box(8, 50, 3, zigDark, { pos: [20, 25, -224] });
    b.box(9, 10, 9, hazed(p.accent, haze, 0.25).getStyle(), { pos: [20, 59, -260] });
    const wall = hazed(p.accent, haze, 0.35).getStyle();
    b.box(220, 14, 4, wall, { pos: [-60, 7, -205] });
    for (let i = 0; i < 12; i++) b.box(8, 20, 8, wall, { pos: [-160 + i * 18, 10, -203] });
    return b.build();
  },
};

/** Nuvens low-poly. */
export function cloudGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder(0.04);
  b.ico(5, 1, '#ffffff', { pos: [0, 0, 0], scale: [1.4, 0.75, 1] });
  b.ico(3.8, 1, '#f4f8ff', { pos: [-5, -0.8, 0.5], scale: [1.2, 0.7, 1] });
  b.ico(4.2, 1, '#ffffff', { pos: [5, -0.5, -0.5], scale: [1.3, 0.7, 1] });
  b.ico(3, 1, '#eef4ff', { pos: [1, 2.5, 0], scale: [1.2, 0.8, 1] });
  return b.build();
}

/** Bandeirolas atravessando a rua (decoração alta, sem colisão). */
export function buntingGeometry(p: Palette): THREE.BufferGeometry {
  const b = new GeoBuilder();
  for (const x of [-5.2, 5.2]) b.cyl(0.08, 0.12, 8.2, 6, p.woodDark, { pos: [x, 4.1, 0] });
  b.cyl(0.02, 0.02, 10.4, 4, '#5a4a3a', { pos: [0, 7.6, 0], rot: [0, 0, PI / 2] });
  const n = 14;
  for (let i = 0; i < n; i++) {
    const x = -4.9 + (i * 9.8) / (n - 1);
    b.prism(0.5, 0.6, 0.02, p.cloth[i % 3], { pos: [x, 7.58, 0], rot: [0, 0, PI] });
  }
  return b.build();
}
