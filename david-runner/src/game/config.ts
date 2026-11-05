// Constantes globais de jogabilidade. 1 unidade = 1 metro.

export const LANE_WIDTH = 2.3;
export const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH] as const;
export const ROAD_HALF_WIDTH = LANE_WIDTH * 1.5 + 0.25;

export const START_SPEED = 13;
export const MAX_SPEED = 31;
/** Distância (m) em que a velocidade atinge ~63% do ganho total. */
export const SPEED_RAMP_DISTANCE = 2600;

export const GRAVITY = 52;
export const JUMP_VELOCITY = 15.5; // apogeu ≈ 2,3 m, tempo no ar ≈ 0,6 s
export const FAST_FALL_VELOCITY = -34;
export const SLIDE_DURATION = 0.68;
export const LANE_CHANGE_TIME = 0.14;

export const PLAYER_HALF_WIDTH = 0.34;
export const PLAYER_HALF_DEPTH = 0.32;
export const PLAYER_HEIGHT = 1.75;
export const PLAYER_SLIDE_HEIGHT = 0.8;

/** Até onde a pista é gerada à frente do jogador. */
export const SPAWN_AHEAD = 150;
/** Quanto atrás do jogador os objetos são reciclados. */
export const DESPAWN_BEHIND = 14;

export const SEGMENT_LENGTH = 24;

export const OBSTACLE_HEIGHT = {
  low: 1.0,
  highBottom: 1.15,
  highTop: 2.7,
  block: 2.7,
} as const;

export function speedForDistance(distance: number): number {
  return START_SPEED + (MAX_SPEED - START_SPEED) * (1 - Math.exp(-distance / SPEED_RAMP_DISTANCE));
}

export function difficultyForDistance(distance: number): number {
  return Math.min(1, distance / 4500);
}
