/** Estatísticas e pontuação de uma corrida. */
export interface RunStats {
  mapId: string;
  characterId: string;
  distance: number;
  score: number;
  coins: number;
  scrolls: number;
  relics: number;
  powerups: number;
  jumps: number;
  slides: number;
  laneChanges: number;
  stumbles: number;
  time: number;
  baseMultiplier: number;
  revived: boolean;
}

export function emptyRun(mapId: string, characterId: string, baseMultiplier: number): RunStats {
  return {
    mapId,
    characterId,
    distance: 0,
    score: 0,
    coins: 0,
    scrolls: 0,
    relics: 0,
    powerups: 0,
    jumps: 0,
    slides: 0,
    laneChanges: 0,
    stumbles: 0,
    time: 0,
    baseMultiplier,
    revived: false,
  };
}

export class ScoreManager {
  run: RunStats = emptyRun('jerusalem', 'davi', 1);
  /** Multiplicador temporário da Harpa Dourada. */
  doubleActive = false;

  start(mapId: string, characterId: string, baseMultiplier: number): void {
    this.run = emptyRun(mapId, characterId, baseMultiplier);
    this.doubleActive = false;
  }

  get multiplier(): number {
    return this.run.baseMultiplier * (this.doubleActive ? 2 : 1);
  }

  addDistance(dd: number, dt: number): void {
    this.run.distance += dd;
    this.run.time += dt;
    this.run.score += dd * this.multiplier;
  }

  addBonus(points: number): void {
    this.run.score += points * this.multiplier;
  }
}
