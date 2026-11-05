import { CHARACTERS, getCharacter, type CharacterDef } from '../data/characters';
import { MAPS, getMap, type MapDef } from '../data/maps';
import {
  ACHIEVEMENTS,
  MAX_MULTIPLIER,
  MISSION_POOL,
  UPGRADES,
  type AchievementDef,
  type MissionMetric,
  type StatKey,
  type UpgradeDef,
} from '../data/progression';
import { SCROLLS, type ScrollDef } from '../data/scrolls';
import type { RunStats } from '../game/ScoreManager';
import { Rng, hashString } from '../game/rng';

export interface Settings {
  music: number;
  sfx: number;
  sensitivity: 'baixa' | 'media' | 'alta';
  quality: 'auto' | 'alta' | 'media' | 'baixa';
  vibration: boolean;
  showHints: boolean;
}

export interface RunRecord {
  score: number;
  distance: number;
  coins: number;
  mapId: string;
  characterId: string;
  date: number;
}

export interface MissionState {
  templateId: string;
  target: number;
  progress: number;
  claimed: boolean;
}

export interface SaveData {
  version: 1;
  coins: number;
  relics: number;
  stats: Record<Exclude<StatKey, 'charactersOwned' | 'mapsUnlocked'>, number>;
  bestByMap: Record<string, number>;
  scrolls: string[];
  characters: string[];
  selectedCharacter: string;
  skins: Record<string, string[]>;
  selectedSkin: Record<string, string>;
  maps: string[];
  selectedMap: string;
  upgrades: Record<UpgradeDef['id'], number>;
  achievements: Record<string, number>;
  missions: { day: string; list: MissionState[]; multiplierLevel: number; setClaimed: boolean };
  records: RunRecord[];
  settings: Settings;
  tutorialDone: boolean;
}

export interface RunSummary {
  stats: RunStats;
  isBestScore: boolean;
  isBestDistance: boolean;
  newScrolls: ScrollDef[];
  newAchievements: AchievementDef[];
  completedMissions: string[];
  unlockedCharacters: CharacterDef[];
  unlockedMaps: MapDef[];
  scrollCoins: number;
}

const KEY = 'davidrunner.save.v1';

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaults(): SaveData {
  return {
    version: 1,
    coins: 0,
    relics: 0,
    stats: {
      totalRuns: 0,
      totalDistance: 0,
      totalCoins: 0,
      totalJumps: 0,
      totalSlides: 0,
      totalScrolls: 0,
      totalRelics: 0,
      totalPowerups: 0,
      bestDistance: 0,
      bestScore: 0,
      bestCoinsRun: 0,
      missionSets: 0,
    },
    bestByMap: {},
    scrolls: [],
    characters: ['davi'],
    selectedCharacter: 'davi',
    skins: Object.fromEntries(CHARACTERS.map((c) => [c.id, ['padrao']])),
    selectedSkin: Object.fromEntries(CHARACTERS.map((c) => [c.id, 'padrao'])),
    maps: ['jerusalem'],
    selectedMap: 'jerusalem',
    upgrades: { magnet: 0, double: 0, shield: 0 },
    achievements: {},
    missions: { day: '', list: [], multiplierLevel: 0, setClaimed: false },
    records: [],
    settings: { music: 0.6, sfx: 0.8, sensitivity: 'media', quality: 'auto', vibration: true, showHints: true },
    tutorialDone: false,
  };
}

function merge(base: SaveData, loaded: Partial<SaveData>): SaveData {
  const out: SaveData = { ...base, ...loaded } as SaveData;
  out.stats = { ...base.stats, ...(loaded.stats ?? {}) };
  out.settings = { ...base.settings, ...(loaded.settings ?? {}) };
  out.upgrades = { ...base.upgrades, ...(loaded.upgrades ?? {}) };
  out.skins = { ...base.skins, ...(loaded.skins ?? {}) };
  out.selectedSkin = { ...base.selectedSkin, ...(loaded.selectedSkin ?? {}) };
  out.missions = { ...base.missions, ...(loaded.missions ?? {}) };
  return out;
}

/**
 * Progressão e salvamento local (localStorage). Expõe `subscribe/getVersion`
 * para a interface React reagir às mudanças.
 */
export class ProgressionManager {
  data: SaveData;
  private listeners = new Set<() => void>();
  private version = 0;
  private toastQueue: { icon: string; title: string; text: string }[] = [];

  constructor() {
    this.data = this.load();
    this.ensureDailyMissions();
  }

  // ------------------------------------------------------------ persistência
  private load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return merge(defaults(), JSON.parse(raw));
    } catch {
      /* armazenamento indisponível: segue com padrão */
    }
    return defaults();
  }

  private commit(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignora */
    }
    this.version++;
    for (const l of this.listeners) l();
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = (): number => this.version;

  resetProgress(): void {
    const settings = this.data.settings;
    this.data = defaults();
    this.data.settings = settings;
    this.ensureDailyMissions();
    this.commit();
  }

  // ------------------------------------------------------------ toasts
  pushToast(icon: string, title: string, text: string): void {
    this.toastQueue.push({ icon, title, text });
    this.version++;
    for (const l of this.listeners) l();
  }

  takeToasts(): { icon: string; title: string; text: string }[] {
    const t = this.toastQueue;
    this.toastQueue = [];
    return t;
  }

  // ------------------------------------------------------------ multiplicador / power-ups
  get baseMultiplier(): number {
    return Math.min(MAX_MULTIPLIER, 1 + this.data.missions.multiplierLevel);
  }

  durations(): Record<UpgradeDef['id'], number> {
    const out = { magnet: 10, double: 10, shield: 12 };
    for (const u of UPGRADES) out[u.id] = u.baseDuration + u.perLevel * (this.data.upgrades[u.id] ?? 0);
    return out;
  }

  // ------------------------------------------------------------ missões diárias
  ensureDailyMissions(): void {
    const day = today();
    const m = this.data.missions;
    if (m.day === day && m.list.length === 3) return;
    const rng = new Rng(hashString(day));
    const pool = [...MISSION_POOL];
    const list: MissionState[] = [];
    const level = Math.min(m.multiplierLevel, 12);
    while (list.length < 3 && pool.length) {
      const t = pool.splice(Math.floor(rng.next() * pool.length), 1)[0];
      list.push({ templateId: t.id, target: t.base + t.step * level, progress: 0, claimed: false });
    }
    this.data.missions = { ...m, day, list, setClaimed: false };
    this.commit();
  }

  private metricValue(metric: MissionMetric, run: RunStats): number {
    switch (metric) {
      case 'coinsRun':
      case 'coinsTotal':
        return run.coins;
      case 'distanceRun':
      case 'distanceTotal':
        return Math.floor(run.distance);
      case 'jumpsTotal':
        return run.jumps;
      case 'slidesTotal':
        return run.slides;
      case 'runsTotal':
        return 1;
      case 'scoreRun':
        return Math.floor(run.score);
      case 'scrollsTotal':
        return run.scrolls;
      case 'powerupsTotal':
        return run.powerups;
      case 'laneTotal':
        return run.laneChanges;
    }
  }

  private isRunMetric(metric: MissionMetric): boolean {
    return metric === 'coinsRun' || metric === 'distanceRun' || metric === 'scoreRun';
  }

  /** Progresso que a missão teria com a corrida atual (para avisos ao vivo). */
  missionProgressWith(ms: MissionState, run: RunStats | null): number {
    const t = MISSION_POOL.find((x) => x.id === ms.templateId)!;
    if (!run) return ms.progress;
    const v = this.metricValue(t.metric, run);
    if (t.metric === 'runsTotal') return ms.progress; // conta só ao final
    return this.isRunMetric(t.metric) ? Math.max(ms.progress, v) : ms.progress + v;
  }

  claimMission(index: number): boolean {
    const ms = this.data.missions.list[index];
    if (!ms || ms.claimed || ms.progress < ms.target) return false;
    const t = MISSION_POOL.find((x) => x.id === ms.templateId)!;
    ms.claimed = true;
    this.data.coins += t.reward;
    const m = this.data.missions;
    if (!m.setClaimed && m.list.every((x) => x.claimed)) {
      m.setClaimed = true;
      m.multiplierLevel = Math.min(MAX_MULTIPLIER - 1, m.multiplierLevel + 1);
      this.data.stats.missionSets++;
      this.data.relics += 1;
      this.pushToast('✖️', 'Multiplicador aumentado!', `Agora sua pontuação é x${this.baseMultiplier}. Você ganhou 1 relíquia!`);
    }
    this.checkAchievements();
    this.commit();
    return true;
  }

  // ------------------------------------------------------------ conquistas
  statValue(stat: StatKey): number {
    if (stat === 'charactersOwned') return this.data.characters.length;
    if (stat === 'mapsUnlocked') return this.data.maps.length;
    return this.data.stats[stat];
  }

  private checkAchievements(): AchievementDef[] {
    const out: AchievementDef[] = [];
    for (const a of ACHIEVEMENTS) {
      if (this.data.achievements[a.id]) continue;
      if (this.statValue(a.stat) >= a.goal) {
        this.data.achievements[a.id] = Date.now();
        this.data.coins += a.reward;
        out.push(a);
        this.pushToast(a.icon, `Conquista: ${a.name}`, `+${a.reward} moedas`);
      }
    }
    return out;
  }

  // ------------------------------------------------------------ personagens e mapas
  characterStatus(c: CharacterDef): { owned: boolean; canUnlock: boolean; label: string; progress: number } {
    const owned = this.data.characters.includes(c.id);
    const u = c.unlock;
    if (owned) return { owned, canUnlock: false, label: 'Desbloqueado', progress: 1 };
    switch (u.type) {
      case 'free':
        return { owned: false, canUnlock: true, label: 'Grátis', progress: 1 };
      case 'coins':
        return { owned, canUnlock: this.data.coins >= u.amount, label: `${u.amount.toLocaleString('pt-BR')} moedas`, progress: Math.min(1, this.data.coins / u.amount) };
      case 'relics':
        return { owned, canUnlock: this.data.relics >= u.count, label: `${u.count} relíquias`, progress: Math.min(1, this.data.relics / u.count) };
      case 'distance':
        return {
          owned,
          canUnlock: this.data.stats.bestDistance >= u.meters,
          label: `Alcance ${u.meters.toLocaleString('pt-BR')} m em uma corrida`,
          progress: Math.min(1, this.data.stats.bestDistance / u.meters),
        };
      case 'scrolls':
        return {
          owned,
          canUnlock: this.data.scrolls.length >= u.count,
          label: `Encontre ${u.count} pergaminhos`,
          progress: Math.min(1, this.data.scrolls.length / u.count),
        };
    }
  }

  unlockCharacter(id: string): boolean {
    const c = getCharacter(id);
    const st = this.characterStatus(c);
    if (st.owned || !st.canUnlock) return false;
    if (c.unlock.type === 'coins') this.data.coins -= c.unlock.amount;
    if (c.unlock.type === 'relics') this.data.relics -= c.unlock.count;
    this.data.characters.push(id);
    this.data.selectedCharacter = id;
    this.checkAchievements();
    this.commit();
    return true;
  }

  selectCharacter(id: string): void {
    if (!this.data.characters.includes(id)) return;
    this.data.selectedCharacter = id;
    this.commit();
  }

  buySkin(charId: string, skinId: string): boolean {
    const c = getCharacter(charId);
    const s = c.skins.find((x) => x.id === skinId);
    if (!s || !this.data.characters.includes(charId)) return false;
    const owned = this.data.skins[charId] ?? ['padrao'];
    if (owned.includes(skinId)) return false;
    if (this.data.relics < s.relicCost) return false;
    this.data.relics -= s.relicCost;
    this.data.skins[charId] = [...owned, skinId];
    this.data.selectedSkin[charId] = skinId;
    this.commit();
    return true;
  }

  selectSkin(charId: string, skinId: string): void {
    if (!(this.data.skins[charId] ?? ['padrao']).includes(skinId)) return;
    this.data.selectedSkin[charId] = skinId;
    this.commit();
  }

  mapStatus(m: MapDef): { owned: boolean; canUnlockFree: boolean; canBuy: boolean; label: string; progress: number } {
    const owned = this.data.maps.includes(m.id);
    if (owned || m.unlock.type === 'free') return { owned: true, canUnlockFree: false, canBuy: false, label: 'Disponível', progress: 1 };
    const u = m.unlock;
    const best = this.data.bestByMap[u.map] ?? 0;
    const req = getMap(u.map);
    return {
      owned: false,
      canUnlockFree: best >= u.meters,
      canBuy: this.data.coins >= u.coins,
      label: `Corra ${u.meters.toLocaleString('pt-BR')} m em ${req.name} ou pague ${u.coins.toLocaleString('pt-BR')} moedas`,
      progress: Math.min(1, best / u.meters),
    };
  }

  unlockMap(id: string, payWithCoins: boolean): boolean {
    const m = getMap(id);
    const st = this.mapStatus(m);
    if (st.owned) return false;
    if (payWithCoins) {
      if (!st.canBuy || m.unlock.type !== 'distanceIn') return false;
      this.data.coins -= m.unlock.coins;
    } else if (!st.canUnlockFree) return false;
    this.data.maps.push(id);
    this.data.selectedMap = id;
    this.checkAchievements();
    this.commit();
    return true;
  }

  selectMap(id: string): void {
    if (!this.data.maps.includes(id)) return;
    this.data.selectedMap = id;
    this.commit();
  }

  // ------------------------------------------------------------ loja
  upgradeCost(id: UpgradeDef['id']): number | null {
    const u = UPGRADES.find((x) => x.id === id)!;
    const lvl = this.data.upgrades[id] ?? 0;
    return lvl >= u.costs.length ? null : u.costs[lvl];
  }

  buyUpgrade(id: UpgradeDef['id']): boolean {
    const cost = this.upgradeCost(id);
    if (cost === null || this.data.coins < cost) return false;
    this.data.coins -= cost;
    this.data.upgrades[id] = (this.data.upgrades[id] ?? 0) + 1;
    this.commit();
    return true;
  }

  spendCoins(n: number): boolean {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    this.commit();
    return true;
  }

  updateSettings(s: Partial<Settings>): void {
    this.data.settings = { ...this.data.settings, ...s };
    this.commit();
  }

  setTutorialDone(): void {
    if (this.data.tutorialDone) return;
    this.data.tutorialDone = true;
    this.commit();
  }

  // ------------------------------------------------------------ fim de corrida
  applyRun(run: RunStats): RunSummary {
    this.ensureDailyMissions();
    const d = this.data;
    const st = d.stats;
    const distance = Math.floor(run.distance);
    const score = Math.floor(run.score);
    const isBestScore = score > st.bestScore;
    const isBestDistance = distance > st.bestDistance;

    st.totalRuns++;
    st.totalDistance += distance;
    st.totalCoins += run.coins;
    st.totalJumps += run.jumps;
    st.totalSlides += run.slides;
    st.totalScrolls += run.scrolls;
    st.totalRelics += run.relics;
    st.totalPowerups += run.powerups;
    st.bestDistance = Math.max(st.bestDistance, distance);
    st.bestScore = Math.max(st.bestScore, score);
    st.bestCoinsRun = Math.max(st.bestCoinsRun, run.coins);
    d.bestByMap[run.mapId] = Math.max(d.bestByMap[run.mapId] ?? 0, distance);
    d.coins += run.coins;
    d.relics += run.relics;

    // pergaminhos: cada um revela a próxima curiosidade
    const newScrolls: ScrollDef[] = [];
    let scrollCoins = 0;
    for (let i = 0; i < run.scrolls; i++) {
      const next = SCROLLS.find((s) => !d.scrolls.includes(s.id));
      if (next) {
        d.scrolls.push(next.id);
        newScrolls.push(next);
      } else {
        scrollCoins += 100;
      }
    }
    d.coins += scrollCoins;

    // missões
    const completedMissions: string[] = [];
    for (const ms of d.missions.list) {
      const t = MISSION_POOL.find((x) => x.id === ms.templateId)!;
      const before = ms.progress;
      const v = this.metricValue(t.metric, run);
      ms.progress = this.isRunMetric(t.metric) ? Math.max(ms.progress, v) : ms.progress + v;
      ms.progress = Math.min(ms.progress, ms.target);
      if (before < ms.target && ms.progress >= ms.target) completedMissions.push(t.text(ms.target));
    }

    // desbloqueios automáticos (distância / pergaminhos)
    const unlockedCharacters: CharacterDef[] = [];
    for (const c of CHARACTERS) {
      if (d.characters.includes(c.id)) continue;
      if (c.unlock.type === 'distance' || c.unlock.type === 'scrolls') {
        if (this.characterStatus(c).canUnlock) {
          d.characters.push(c.id);
          unlockedCharacters.push(c);
        }
      }
    }
    const unlockedMaps: MapDef[] = [];
    for (const m of MAPS) {
      if (d.maps.includes(m.id)) continue;
      if (this.mapStatus(m).canUnlockFree) {
        d.maps.push(m.id);
        unlockedMaps.push(m);
      }
    }

    d.records.push({ score, distance, coins: run.coins, mapId: run.mapId, characterId: run.characterId, date: Date.now() });
    d.records.sort((a, b) => b.score - a.score);
    d.records = d.records.slice(0, 10);

    const newAchievements = this.checkAchievements();
    this.commit();
    return {
      stats: run,
      isBestScore,
      isBestDistance,
      newScrolls,
      newAchievements,
      completedMissions,
      unlockedCharacters,
      unlockedMaps,
      scrollCoins,
    };
  }
}

export const progression = new ProgressionManager();
