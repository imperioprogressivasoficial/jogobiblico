import * as THREE from 'three';
import { ROAD_HALF_WIDTH, SEGMENT_LENGTH } from '../config';
import { GeoBuilder } from '../models/geo';
import { palm, rock, tree, type Palette } from '../models/shapes';
import { Rng } from '../rng';

/**
 * BEIRA DA PISTA — a faixa de cenário colada ao meio-fio, dos dois lados, em cada segmento.
 * É ela que tira o "chão vazio" entre a rua e as construções: canteiros, muretas, grama,
 * ondulações de areia, canal do Nilo, muro azul esmaltado... Cada mapa tem a sua.
 *
 * Gera duas variações por mapa (segmentos alternam) para não ficar repetitivo.
 */
export type VergeKind = 'cidade' | 'deserto' | 'campo' | 'nilo' | 'babilonia';

const L = SEGMENT_LENGTH;
const X0 = ROAD_HALF_WIDTH + 0.6; // começo da beira, logo depois do meio-fio

export function buildVerge(kind: VergeKind, p: Palette, variant: number): THREE.BufferGeometry {
  const b = new GeoBuilder(0.05);
  const rng = new Rng(777 + variant * 31);
  for (const side of [-1, 1] as const) {
    const sx = (x: number) => side * x;
    const flip = side === 1 ? Math.PI : 0;
    switch (kind) {
      case 'cidade':
        cidade(b, p, rng, sx, flip, variant);
        break;
      case 'deserto':
        deserto(b, p, rng, sx, variant);
        break;
      case 'campo':
        campo(b, p, rng, sx, variant);
        break;
      case 'nilo':
        nilo(b, p, rng, sx, variant);
        break;
      case 'babilonia':
        babilonia(b, p, rng, sx, flip, variant);
        break;
    }
  }
  return b.build();
}

type SX = (x: number) => number;

/** Jerusalém: calçada de pedra, mureta baixa com vasos de flores e lampiões. */
function cidade(b: GeoBuilder, p: Palette, rng: Rng, sx: SX, _flip: number, v: number): void {
  // calçada de lajotas
  for (let k = 0; k < 6; k++) {
    b.box(2.4, 0.12, L / 6 - 0.08, k % 2 ? p.stoneLight : '#dcc497', { pos: [sx(X0 + 1.2), 0.05, -L / 2 + (k + 0.5) * (L / 6)], jitter: 0.02 });
  }
  // mureta baixa de pedra, com aberturas
  for (let k = 0; k < 8; k++) {
    if ((k + v) % 4 === 3) continue;
    b.box(0.5, 0.75, L / 8 - 0.3, k % 2 ? p.stone : p.stoneDark, { pos: [sx(X0 + 2.6), 0.37, -L / 2 + (k + 0.5) * (L / 8)], jitter: 0.03 });
    b.box(0.62, 0.12, L / 8 - 0.26, p.stoneLight, { pos: [sx(X0 + 2.6), 0.8, -L / 2 + (k + 0.5) * (L / 8)] });
  }
  // vasos de flores sobre a mureta e no chão
  for (let i = 0; i < 5; i++) {
    const z = -L / 2 + 2 + i * (L / 5) + rng.range(-1, 1);
    const onWall = i % 2 === v % 2;
    const x = onWall ? X0 + 2.6 : X0 + 0.6 + rng.range(0, 0.5);
    const y = onWall ? 0.86 : 0;
    b.cyl(0.26, 0.2, 0.42, 7, i % 2 ? p.clay : p.clayDark, { pos: [sx(x), y + 0.21, z] });
    b.ico(0.3, 0, p.leaf, { pos: [sx(x), y + 0.55, z], jitter: 0.1 });
    for (let f = 0; f < 4; f++) {
      const a = f * 1.6 + i;
      b.sphere(0.07, 5, 4, f % 2 ? '#e2574c' : '#ffd23f', { pos: [sx(x + Math.cos(a) * 0.2), y + 0.7, z + Math.sin(a) * 0.2] });
    }
  }
  // lampião de rua
  const lz = v % 2 ? -L / 4 : L / 4;
  b.cyl(0.07, 0.1, 2.6, 6, p.woodDark, { pos: [sx(X0 + 1.9), 1.3, lz] });
  b.box(0.36, 0.42, 0.36, '#f4c45a', { pos: [sx(X0 + 1.9), 2.75, lz] });
  b.cone(0.3, 0.25, 4, p.woodDark, { pos: [sx(X0 + 1.9), 3.08, lz], rot: [0, Math.PI / 4, 0] });
}

/** Deserto: ondulações de areia, pedras soltas, arbustos secos e um caminho de pegadas. */
function deserto(b: GeoBuilder, p: Palette, rng: Rng, sx: SX, v: number): void {
  for (let k = 0; k < 10; k++) {
    const z = -L / 2 + (k + 0.5) * (L / 10);
    const w = 1.6 + rng.range(0, 1.4);
    // ondulação de areia: bolha achatada, meio enterrada, da cor da areia mais clara
    b.sphere(1, 7, 4, k % 2 ? '#f3d59a' : '#ead08f', { pos: [sx(X0 + 1.2 + rng.range(0, 1.8)), -0.05, z], scale: [w, 0.16, 0.7], rot: [0, rng.range(-0.3, 0.3), 0] });
  }
  for (let i = 0; i < 6; i++) {
    const z = -L / 2 + 1 + i * (L / 6) + rng.range(-1, 1);
    const x = X0 + 0.4 + rng.range(0, 2.4);
    if ((i + v) % 3 === 0) {
      // arbusto seco
      for (let s = 0; s < 5; s++) {
        const a = s * 1.25 + i;
        b.box(0.05, 0.6 + rng.range(0, 0.3), 0.05, '#a8894f', { pos: [sx(x + Math.cos(a) * 0.12), 0.3, z + Math.sin(a) * 0.12], rot: [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5] });
      }
    } else rock(b, i % 2 ? p.stone : p.stoneDark, sx(x), 0, z, 0.22 + rng.range(0, 0.22));
  }
  // crânio de boi (clássico do deserto) numa das variações
  if (v % 2 === 1) {
    b.sphere(0.22, 7, 5, '#f1ece0', { pos: [sx(X0 + 1.6), 0.18, L / 3], scale: [1, 0.8, 1.2] });
    for (const s of [-1, 1]) b.cyl(0.03, 0.06, 0.5, 5, '#f1ece0', { pos: [sx(X0 + 1.6 + s * 0.3), 0.3, L / 3 - 0.1], rot: [0, 0, s * 1.1] });
  }
}

/** Vale: cerca de madeira com grama alta, flores e cogumelos. */
function campo(b: GeoBuilder, p: Palette, rng: Rng, sx: SX, v: number): void {
  // cerca
  const open = v % 2 ? 2 : 5;
  for (let k = 0; k < 8; k++) {
    const z = -L / 2 + k * (L / 8);
    b.box(0.14, 1.0, 0.14, p.woodDark, { pos: [sx(X0 + 2.2), 0.5, z], jitter: 0.04 });
    if (k !== open && k < 7) {
      for (const y of [0.42, 0.78]) b.box(0.08, 0.1, L / 8 - 0.1, p.wood, { pos: [sx(X0 + 2.2), y, z + L / 16], rot: [0, 0, rng.range(-0.05, 0.05)] });
    }
  }
  // grama alta e flores perto do meio-fio
  for (let i = 0; i < 18; i++) {
    const z = -L / 2 + rng.range(0.3, L - 0.3);
    const x = X0 + rng.range(0.2, 2.0);
    const h = 0.25 + rng.range(0, 0.3);
    b.cone(0.12, h, 3, i % 3 ? p.leaf : p.leafDark, { pos: [sx(x), h / 2, z], rot: [0, rng.range(0, 3), rng.range(-0.3, 0.3)] });
    if (i % 4 === 0) b.sphere(0.07, 5, 4, ['#ffffff', '#ffd23f', '#ff7eb3', '#7fb3ff'][i % 4 === 0 ? (i / 4) % 4 : 0], { pos: [sx(x), h + 0.04, z] });
  }
  // moitas e um cogumelo
  for (let i = 0; i < 3; i++) {
    const z = -L / 2 + 3 + i * 8 + rng.range(-1.5, 1.5);
    b.ico(0.5 + rng.range(0, 0.25), 0, i % 2 ? p.leaf : p.leafDark, { pos: [sx(X0 + 3.4), 0.35, z], scale: [1.3, 0.8, 1], jitter: 0.1 });
  }
  if (v % 2 === 0) {
    b.cyl(0.07, 0.09, 0.3, 6, '#f3e6cc', { pos: [sx(X0 + 1.2), 0.15, -L / 3] });
    b.sphere(0.2, 8, 5, '#e2574c', { pos: [sx(X0 + 1.2), 0.32, -L / 3], scale: [1, 0.6, 1] });
    for (const [dx, dz] of [[0.08, 0.06], [-0.1, 0.02], [0.02, -0.1]]) b.sphere(0.035, 4, 3, '#ffffff', { pos: [sx(X0 + 1.2 + dx), 0.42, -L / 3 + dz] });
  }
  // árvore maior num ponto só
  if (v % 2 === 1) tree(b, p, sx(X0 + 3.6), L / 2 - 4, 0.8, 'round');
}

/** Egito: canal de irrigação com papiros e flores de lótus, pedras pintadas na borda. */
function nilo(b: GeoBuilder, p: Palette, rng: Rng, sx: SX, v: number): void {
  // bordas do canal e água
  b.box(0.3, 0.3, L, '#d8b77a', { pos: [sx(X0 + 0.9), 0.14, 0] });
  b.box(0.3, 0.3, L, '#d8b77a', { pos: [sx(X0 + 2.7), 0.14, 0] });
  b.box(1.5, 0.08, L, '#3f9fd8', { pos: [sx(X0 + 1.8), 0.02, 0] });
  for (let k = 0; k < 7; k++) b.box(0.5, 0.02, 1.2, '#8fd3ff', { pos: [sx(X0 + 1.3 + rng.range(0, 1.0)), 0.07, -L / 2 + 1.5 + k * 3.2], rot: [0, rng.range(-0.4, 0.4), 0] });
  // papiros
  for (let i = 0; i < 7; i++) {
    const z = -L / 2 + 1 + i * (L / 7) + rng.range(-0.8, 0.8);
    const x = X0 + (i % 2 ? 0.5 : 3.1) + rng.range(0, 0.3);
    const h = 1.4 + rng.range(0, 0.6);
    b.cyl(0.03, 0.05, h, 5, p.leafDark, { pos: [sx(x), h / 2, z], rot: [rng.range(-0.1, 0.1), 0, rng.range(-0.15, 0.15)] });
    for (let s = 0; s < 6; s++) {
      const a = s * 1.05;
      b.box(0.03, 0.4, 0.03, p.leaf, { pos: [sx(x + Math.cos(a) * 0.14), h + 0.1, z + Math.sin(a) * 0.14], rot: [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9] });
    }
  }
  // lótus na água
  for (let i = 0; i < 4; i++) {
    const z = -L / 2 + 3 + i * 6 + rng.range(-1, 1);
    const x = X0 + 1.4 + rng.range(0, 0.8);
    b.cyl(0.3, 0.3, 0.03, 8, p.leafDark, { pos: [sx(x), 0.08, z] });
    if ((i + v) % 2 === 0) {
      for (let s = 0; s < 5; s++) b.cone(0.07, 0.22, 4, '#ff9fd0', { pos: [sx(x + Math.cos(s * 1.26) * 0.08), 0.2, z + Math.sin(s * 1.26) * 0.08], rot: [Math.sin(s * 1.26) * 0.4, 0, -Math.cos(s * 1.26) * 0.4] });
      b.sphere(0.05, 5, 4, '#ffd23f', { pos: [sx(x), 0.26, z] });
    }
  }
  if (v % 2 === 1) palm(b, p, sx(X0 + 4.0), -L / 2 + 5, 0.7);
}

/** Babilônia: muro baixo de tijolo azul esmaltado com palmetas douradas e jardineiras. */
function babilonia(b: GeoBuilder, p: Palette, rng: Rng, sx: SX, _flip: number, v: number): void {
  // muro baixo esmaltado
  for (let k = 0; k < 8; k++) {
    if ((k + v) % 5 === 4) continue;
    const z = -L / 2 + (k + 0.5) * (L / 8);
    b.box(0.5, 1.0, L / 8 - 0.2, k % 2 ? '#2b5fb8' : '#2452a3', { pos: [sx(X0 + 2.4), 0.5, z], jitter: 0.02 });
    b.box(0.6, 0.14, L / 8 - 0.16, '#e9c25a', { pos: [sx(X0 + 2.4), 1.07, z] });
    // palmeta dourada
    for (let s = -1; s <= 1; s++) b.box(0.06, 0.26 - Math.abs(s) * 0.08, 0.08, '#f2d36b', { pos: [sx(X0 + 2.66), 0.6 + Math.abs(s) * 0.02, z + s * 0.12], rot: [s * 0.35, 0, 0] });
  }
  // jardineiras com flores e arbustos recortados
  for (let i = 0; i < 4; i++) {
    const z = -L / 2 + 3 + i * 6 + rng.range(-1, 1);
    b.box(1.1, 0.45, 0.9, p.stoneLight, { pos: [sx(X0 + 0.9), 0.22, z] });
    b.box(0.95, 0.1, 0.75, '#5a3a1e', { pos: [sx(X0 + 0.9), 0.47, z] });
    if ((i + v) % 2) b.sphere(0.42, 8, 6, p.leaf, { pos: [sx(X0 + 0.9), 0.85, z] });
    else {
      b.cone(0.4, 0.9, 7, p.leafDark, { pos: [sx(X0 + 0.9), 0.95, z] });
      for (let f = 0; f < 5; f++) b.sphere(0.06, 4, 3, f % 2 ? '#ff7eb3' : '#ffd23f', { pos: [sx(X0 + 0.9 + Math.cos(f * 1.3) * 0.25), 0.75 + f * 0.04, z + Math.sin(f * 1.3) * 0.25] });
    }
  }
  // tocha de pé
  const tz = v % 2 ? L / 3 : -L / 3;
  b.cyl(0.08, 0.12, 1.8, 6, '#3a2414', { pos: [sx(X0 + 1.7), 0.9, tz] });
  b.cyl(0.22, 0.14, 0.3, 6, '#e9c25a', { pos: [sx(X0 + 1.7), 1.9, tz] });
  b.cone(0.16, 0.5, 6, '#ff9a2e', { pos: [sx(X0 + 1.7), 2.25, tz] });
  b.cone(0.08, 0.3, 5, '#ffe36b', { pos: [sx(X0 + 1.7), 2.3, tz] });
}
