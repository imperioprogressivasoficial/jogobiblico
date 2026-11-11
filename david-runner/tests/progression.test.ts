import { beforeEach, describe, expect, it } from 'vitest';
import { ProgressionManager } from '../src/state/ProgressionManager';

const KEY = 'davidrunner.save.v1';
const store: Record<string, string> = {};
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => void (store[k] = String(v)),
  removeItem: (k: string) => void delete store[k],
  clear: () => Object.keys(store).forEach((k) => delete store[k]),
  key: () => null,
  length: 0,
} as Storage;

beforeEach(() => localStorage.clear());

function emptyStats() {
  return { score: 10, distance: 10, coins: 3, jumps: 0, slides: 0, scrolls: 0, relics: 0, powerups: 0, laneChanges: 0, boosts: 0, mapId: 'jerusalem', characterId: 'davi', time: 1, multiplier: 1 } as never;
}

describe('saves antigos e corrompidos', () => {
  it('save sem campos novos recebe os padrões', () => {
    localStorage.setItem(KEY, JSON.stringify({ coins: 10 }));
    const p = new ProgressionManager();
    expect(p.data.coins).toBe(10);
    expect(p.data.purchases).toEqual([]);
    expect(p.data.modeBest).toEqual({});
    expect(p.data.profile).toBeNull();
    expect(p.data.daily.streak).toBe(0);
  });
  it('moedas negativas, ids inexistentes e JSON "null" não quebram', () => {
    localStorage.setItem(KEY, JSON.stringify({ coins: -50, relics: -1, characters: ['xyz'], selectedCharacter: 'xyz', maps: ['nada'], selectedMap: 'nada' }));
    const p = new ProgressionManager();
    expect(p.data.coins).toBe(0);
    expect(p.data.relics).toBe(0);
    expect(p.data.characters).toEqual(['davi']);
    expect(p.data.selectedCharacter).toBe('davi');
    expect(p.data.maps).toContain('jerusalem');
    expect(p.data.selectedMap).toBe('jerusalem');
    localStorage.setItem(KEY, 'null');
    expect(new ProgressionManager().data.coins).toBe(0);
  });
  it('missão de modelo removido é substituída', () => {
    localStorage.setItem(KEY, JSON.stringify({ missions: { day: 'x', list: [{ templateId: 'sumiu', target: 1, progress: 0, claimed: false }], multiplierLevel: 0, setClaimed: false } }));
    const p = new ProgressionManager();
    expect(p.data.missions.list.length).toBe(3);
    expect(() => p.applyRun(emptyStats())).not.toThrow();
  });
});

describe('economia', () => {
  it('spendCoins rejeita valor negativo/NaN e não deixa a moeda virar NaN', () => {
    const p = new ProgressionManager();
    p.data.coins = 100;
    expect(p.spendCoins(-500)).toBe(false);
    expect(p.spendCoins(NaN)).toBe(false);
    expect(p.data.coins).toBe(100);
    expect(p.spendCoins(40)).toBe(true);
    expect(p.data.coins).toBe(60);
  });
  it('grantPack único não credita duas vezes e rejeita valores inválidos', () => {
    const p = new ProgressionManager();
    expect(p.grantPack('inicio', 100, 1, true)).toBe(true);
    expect(p.grantPack('inicio', 100, 1, true)).toBe(false);
    expect(p.data.coins).toBe(100);
    expect(p.grantPack('x', -999, 0)).toBe(false);
    expect(p.data.coins).toBe(100);
  });
  it('buySkinFor valida preço, roupa e herói; não compra duas vezes', () => {
    const p = new ProgressionManager();
    p.data.relics = 10;
    expect(p.buySkinFor('davi', 'real', -5)).toBe(false);
    expect(p.buySkinFor('davi', 'inexistente', 1)).toBe(false);
    expect(p.buySkinFor('moises', 'sinai', 1)).toBe(false);
    expect(p.buySkinFor('davi', 'real', 2)).toBe(true);
    expect(p.buySkinFor('davi', 'real', 2)).toBe(false);
    expect(p.data.relics).toBe(8);
  });
  it('apagar progresso mantém conta e compras de pacote único', () => {
    const p = new ProgressionManager();
    p.createProfile({ childName: 'A', age: 7, gender: 'm', avatar: 'davi', parentEmail: 'a@b.c', pin: '1234', consent: true });
    p.grantPack('boas-vindas', 50, 0, true);
    p.resetProgress();
    expect(p.data.coins).toBe(0);
    expect(p.data.profile?.pin).toBe('1234');
    expect(p.grantPack('boas-vindas', 50, 0, true)).toBe(false);
  });
});

describe('Jornada do Dia', () => {
  it('passo concluído é gravado mesmo sem outra mudança', () => {
    const p = new ProgressionManager();
    p.ensureDaily();
    const id = p.data.daily.storyId;
    p.markStoryRead(id);
    p.data.daily.story = false;
    localStorage.clear();
    p.markStoryRead(id); // já lida: antes o passo não era gravado
    expect(JSON.parse(localStorage.getItem(KEY)!).daily.story).toBe(true);
  });
  it('baú só abre uma vez e só com os 3 passos', () => {
    const p = new ProgressionManager();
    p.ensureDaily();
    expect(p.openChest()).toBeNull();
    p.markStoryRead(p.data.daily.storyId);
    p.finishMode(p.data.daily.challenge, 10, 0);
    p.applyRun({ ...(emptyStats() as object), distance: 200 } as never);
    const c0 = p.data.coins;
    expect(p.openChest()).not.toBeNull();
    expect(p.openChest()).toBeNull();
    expect(p.data.coins - c0).toBe(ProgressionManager.CHEST_COINS);
    expect(p.data.daily.streak).toBe(1);
  });
});
