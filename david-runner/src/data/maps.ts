import type { VergeKind } from '../game/scenery/verge';
import type { ObstacleCatalog } from '../game/TrackGenerator';
import type { Palette } from '../game/models/props';

export type GroundPattern = 'cobble' | 'slabs' | 'sand' | 'dirt' | 'bricks';

export interface MapTheme {
  palette: Palette;
  skyTop: string;
  skyBottom: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  sun: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  road: { pattern: GroundPattern; base: string; stones: string[]; grout: string };
  side: { base: string; speckles: string[] };
  curb: string;
  sideProps: { id: string; weight: number }[];
  catalog: ObstacleCatalog;
  backdrop: string;
  /** Faixa de cenário colada ao meio-fio (ver game/scenery/verge.ts). */
  verge: VergeKind;
  bunting: boolean;
}

export type MapUnlock = { type: 'free' } | { type: 'distanceIn'; map: string; meters: number; coins: number };

export interface MapDef {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  unlock: MapUnlock;
  /** Gradiente usado nos cartões do menu. */
  cardGradient: string;
  emoji: string;
  theme: MapTheme;
}

const commonLow = [
  { id: 'vaso', length: 0.95 },
  { id: 'caixa', length: 0.95 },
];

export const MAPS: MapDef[] = [
  {
    id: 'jerusalem',
    name: 'Jerusalém',
    subtitle: 'A Cidade de Davi',
    description: 'Ruas de pedra, mercados movimentados, carroças e ovelhas pelo caminho.',
    unlock: { type: 'free' },
    cardGradient: 'linear-gradient(160deg,#ffd98a 0%,#e9a85a 55%,#b86b34 100%)',
    emoji: '🏰',
    theme: {
      palette: {
        stone: '#c9a77a',
        stoneDark: '#a8865c',
        stoneLight: '#ecd7ae',
        wood: '#a8703f',
        woodDark: '#6e4424',
        clay: '#c8693a',
        clayDark: '#a24f28',
        cloth: ['#d8392b', '#f6efe0', '#2f7fc1'],
        leaf: '#7fae4a',
        leafDark: '#5f8f35',
        trunk: '#7a5232',
        sand: '#e7cf9c',
        accent: '#2f7fc1',
        gold: '#f2c13a',
        wool: '#f6f1e6',
      },
      skyTop: '#3d9be9',
      skyBottom: '#cfeeff',
      fog: '#f2e2c0',
      fogNear: 60,
      fogFar: 175,
      sun: '#fff1d6',
      sunIntensity: 2.3,
      hemiSky: '#cfe9ff',
      hemiGround: '#c9a77a',
      road: { pattern: 'cobble', base: '#b08a5e', stones: ['#d9bb8c', '#cfae7f', '#e3c79b', '#c4a172'], grout: '#8a6a45' },
      side: { base: '#d9be8c', speckles: ['#c9ab78', '#e6cfa2'] },
      curb: '#bfa070',
      sideProps: [
        { id: 'casa', weight: 4 },
        { id: 'casa_alta', weight: 3 },
        { id: 'mercado', weight: 3 },
        { id: 'torre', weight: 1 },
        { id: 'oliveira', weight: 2 },
        { id: 'palmeira', weight: 2 },
        { id: 'jarros', weight: 2 },
        { id: 'poco', weight: 1 },
      ],
      catalog: {
        low: [...commonLow, { id: 'cesto', length: 1.0 }],
        high: [{ id: 'barreira', length: 0.4 }],
        block: [{ id: 'barraca', length: 2.1 }],
        fullLow: [{ id: 'tronco', length: 0.9 }],
        fullHigh: [{ id: 'portao', length: 0.6 }],
        animal: [{ id: 'ovelha', length: 0.9 }],
        trainCar: { id: 'carroca', length: 3.5 },
      },
      backdrop: 'jerusalem',
      verge: 'cidade',
      bunting: true,
    },
  },
  {
    id: 'deserto',
    name: 'Deserto',
    subtitle: 'Peregrinação no deserto',
    description: 'Dunas douradas, rochas, cactos e ruínas antigas sob o sol escaldante.',
    unlock: { type: 'distanceIn', map: 'jerusalem', meters: 1000, coins: 1500 },
    cardGradient: 'linear-gradient(160deg,#ffe3a3 0%,#f2b155 50%,#c4703a 100%)',
    emoji: '🏜️',
    theme: {
      palette: {
        stone: '#c98f5a',
        stoneDark: '#a8703f',
        stoneLight: '#e7c08a',
        wood: '#a8703f',
        woodDark: '#6e4424',
        clay: '#c8693a',
        clayDark: '#9a4a25',
        cloth: ['#c43a2b', '#f2d08a', '#7a4a2a'],
        leaf: '#6aa04a',
        leafDark: '#4f8a3a',
        trunk: '#8a6440',
        sand: '#efcf8f',
        accent: '#c43a2b',
        gold: '#f2c13a',
        wool: '#efe6d2',
      },
      skyTop: '#4aa6e8',
      skyBottom: '#ffe9bf',
      fog: '#f7dcaa',
      fogNear: 55,
      fogFar: 170,
      sun: '#fff0c8',
      sunIntensity: 2.6,
      hemiSky: '#ffeccc',
      hemiGround: '#d9a35f',
      road: { pattern: 'sand', base: '#d9b072', stones: ['#e6c38a', '#cfa264', '#c99a5c'], grout: '#b98a50' },
      side: { base: '#efcf8f', speckles: ['#e2bd7a', '#f6dca6'] },
      curb: '#c99a5c',
      sideProps: [
        { id: 'duna', weight: 4 },
        { id: 'cacto', weight: 3 },
        { id: 'rochas', weight: 3 },
        { id: 'colunas', weight: 2 },
        { id: 'arvore_seca', weight: 2 },
        { id: 'tenda_beduina', weight: 2 },
        { id: 'palmeira', weight: 1 },
      ],
      catalog: {
        low: [{ id: 'pedra', length: 1.2 }, { id: 'vaso', length: 0.95 }, { id: 'caixa', length: 0.95 }],
        high: [{ id: 'barreira', length: 0.4 }],
        block: [{ id: 'rocha_grande', length: 2.4 }, { id: 'ruina', length: 1.0 }],
        fullLow: [{ id: 'tronco', length: 0.9 }, { id: 'coluna_caida', length: 1.1 }],
        fullHigh: [{ id: 'portao', length: 0.6 }],
        animal: [{ id: 'cabra', length: 0.9 }],
        trainCar: { id: 'carroca', length: 3.5 },
      },
      backdrop: 'deserto',
      verge: 'deserto',
      bunting: false,
    },
  },
  {
    id: 'vale',
    name: 'Vale de Elá',
    subtitle: 'Onde Davi enfrentou Golias',
    description: 'Campos verdes, montanhas, riachos e os acampamentos dos dois exércitos.',
    unlock: { type: 'distanceIn', map: 'deserto', meters: 1500, coins: 3000 },
    cardGradient: 'linear-gradient(160deg,#c9f2a0 0%,#6fbf5a 55%,#2f7a45 100%)',
    emoji: '⛰️',
    theme: {
      palette: {
        stone: '#a9a49a',
        stoneDark: '#87827a',
        stoneLight: '#cfcac0',
        wood: '#9a6a3a',
        woodDark: '#5e3e22',
        clay: '#b8693a',
        clayDark: '#94502b',
        cloth: ['#c43a2b', '#f2e6c8', '#8a6a45'],
        leaf: '#6fbf4a',
        leafDark: '#4f9a3a',
        trunk: '#6e4a2a',
        sand: '#c9b88a',
        accent: '#3f7fc1',
        gold: '#f2c13a',
        wool: '#f6f1e6',
      },
      skyTop: '#2f8fe0',
      skyBottom: '#d8f2ff',
      fog: '#d6ecd0',
      fogNear: 60,
      fogFar: 175,
      sun: '#fff6e0',
      sunIntensity: 2.2,
      hemiSky: '#d8f0ff',
      hemiGround: '#6f9a4a',
      road: { pattern: 'dirt', base: '#a8865c', stones: ['#b8966a', '#9a7a52', '#c4a478'], grout: '#8a6a45' },
      side: { base: '#7cc456', speckles: ['#6ab048', '#92d468', '#5ea040'] },
      curb: '#8f8a7e',
      sideProps: [
        { id: 'arvore', weight: 4 },
        { id: 'pinheiro', weight: 2 },
        { id: 'arbustos', weight: 3 },
        { id: 'rochas', weight: 2 },
        { id: 'rebanho', weight: 2 },
        { id: 'acampamento', weight: 2 },
      ],
      catalog: {
        low: [{ id: 'pedra', length: 1.2 }, { id: 'tronco_curto', length: 0.85 }, { id: 'cesto', length: 1.0 }],
        high: [{ id: 'lancas', length: 0.4 }, { id: 'barreira', length: 0.4 }],
        block: [{ id: 'tenda', length: 1.9 }, { id: 'rocha_grande', length: 2.4 }],
        fullLow: [{ id: 'tronco', length: 0.9 }],
        fullHigh: [{ id: 'portao', length: 0.6 }],
        animal: [{ id: 'ovelha', length: 0.9 }],
        trainCar: { id: 'carroca', length: 3.5 },
      },
      backdrop: 'vale',
      verge: 'campo',
      bunting: false,
    },
  },
  {
    id: 'egito',
    name: 'Egito',
    subtitle: 'A terra dos faraós',
    description: 'Templos, obeliscos, esfinges e ruas de areia às margens do Nilo.',
    unlock: { type: 'distanceIn', map: 'vale', meters: 2000, coins: 5000 },
    cardGradient: 'linear-gradient(160deg,#fff0b0 0%,#e9c46a 50%,#2f8fb0 100%)',
    emoji: '🔺',
    theme: {
      palette: {
        stone: '#e0c08a',
        stoneDark: '#c4a06a',
        stoneLight: '#f2dcae',
        wood: '#a8703f',
        woodDark: '#6e4424',
        clay: '#c8693a',
        clayDark: '#a24f28',
        cloth: ['#2f6fc1', '#f2e6c8', '#e2b23a'],
        leaf: '#6fae4a',
        leafDark: '#4f8f35',
        trunk: '#8a6440',
        sand: '#ecd096',
        accent: '#2f6fc1',
        gold: '#f2c13a',
        wool: '#f6f1e6',
      },
      skyTop: '#3a9ae6',
      skyBottom: '#fff3cf',
      fog: '#f6e2b4',
      fogNear: 55,
      fogFar: 170,
      sun: '#fff0cc',
      sunIntensity: 2.5,
      hemiSky: '#fff1d0',
      hemiGround: '#d9b072',
      road: { pattern: 'slabs', base: '#c9a46a', stones: ['#e6cd98', '#dcc08a', '#efd8a8'], grout: '#a8865c' },
      side: { base: '#ecd096', speckles: ['#dfbf80', '#f4dca8'] },
      curb: '#c4a06a',
      sideProps: [
        { id: 'obelisco', weight: 3 },
        { id: 'templo', weight: 2 },
        { id: 'esfinge', weight: 2 },
        { id: 'palmeira', weight: 3 },
        { id: 'papiro', weight: 2 },
        { id: 'casa_egipcia', weight: 3 },
      ],
      catalog: {
        low: [...commonLow, { id: 'bloco', length: 1.0 }],
        high: [{ id: 'barreira', length: 0.4 }],
        block: [{ id: 'estatua', length: 1.6 }],
        fullLow: [{ id: 'coluna_caida', length: 1.1 }],
        fullHigh: [{ id: 'portao_egipcio', length: 0.9 }],
        animal: [{ id: 'cabra', length: 0.9 }],
        trainCar: { id: 'carroca', length: 3.5 },
      },
      backdrop: 'egito',
      verge: 'nilo',
      bunting: false,
    },
  },
  {
    id: 'babilonia',
    name: 'Babilônia',
    subtitle: 'O império dos portões azuis',
    description: 'Portões monumentais de tijolos azuis, leões dourados e jardins em terraços.',
    unlock: { type: 'distanceIn', map: 'egito', meters: 2500, coins: 8000 },
    cardGradient: 'linear-gradient(160deg,#a8d8ff 0%,#2f6fc1 55%,#1f3f8a 100%)',
    emoji: '🦁',
    theme: {
      palette: {
        stone: '#d8c09a',
        stoneDark: '#b8a07a',
        stoneLight: '#efe0c0',
        wood: '#a8703f',
        woodDark: '#6e4424',
        clay: '#c8693a',
        clayDark: '#a24f28',
        cloth: ['#2f5fb8', '#f2c13a', '#c43a2b'],
        leaf: '#5fae4a',
        leafDark: '#3f8a35',
        trunk: '#7a5232',
        sand: '#e3c99a',
        accent: '#2f5fb8',
        gold: '#f2c13a',
        wool: '#f6f1e6',
      },
      skyTop: '#2f7fd8',
      skyBottom: '#ffd9b0',
      fog: '#f2d6b4',
      fogNear: 60,
      fogFar: 175,
      sun: '#ffe2bf',
      sunIntensity: 2.4,
      hemiSky: '#ffe8d0',
      hemiGround: '#b8a07a',
      road: { pattern: 'bricks', base: '#b8a07a', stones: ['#e6d4b0', '#dcc6a0', '#efe0c0'], grout: '#9a8460' },
      side: { base: '#d9c49a', speckles: ['#c9b080', '#e6d4ae'] },
      curb: '#2f5fb8',
      sideProps: [
        { id: 'muralha_azul', weight: 4 },
        { id: 'jardim', weight: 3 },
        { id: 'torre_azul', weight: 2 },
        { id: 'palmeira', weight: 3 },
        { id: 'jarros', weight: 1 },
      ],
      catalog: {
        low: [...commonLow, { id: 'cesto', length: 1.0 }],
        high: [{ id: 'barreira', length: 0.4 }],
        block: [{ id: 'leao', length: 2.2 }, { id: 'barraca', length: 2.1 }],
        fullLow: [{ id: 'muro_baixo', length: 0.9 }],
        fullHigh: [{ id: 'portao_azul', length: 0.9 }],
        animal: [{ id: 'ovelha', length: 0.9 }],
        trainCar: { id: 'carroca', length: 3.5 },
      },
      backdrop: 'babilonia',
      verge: 'babilonia',
      bunting: true,
    },
  },
];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}
