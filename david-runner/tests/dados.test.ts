import { describe, expect, it } from 'vitest';
import { STORY } from '../src/data/story';
import { MAPS } from '../src/data/maps';
import { CHARACTERS } from '../src/data/characters';
import { POWERS } from '../src/data/powers';
import { ACHIEVEMENTS, MISSION_POOL } from '../src/data/progression';
import { MODES } from '../src/data/modes';
import { COIN_PACKS } from '../src/data/currency';

const dup = (ids: string[]) => ids.filter((x, i) => ids.indexOf(x) !== i);

describe('integridade dos dados', () => {
  it('histórias: ids únicos, números em sequência, mapa existente, quiz válido', () => {
    expect(dup(STORY.map((s) => s.id))).toEqual([]);
    STORY.forEach((s, i) => {
      expect(s.number, s.id).toBe(i + 1);
      expect(MAPS.some((m) => m.id === s.mapId), `${s.id} mapa ${s.mapId}`).toBe(true);
      expect(s.pages.length, s.id).toBeGreaterThan(0);
      expect(s.pages.every((p) => p.trim().length > 0), s.id).toBe(true);
      expect(s.quiz.options.length, s.id).toBeGreaterThanOrEqual(2);
      expect(s.quiz.answer, s.id).toBeGreaterThanOrEqual(0);
      expect(s.quiz.answer, s.id).toBeLessThan(s.quiz.options.length);
      expect(new Set(s.quiz.options).size, `${s.id} opções repetidas`).toBe(s.quiz.options.length);
    });
  });
  it('heróis, poderes, mapas, conquistas, missões e modos sem ids repetidos', () => {
    expect(dup(CHARACTERS.map((c) => c.id))).toEqual([]);
    for (const c of CHARACTERS) expect(dup(c.skins.map((s) => s.id)), c.id).toEqual([]);
    expect(dup(POWERS.map((p) => p.id))).toEqual([]);
    expect(dup(MAPS.map((m) => m.id))).toEqual([]);
    expect(dup(ACHIEVEMENTS.map((a) => a.id))).toEqual([]);
    expect(dup(MISSION_POOL.map((m) => m.id))).toEqual([]);
    expect(dup(MODES.map((m) => m.id))).toEqual([]);
    expect(dup(COIN_PACKS.map((m) => m.id))).toEqual([]);
  });
  it('poderes desbloqueados por história apontam para uma história que existe', () => {
    for (const p of POWERS) if (p.unlock.type === 'story') expect(STORY.some((s) => s.id === (p.unlock as { storyId: string }).storyId), p.id).toBe(true);
  });
  it('mapas que desbloqueiam por distância dependem de um mapa que existe', () => {
    for (const m of MAPS) if (m.unlock.type === 'distanceIn') expect(MAPS.some((x) => x.id === (m.unlock as { map: string }).map), m.id).toBe(true);
  });
  it('todo herói tem a roupa padrão', () => {
    for (const c of CHARACTERS) expect(c.skins.some((s) => s.id === 'padrao'), c.id).toBe(true);
  });
  it('ids de herói e roupa cabem no filtro do servidor do mundo ([a-z], 12 e 16 letras)', () => {
    for (const c of CHARACTERS) {
      expect(c.id, c.id).toMatch(/^[a-z]{1,12}$/);
      for (const s of c.skins) expect(s.id, `${c.id}/${s.id}`).toMatch(/^[a-z]{1,16}$/);
    }
  });
});
