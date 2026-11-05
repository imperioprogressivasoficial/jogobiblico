/**
 * Carruagem de Fogo — poder especial ativado com dois toques na tela.
 * Inspirada em Elias: “eis que um carro de fogo, com cavalos de fogo...” (2 Reis 2:11).
 */
export const CHARIOT = {
  name: 'Carruagem de Fogo',
  icon: '🔥',
  reference: '2 Reis 2:11',
  /** Cargas com que todo jogador começa. */
  startCharges: 3,
  /** Preço de uma carga na loja. */
  chargeCost: 250,
  /** Limite de cargas guardadas. */
  maxCharges: 99,
  /** Duração (s) sem melhorias e ganho por nível de melhoria. */
  baseDuration: 8,
  perLevel: 1.2,
  /** Preço de cada nível de melhoria de duração (5 níveis: 8 s → 14 s). */
  upgradeCosts: [600, 1200, 2200, 3600, 5500],
  /** Multiplicador de velocidade enquanto ativa. */
  speedMultiplier: 1.5,
  /** Proteção extra (s) depois que o poder acaba, enquanto desacelera. */
  tailProtection: 1.5,
} as const;

export function chariotDuration(level: number): number {
  return Math.round((CHARIOT.baseDuration + CHARIOT.perLevel * level) * 10) / 10;
}

/** Escalas de velocidade de cada dificuldade (o motor usa 1 = Normal por padrão). */
export const DIFFICULTY = {
  crianca: { label: 'Criança', speedScale: 0.82, rampScale: 1.4 },
  normal: { label: 'Normal', speedScale: 1, rampScale: 1 },
} as const;

export type Difficulty = keyof typeof DIFFICULTY;
