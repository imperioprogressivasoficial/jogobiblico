import { difficultyForDistance } from './config';
import { Rng } from './rng';

/**
 * Gerador procedural da pista — lógica pura (sem Three.js), testável isoladamente.
 *
 * A pista é gerada em "fileiras". Cada fileira tem uma PISTA SEGURA, que sempre é
 * superável (vazia, pulável ou deslizável). A pista segura só muda no máximo uma
 * pista por fileira e nunca entra numa pista bloqueada por um comboio de carroças,
 * o que garante que sempre existe um caminho possível para o jogador.
 */

export type ObstacleKind = 'low' | 'high' | 'block' | 'animal';
export type RowAction = 'none' | 'jump' | 'slide';

export interface ObstacleSpec {
  kind: ObstacleKind;
  variant: string;
  /** 0..2, ou -1 quando ocupa as três pistas. */
  lane: number;
  /** Distância da borda mais próxima do obstáculo, em metros de pista. */
  d: number;
  length: number;
  fullWidth: boolean;
}

export type CollectibleType = 'coin' | 'scroll' | 'relic' | 'magnet' | 'double' | 'shield';

export interface CollectibleSpec {
  type: CollectibleType;
  lane: number;
  d: number;
  y: number;
}

export interface RowPlan {
  d: number;
  end: number;
  safeLane: number;
  action: RowAction;
  pattern: Pattern;
  /** Tipo de obstáculo por pista nesta fileira (null = livre). */
  lanes: (ObstacleKind | 'train' | null)[];
}

export interface VariantDef {
  id: string;
  length: number;
}

export interface ObstacleCatalog {
  low: VariantDef[];
  high: VariantDef[];
  block: VariantDef[];
  fullLow: VariantDef[];
  fullHigh: VariantDef[];
  animal: VariantDef[];
  trainCar: VariantDef;
}

export interface GeneratorSink {
  obstacle(o: ObstacleSpec): void;
  collectible(c: CollectibleSpec): void;
}

export type Pattern =
  | 'breather'
  | 'single'
  | 'double'
  | 'triple'
  | 'fullLow'
  | 'fullHigh'
  | 'train'
  | 'animal';

const LANES = [0, 1, 2];
const COIN_SPACING = 2.4;
const COIN_Y = 0.95;

export class TrackGenerator {
  readonly rows: RowPlan[] = [];
  private cursor: number;
  private prevEnd: number;
  private safeLane = 1;
  private blockedUntil = [-Infinity, -Infinity, -Infinity];
  private nextScroll: number;
  private nextPower: number;
  private nextRelic: number;
  private powerCycle: CollectibleType[] = ['magnet', 'double', 'shield'];

  constructor(
    private readonly catalog: ObstacleCatalog,
    private readonly rng: Rng,
    private readonly sink: GeneratorSink,
    startDistance = 55,
  ) {
    this.cursor = startDistance;
    this.prevEnd = 8;
    // o primeiro pergaminho vem cedo: a primeira corrida já revela uma história
    this.nextScroll = rng.range(110, 150);
    this.nextPower = rng.range(160, 260);
    this.nextRelic = rng.range(900, 1500);
  }

  /** Gera fileiras até que o cursor ultrapasse `target`. */
  generateUntil(target: number, speedAt: (d: number) => number): void {
    let guard = 0;
    while (this.cursor < target && guard++ < 200) {
      this.emitRow(speedAt(this.cursor));
    }
  }

  /** Remove fileiras já ultrapassadas (memória constante). */
  prune(distance: number): void {
    while (this.rows.length && this.rows[0].end < distance - 30) this.rows.shift();
  }

  /** Remove o planejamento à frente (usado ao reviver) e recomeça a partir de `d`. */
  restartAt(d: number): void {
    this.cursor = d;
    this.prevEnd = d - 12;
    this.blockedUntil = [-Infinity, -Infinity, -Infinity];
    while (this.rows.length && this.rows[this.rows.length - 1].d >= d - 40) this.rows.pop();
  }

  private laneFree(lane: number, d: number, speed: number): boolean {
    return this.blockedUntil[lane] + speed * 0.45 + 1.5 < d;
  }

  private emitRow(speed: number): void {
    const rng = this.rng;
    const d = this.cursor;
    const diff = difficultyForDistance(d);

    // 1) Pista segura: no máximo uma troca de pista por fileira.
    const prev = this.safeLane;
    const candidates = [prev - 1, prev, prev + 1].filter(
      (l) => l >= 0 && l <= 2 && this.laneFree(l, d, speed),
    );
    let safe = prev;
    const moves = candidates.filter((l) => l !== prev);
    if (moves.length && rng.chance(0.5)) safe = rng.pick(moves);
    this.safeLane = safe;

    const freeLanes = LANES.filter((l) => this.laneFree(l, d, speed));
    const allFree = freeLanes.length === 3;

    // 2) Padrão da fileira, com pesos que variam pela dificuldade.
    let pattern: Pattern = rng.weighted<Pattern>({
      breather: 0.1 - diff * 0.05,
      single: 0.3 - diff * 0.16,
      double: 0.24,
      triple: 0.08 + diff * 0.16,
      fullLow: 0.055,
      fullHigh: 0.055,
      train: 0.07 + diff * 0.09,
      animal: 0.045,
    });
    if (d < 120 && (pattern === 'train' || pattern === 'triple')) pattern = 'single';
    if ((pattern === 'fullLow' || pattern === 'fullHigh' || pattern === 'animal') && !allFree) pattern = 'double';
    const nonSafeFree = freeLanes.filter((l) => l !== safe);
    if (pattern === 'train' && nonSafeFree.length === 0) pattern = 'single';

    const laneKinds: (ObstacleKind | 'train' | null)[] = [null, null, null];
    for (let l = 0; l < 3; l++) if (!this.laneFree(l, d, speed)) laneKinds[l] = 'train';

    let rowLen = 0.6;
    const place = (kind: ObstacleKind, lane: number, variant?: VariantDef, full = false) => {
      const list =
        kind === 'low' ? this.catalog.low : kind === 'high' ? this.catalog.high : kind === 'block' ? this.catalog.block : this.catalog.animal;
      const v = variant ?? rng.pick(list);
      this.sink.obstacle({ kind, variant: v.id, lane: full ? -1 : lane, d, length: v.length, fullWidth: full });
      rowLen = Math.max(rowLen, v.length);
      if (full) {
        laneKinds[0] = laneKinds[1] = laneKinds[2] = kind;
      } else {
        laneKinds[lane] = kind;
      }
    };
    const passableKind = (): ObstacleKind => (rng.chance(0.55) ? 'low' : 'high');
    const anyKind = (): ObstacleKind => {
      const r = rng.next();
      if (r < 0.45 + diff * 0.15) return 'block';
      return r < 0.75 ? 'low' : 'high';
    };

    let action: RowAction = 'none';

    switch (pattern) {
      case 'breather':
        break;
      case 'single': {
        const lane = rng.pick(freeLanes);
        const kind = lane === safe ? passableKind() : anyKind();
        place(kind, lane);
        break;
      }
      case 'double': {
        const others = rng.chance(0.5) ? nonSafeFree : [...nonSafeFree].reverse();
        for (const lane of others.slice(0, 2)) place(rng.chance(0.7) ? 'block' : anyKind(), lane);
        if (rng.chance(0.25 + diff * 0.35)) place(passableKind(), safe);
        break;
      }
      case 'triple': {
        for (const lane of nonSafeFree) place(anyKind(), lane);
        place(passableKind(), safe);
        break;
      }
      case 'fullLow':
        place('low', 0, rng.pick(this.catalog.fullLow), true);
        break;
      case 'fullHigh':
        place('high', 0, rng.pick(this.catalog.fullHigh), true);
        break;
      case 'animal': {
        const v = rng.pick(this.catalog.animal);
        // O animal atravessa a pista: pode ser evitado pulando em qualquer pista.
        this.sink.obstacle({ kind: 'animal', variant: v.id, lane: rng.pick([0, 2]), d, length: v.length, fullWidth: false });
        laneKinds[0] = laneKinds[1] = laneKinds[2] = 'animal';
        rowLen = v.length;
        break;
      }
      case 'train': {
        const lane = rng.pick(nonSafeFree);
        const cars = rng.int(2, 2 + Math.round(diff * 2));
        const car = this.catalog.trainCar;
        let cd = d;
        for (let i = 0; i < cars; i++) {
          this.sink.obstacle({ kind: 'block', variant: car.id, lane, d: cd, length: car.length, fullWidth: false });
          cd += car.length + 0.25;
        }
        this.blockedUntil[lane] = cd;
        laneKinds[lane] = 'train';
        rowLen = Math.max(rowLen, car.length);
        const rest = nonSafeFree.filter((l) => l !== lane);
        if (rest.length && rng.chance(0.4 + diff * 0.3)) place('block', rest[0]);
        if (rng.chance(0.2 + diff * 0.3)) place(passableKind(), safe);
        break;
      }
    }

    const safeKind = laneKinds[safe];
    if (safeKind === 'low' || safeKind === 'animal') action = 'jump';
    else if (safeKind === 'high') action = 'slide';

    // 3) Moedas no trecho que leva até esta fileira, na pista segura.
    this.placeSegmentCollectibles(this.prevEnd, d, rowLen, safe, action, speed, pattern);

    const end = d + rowLen;
    this.rows.push({ d, end, safeLane: safe, action, pattern, lanes: laneKinds });

    // 4) Intervalo até a próxima fileira (sempre deixa tempo de reação).
    const gapTime = (1.18 - diff * 0.38) * rng.range(1, 1.4);
    const gap = Math.max(speed * gapTime, 4.2 + speed * 0.55);
    this.prevEnd = end;
    this.cursor = end + gap;
  }

  private placeSegmentCollectibles(
    from: number,
    rowD: number,
    rowLen: number,
    lane: number,
    action: RowAction,
    speed: number,
    pattern: Pattern,
  ): void {
    const rng = this.rng;
    // Nunca coloca itens sobre um comboio que ainda ocupe esta pista.
    const start = Math.max(from + 1.6, this.blockedUntil[lane] + 1.5);
    let lineEnd = rowD - 1.2;
    const hasCoins = pattern === 'breather' || rng.chance(0.68);
    const arcHalf = speed * 0.27;

    if (action === 'jump') lineEnd = rowD - arcHalf - 0.5;
    if (action === 'slide') lineEnd = rowD + rowLen + 1.5;

    const mid = (start + Math.min(lineEnd, rowD - 1)) / 2;
    let specialPlaced = false;
    const trySpecial = (): CollectibleType | null => {
      if (lineEnd - start < 4) return null;
      if (mid >= this.nextRelic) {
        this.nextRelic = mid + this.rng.range(1100, 1900);
        return 'relic';
      }
      if (mid >= this.nextScroll) {
        this.nextScroll = mid + this.rng.range(250, 420);
        return 'scroll';
      }
      if (mid >= this.nextPower) {
        this.nextPower = mid + this.rng.range(230, 420);
        const t = this.powerCycle.shift()!;
        this.powerCycle.push(t);
        return t;
      }
      return null;
    };
    const special = trySpecial();
    if (special) {
      this.sink.collectible({ type: special, lane, d: mid, y: special === 'relic' ? 1.3 : 1.15 });
      specialPlaced = true;
    }

    if (hasCoins && lineEnd - start > 2) {
      const y = action === 'slide' ? 0.6 : COIN_Y;
      for (let cd = start; cd <= lineEnd; cd += COIN_SPACING) {
        if (specialPlaced && Math.abs(cd - mid) < 1.6) continue;
        this.sink.collectible({ type: 'coin', lane, d: cd, y });
      }
      if (action === 'jump') {
        const center = rowD + rowLen / 2;
        const n = 6;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          const off = (t * 2 - 1) * arcHalf;
          const y2 = COIN_Y + 1.45 * (1 - (off / arcHalf) ** 2);
          this.sink.collectible({ type: 'coin', lane, d: center + off, y: y2 });
        }
      }
    }

    // Em fileiras de descanso, moedas extras numa pista lateral.
    if (pattern === 'breather' && rng.chance(0.6)) {
      const other = rng.pick(LANES.filter((l) => l !== lane && this.laneFree(l, rowD, speed)));
      if (other !== undefined) {
        for (let cd = start + 2; cd <= rowD + 6; cd += COIN_SPACING) {
          if (this.blockedUntil[other] + 2 > cd) continue;
          this.sink.collectible({ type: 'coin', lane: other, d: cd, y: COIN_Y });
        }
      }
    }
  }
}
