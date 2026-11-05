import { describe, expect, it } from 'vitest';
import { TrackGenerator, type ObstacleSpec, type CollectibleSpec, type ObstacleCatalog } from '../src/game/TrackGenerator';
import { Rng } from '../src/game/rng';
import { speedForDistance, LANE_CHANGE_TIME } from '../src/game/config';

const catalog: ObstacleCatalog = {
  low: [{ id: 'vaso', length: 1 }, { id: 'caixa', length: 1.1 }],
  high: [{ id: 'barreira', length: 0.5 }],
  block: [{ id: 'barraca', length: 2.2 }],
  fullLow: [{ id: 'tronco', length: 0.9 }],
  fullHigh: [{ id: 'portao', length: 0.7 }],
  animal: [{ id: 'ovelha', length: 1.2 }],
  trainCar: { id: 'carroca', length: 3.6 },
};

function run(seed: number, until = 12000) {
  const obstacles: ObstacleSpec[] = [];
  const coins: CollectibleSpec[] = [];
  const gen = new TrackGenerator(catalog, new Rng(seed), {
    obstacle: (o) => obstacles.push(o),
    collectible: (c) => coins.push(c),
  });
  for (let t = 100; t <= until; t += 100) gen.generateUntil(t, speedForDistance);
  return { gen, obstacles, coins };
}

function blockedAt(obstacles: ObstacleSpec[], lane: number, d0: number, d1: number) {
  return obstacles.filter(
    (o) => o.kind === 'block' && (o.lane === lane || o.fullWidth) && o.d < d1 && o.d + o.length > d0,
  );
}

describe('TrackGenerator', () => {
  for (const seed of [1, 7, 42, 1234, 99999]) {
    it(`gera um percurso sempre possível (seed ${seed})`, () => {
      const { gen, obstacles } = run(seed);
      const rows = gen.rows;
      expect(rows.length).toBeGreaterThan(300);
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        // A pista segura nunca tem um bloqueio intransponível.
        expect(blockedAt(obstacles, r.safeLane, r.d - 0.5, r.end + 0.5)).toHaveLength(0);
        if (i > 0) {
          const p = rows[i - 1];
          // No máximo uma troca de pista entre fileiras.
          expect(Math.abs(r.safeLane - p.safeLane)).toBeLessThanOrEqual(1);
          // Tempo suficiente entre fileiras para reagir.
          const speed = speedForDistance(r.d) * 1.08;
          const gapTime = (r.d - p.end) / speed;
          expect(gapTime).toBeGreaterThan(0.45);
          if (r.safeLane !== p.safeLane) {
            // Ao trocar de pista, a pista de destino fica livre por tempo suficiente.
            const blocks = blockedAt(obstacles, r.safeLane, p.end, r.d);
            const freeFrom = blocks.reduce((m, o) => Math.max(m, o.d + o.length), p.end);
            expect((r.d - freeFrom) / speed).toBeGreaterThan(LANE_CHANGE_TIME + 0.12);
          }
        }
      }
    });
  }

  it('não coloca moedas dentro de obstáculos de bloqueio', () => {
    const { obstacles, coins } = run(5, 6000);
    for (const c of coins) {
      const hit = blockedAt(obstacles, c.lane, c.d - 0.3, c.d + 0.3);
      expect(hit).toHaveLength(0);
    }
  });

  it('gera colecionáveis especiais ao longo da corrida', () => {
    const { coins } = run(3, 8000);
    const types = new Set(coins.map((c) => c.type));
    expect(types.has('coin')).toBe(true);
    expect(types.has('scroll')).toBe(true);
    expect(types.has('relic')).toBe(true);
    expect(types.has('magnet')).toBe(true);
    expect(types.has('double')).toBe(true);
    expect(types.has('shield')).toBe(true);
  });

  it('é determinístico com a mesma semente', () => {
    const a = run(77, 3000).obstacles.map((o) => `${o.variant}${o.lane}${o.d.toFixed(2)}`);
    const b = run(77, 3000).obstacles.map((o) => `${o.variant}${o.lane}${o.d.toFixed(2)}`);
    expect(a).toEqual(b);
  });
});
