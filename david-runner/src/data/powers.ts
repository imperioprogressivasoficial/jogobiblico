import { CHARIOT } from './chariot';

/**
 * PODERES — relíquias bíblicas que o jogador equipa (uma por vez) e ativa com dois toques
 * na tela, tecla E ou o botão do HUD. Cada uma tem um efeito diferente.
 */
export type PowerId = 'chariot' | 'funda' | 'cajado' | 'manto' | 'harpa' | 'sansao';

export interface PowerEffects {
  /** Multiplicador de velocidade enquanto ativo. */
  speedMul: number;
  /** Nada bate no herói enquanto ativo. */
  invincible: boolean;
  /** Obstáculos atravessados explodem (dá pontos). */
  smash: boolean;
  /** Obstáculos à frente na pista do herói se afastam para os lados. */
  part: boolean;
  /** Atrai as moedas. */
  magnet: boolean;
  /** Moedas valem o dobro e a pontuação dobra. */
  doubleCoins: boolean;
  /** Uso instantâneo: lança uma pedra que destrói o obstáculo à frente. */
  stone: boolean;
}

export type PowerUnlock = { type: 'free' } | { type: 'story'; storyId: string; storyTitle: string; coins: number };

export interface PowerDef {
  id: PowerId;
  name: string;
  icon: string;
  reference: string;
  quote: string;
  /** O que faz, em linguagem de criança. */
  description: string;
  /** Cor do HUD/efeitos (hex CSS). */
  color: string;
  /** Cor dos efeitos 3D. */
  glow: number;
  kind: 'timed' | 'instant';
  baseDuration: number;
  perLevel: number;
  upgradeCosts: number[];
  chargeCost: number;
  startCharges: number;
  /** Cargas ganhas ao desbloquear. */
  unlockCharges: number;
  unlock: PowerUnlock;
  effects: PowerEffects;
  /** Nome da carga ("carga", "pedra"). */
  chargeName: [string, string];
}

const NONE: PowerEffects = { speedMul: 1, invincible: false, smash: false, part: false, magnet: false, doubleCoins: false, stone: false };

export const POWERS: PowerDef[] = [
  {
    id: 'chariot',
    name: CHARIOT.name,
    icon: CHARIOT.icon,
    reference: CHARIOT.reference,
    quote: 'Eis que um carro de fogo, com cavalos de fogo, os separou um do outro; e Elias subiu ao céu num redemoinho.',
    description: 'Você corre muito mais rápido, fica invencível e atravessa tudo pelo caminho!',
    color: '#ff8a1e',
    glow: 0xff8a1e,
    kind: 'timed',
    baseDuration: CHARIOT.baseDuration,
    perLevel: CHARIOT.perLevel,
    upgradeCosts: [...CHARIOT.upgradeCosts],
    chargeCost: CHARIOT.chargeCost,
    startCharges: CHARIOT.startCharges,
    unlockCharges: 0,
    unlock: { type: 'free' },
    effects: { ...NONE, speedMul: CHARIOT.speedMultiplier, invincible: true, smash: true, magnet: true },
    chargeName: ['carga', 'cargas'],
  },
  {
    id: 'funda',
    name: 'Funda de Davi',
    icon: '🪨',
    reference: '1 Samuel 17:49',
    quote: 'Davi meteu a mão no alforje, tirou dali uma pedra, atirou-a com a funda e feriu o filisteu na testa.',
    description: 'Cada toque duplo lança uma pedra que destrói o obstáculo à sua frente. Mire bem!',
    color: '#8fa3b8',
    glow: 0xcfd9e6,
    kind: 'instant',
    baseDuration: 0,
    perLevel: 0,
    upgradeCosts: [],
    chargeCost: 60,
    startCharges: 5,
    unlockCharges: 0,
    unlock: { type: 'free' },
    effects: { ...NONE, stone: true },
    chargeName: ['pedra', 'pedras'],
  },
  {
    id: 'cajado',
    name: 'Cajado de Moisés',
    icon: '🪄',
    reference: 'Êxodo 14:16',
    quote: 'Levanta o teu cajado, estende a mão sobre o mar e divide-o, para que os filhos de Israel passem pelo meio do mar em seco.',
    description: 'Os obstáculos à sua frente se abrem para os lados, como o mar se abriu. Caminho livre!',
    color: '#38bdf8',
    glow: 0x7dd3fc,
    kind: 'timed',
    baseDuration: 7,
    perLevel: 1,
    upgradeCosts: [500, 1000, 1800, 3000, 4500],
    chargeCost: 220,
    startCharges: 0,
    unlockCharges: 2,
    unlock: { type: 'story', storyId: 'mar-vermelho', storyTitle: 'A travessia do Mar Vermelho', coins: 1200 },
    effects: { ...NONE, part: true },
    chargeName: ['carga', 'cargas'],
  },
  {
    id: 'manto',
    name: 'Manto de Elias',
    icon: '🧥',
    reference: '2 Reis 2:13-14',
    quote: 'Eliseu levantou a capa de Elias, que lhe caíra, e feriu as águas, e elas se dividiram.',
    description: 'O manto te envolve numa proteção: nada consegue te derrubar enquanto ele brilha.',
    color: '#a78bfa',
    glow: 0xc4b5fd,
    kind: 'timed',
    baseDuration: 6,
    perLevel: 1,
    upgradeCosts: [500, 1000, 1800, 3000, 4500],
    chargeCost: 220,
    startCharges: 0,
    unlockCharges: 2,
    unlock: { type: 'story', storyId: 'carruagem-fogo', storyTitle: 'Elias e a carruagem de fogo', coins: 1200 },
    effects: { ...NONE, invincible: true },
    chargeName: ['carga', 'cargas'],
  },
  {
    id: 'harpa',
    name: 'Harpa de Davi',
    icon: '🎵',
    reference: '1 Samuel 16:23',
    quote: 'Davi tomava a harpa e a tocava; então Saul sentia alívio e ficava bom.',
    description: 'A música atrai todas as moedas e cada uma vale o dobro. Pontuação em dobro também!',
    color: '#facc15',
    glow: 0xfde68a,
    kind: 'timed',
    baseDuration: 10,
    perLevel: 1.5,
    upgradeCosts: [500, 1000, 1800, 3000, 4500],
    chargeCost: 200,
    startCharges: 0,
    unlockCharges: 2,
    unlock: { type: 'story', storyId: 'davi-ungido', storyTitle: 'Davi, o pastor escolhido', coins: 1000 },
    effects: { ...NONE, magnet: true, doubleCoins: true },
    chargeName: ['carga', 'cargas'],
  },
  {
    id: 'sansao',
    name: 'Força de Sansão',
    icon: '💪',
    reference: 'Juízes 16:28',
    quote: 'Senhor Deus, lembra-te de mim e fortalece-me só mais esta vez.',
    description: 'Força de gigante: você derruba os obstáculos com as mãos e ganha pontos por cada um!',
    color: '#f97316',
    glow: 0xfb923c,
    kind: 'timed',
    baseDuration: 7,
    perLevel: 1,
    upgradeCosts: [600, 1200, 2200, 3600, 5500],
    chargeCost: 250,
    startCharges: 0,
    unlockCharges: 2,
    unlock: { type: 'story', storyId: 'sansao', storyTitle: 'A força de Sansão', coins: 1500 },
    effects: { ...NONE, invincible: true, smash: true },
    chargeName: ['carga', 'cargas'],
  },
];

export const POWER_IDS = POWERS.map((p) => p.id);
export const MAX_CHARGES = CHARIOT.maxCharges;

export function getPower(id: string): PowerDef {
  return POWERS.find((p) => p.id === id) ?? POWERS[0];
}

export function powerDuration(def: PowerDef, level: number): number {
  return Math.round((def.baseDuration + def.perLevel * level) * 10) / 10;
}
