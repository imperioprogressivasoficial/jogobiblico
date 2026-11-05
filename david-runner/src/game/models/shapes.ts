/** Paleta e peças low-poly reutilizáveis por obstáculos e cenário. */
import * as THREE from 'three';
import { GeoBuilder } from './geo';

/** Paleta de cores de cada mapa. */
export interface Palette {
  stone: string;
  stoneDark: string;
  stoneLight: string;
  wood: string;
  woodDark: string;
  clay: string;
  clayDark: string;
  cloth: [string, string, string];
  leaf: string;
  leafDark: string;
  trunk: string;
  sand: string;
  accent: string;
  gold: string;
  wool: string;
}

export type GeoFactory = (p: Palette) => THREE.BufferGeometry;

export const PI = Math.PI;

// ============================================================================
// Peças reutilizáveis
// ============================================================================

export function amphora(b: GeoBuilder, color: string, x: number, z: number, s = 1, dark?: string) {
  const pts: [number, number][] = [
    [0.0, 0],
    [0.18, 0.02],
    [0.34, 0.2],
    [0.4, 0.42],
    [0.34, 0.66],
    [0.16, 0.82],
    [0.13, 0.92],
    [0.19, 1.0],
  ];
  b.lathe(pts.map(([px, py]) => [px * s, py * s] as [number, number]), 9, color, { pos: [x, 0, z], jitter: 0.06 });
  if (dark) b.cyl(0.405 * s, 0.405 * s, 0.07 * s, 9, dark, { pos: [x, 0.5 * s, z] });
}

export function crate(b: GeoBuilder, p: Palette, w: number, h: number, d: number, pos: [number, number, number]) {
  b.box(w, h, d, p.wood, { pos: [pos[0], pos[1] + h / 2, pos[2]], jitter: 0.07 });
  const t = 0.07;
  // travessas
  for (const sy of [t / 2, h - t / 2]) {
    b.box(w + 0.02, t, d + 0.02, p.woodDark, { pos: [pos[0], pos[1] + sy, pos[2]] });
  }
  b.box(w + 0.02, t, 0.02 + d, p.woodDark, { pos: [pos[0], pos[1] + h / 2, pos[2]], rot: [0, 0, Math.atan2(h, w)], scale: [Math.hypot(w, h) / w, 1, 1] });
}

export function wheel(b: GeoBuilder, p: Palette, x: number, y: number, z: number, r: number) {
  b.cyl(r, r, 0.12, 10, p.woodDark, { pos: [x, y, z], rot: [0, 0, PI / 2], jitter: 0.08 });
  b.cyl(r * 0.3, r * 0.3, 0.16, 8, p.wood, { pos: [x, y, z], rot: [0, 0, PI / 2] });
  b.torus(r, 0.04, 4, 12, '#4a3a2a', { pos: [x, y, z], rot: [0, PI / 2, 0] });
}

export function stripedCloth(b: GeoBuilder, colors: string[], w: number, h: number, pos: [number, number, number], stripes = 6, depth = 0.05, rotY = 0) {
  const sw = w / stripes;
  for (let i = 0; i < stripes; i++) {
    const ox = -w / 2 + sw / 2 + i * sw;
    const x = pos[0] + Math.cos(rotY) * ox;
    const z = pos[2] - Math.sin(rotY) * ox;
    b.box(sw + 0.005, h, depth, colors[i % colors.length], { pos: [x, pos[1], z], rot: [0, rotY, 0], jitter: 0.03 });
  }
}

export function scallop(b: GeoBuilder, colors: string[], w: number, pos: [number, number, number], n = 6) {
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    b.prism(sw, 0.28, 0.05, colors[i % colors.length], { pos: [pos[0] - w / 2 + sw / 2 + i * sw, pos[1], pos[2]], rot: [0, 0, PI] });
  }
}

export function tree(b: GeoBuilder, p: Palette, x: number, z: number, s = 1, kind: 'olive' | 'round' | 'pine' = 'round') {
  b.cyl(0.14 * s, 0.22 * s, 1.6 * s, 6, p.trunk, { pos: [x, 0.8 * s, z], jitter: 0.1 });
  if (kind === 'pine') {
    for (let i = 0; i < 3; i++) b.cone((1.3 - i * 0.3) * s, 1.4 * s, 7, i % 2 ? p.leaf : p.leafDark, { pos: [x, (1.7 + i * 0.75) * s, z], jitter: 0.08 });
    return;
  }
  const leaf = kind === 'olive' ? '#8fa363' : p.leaf;
  const leafDark = kind === 'olive' ? '#6f8a4a' : p.leafDark;
  b.ico(1.05 * s, 0, leaf, { pos: [x, 2.3 * s, z], jitter: 0.1 });
  b.ico(0.75 * s, 0, leafDark, { pos: [x + 0.7 * s, 2.0 * s, z + 0.2 * s], jitter: 0.1 });
  b.ico(0.7 * s, 0, leaf, { pos: [x - 0.6 * s, 2.1 * s, z - 0.3 * s], jitter: 0.1 });
  b.ico(0.65 * s, 0, leafDark, { pos: [x + 0.1 * s, 2.9 * s, z - 0.2 * s], jitter: 0.1 });
}

export function palm(b: GeoBuilder, p: Palette, x: number, z: number, s = 1) {
  let px = x;
  let py = 0;
  for (let i = 0; i < 7; i++) {
    const seg = 0.62 * s;
    b.cyl(0.13 * s - i * 0.008 * s, 0.17 * s - i * 0.008 * s, seg, 6, i % 2 ? p.trunk : '#8a6440', { pos: [px, py + seg / 2, z], rot: [0, 0, -0.06 * i], jitter: 0.08 });
    px += Math.sin(0.06 * i) * seg;
    py += seg * 0.98;
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2;
    b.box(0.32 * s, 0.05 * s, 1.9 * s, i % 2 ? p.leaf : p.leafDark, {
      pos: [px + Math.cos(a) * 0.85 * s, py - 0.25 * s, z + Math.sin(a) * 0.85 * s],
      rot: [0.5, -a + PI / 2, 0],
      jitter: 0.06,
    });
  }
  b.sphere(0.2 * s, 6, 4, '#7a4a20', { pos: [px, py - 0.15 * s, z] });
}

export function rock(b: GeoBuilder, color: string, x: number, y: number, z: number, r: number, sy = 0.75) {
  b.dodeca(r, color, { pos: [x, y + r * sy * 0.6, z], scale: [1, sy, 1], rot: [r * 3, r * 7, 0], jitter: 0.12 });
}

export function sheepBody(b: GeoBuilder, wool: string, face: string, x = 0, z = 0, rotY = 0) {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  const at = (lx: number, ly: number, lz: number): [number, number, number] => [x + lx * c + lz * s, ly, z - lx * s + lz * c];
  b.ico(0.45, 1, wool, { pos: at(0, 0.72, 0), scale: [1.35, 0.95, 1], jitter: 0.08 });
  b.ico(0.3, 0, wool, { pos: at(0.35, 0.92, 0), jitter: 0.08 });
  b.ico(0.3, 0, wool, { pos: at(-0.35, 0.9, 0.05), jitter: 0.08 });
  b.sphere(0.2, 8, 6, face, { pos: at(0.72, 0.85, 0), scale: [1.2, 1, 0.9] });
  b.ico(0.16, 0, wool, { pos: at(0.66, 1.03, 0) });
  b.box(0.08, 0.16, 0.2, face, { pos: at(0.68, 0.9, 0.18), rot: [0.6, rotY, 0] });
  b.box(0.08, 0.16, 0.2, face, { pos: at(0.68, 0.9, -0.18), rot: [-0.6, rotY, 0] });
  b.sphere(0.035, 4, 3, '#ffffff', { pos: at(0.86, 0.9, 0.09) });
  b.sphere(0.035, 4, 3, '#ffffff', { pos: at(0.86, 0.9, -0.09) });
  for (const [lx, lz] of [[0.35, 0.2], [0.35, -0.2], [-0.35, 0.2], [-0.35, -0.2]]) {
    b.cyl(0.06, 0.05, 0.45, 5, face, { pos: at(lx, 0.22, lz) });
  }
}

export function house(b: GeoBuilder, p: Palette, w: number, h: number, d: number, x: number, z: number, opts: { awning?: boolean; dome?: boolean; color?: string } = {}) {
  const c = opts.color ?? p.stoneLight;
  b.box(d, h, w, c, { pos: [x, h / 2, z], jitter: 0.04 });
  b.box(d + 0.2, 0.2, w + 0.2, p.stone, { pos: [x, h + 0.1, z] });
  // parapeito
  for (const sz of [-1, 1]) b.box(d + 0.2, 0.4, 0.18, p.stone, { pos: [x, h + 0.4, z + sz * (w / 2)] });
  b.box(0.18, 0.4, w + 0.2, p.stone, { pos: [x + d / 2, h + 0.4, z] });
  // porta em arco
  const fx = x + d / 2 + 0.01;
  b.box(0.05, 1.5, 0.9, p.woodDark, { pos: [fx, 0.75, z] });
  b.cyl(0.45, 0.45, 0.05, 10, p.woodDark, { pos: [fx, 1.5, z], rot: [0, 0, PI / 2] });
  b.box(0.08, 0.15, 1.1, p.stone, { pos: [fx + 0.02, 0.07, z] });
  // janelas
  const floors = Math.max(1, Math.floor((h - 0.6) / 2.2));
  for (let f = 0; f < floors; f++) {
    const wy = 2.4 + f * 2.2;
    if (wy > h - 0.5) break;
    for (const wz of w > 3 ? [-w / 4 - 0.3, w / 4 + 0.3] : [w / 3]) {
      b.box(0.06, 0.7, 0.55, '#3b2a20', { pos: [fx, wy, z + wz] });
      b.box(0.12, 0.08, 0.7, p.wood, { pos: [fx + 0.04, wy - 0.4, z + wz] });
    }
  }
  if (opts.awning) {
    for (let i = 0; i < 5; i++) {
      b.box(1.3, 0.06, w / 5, i % 2 ? p.cloth[1] : p.cloth[0], { pos: [fx + 0.6, 2.25, z - w / 2 + w / 10 + (i * w) / 5], rot: [0, 0, -0.35], jitter: 0.02 });
    }
    b.cyl(0.04, 0.04, 2.0, 4, p.woodDark, { pos: [fx + 1.15, 1.0, z - w / 2 + 0.1] });
    b.cyl(0.04, 0.04, 2.0, 4, p.woodDark, { pos: [fx + 1.15, 1.0, z + w / 2 - 0.1] });
  }
  if (opts.dome) b.sphere(Math.min(w, d) * 0.38, 10, 6, p.gold, { pos: [x, h + 0.2, z], scale: [1, 0.9, 1] });
}
