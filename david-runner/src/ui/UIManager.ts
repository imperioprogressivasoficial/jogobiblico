import { useSyncExternalStore } from 'react';
import type { GameEngine } from '../game/GameEngine';
import { audio } from '../game/AudioManager';
import { progression } from '../state/ProgressionManager';

export type Screen =
  | 'splash'
  | 'menu'
  | 'characters'
  | 'maps'
  | 'game'
  | 'records'
  | 'shop'
  | 'achievements'
  | 'missions'
  | 'settings'
  | 'scrolls';

/** Navegação entre telas + acesso ao motor 3D compartilhado. */
class UIManagerImpl {
  screen: Screen = 'splash';
  private stack: Screen[] = [];
  private listeners = new Set<() => void>();
  engine: GameEngine | null = null;
  private engineWaiters: ((e: GameEngine) => void)[] = [];

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getScreen = () => this.screen;

  go(s: Screen, replace = false): void {
    if (s === this.screen) return;
    if (!replace && this.screen !== 'splash' && this.screen !== 'game') this.stack.push(this.screen);
    this.screen = s;
    for (const l of this.listeners) l();
  }

  back(): void {
    audio.play('uiBack');
    const prev = this.stack.pop() ?? 'menu';
    this.screen = prev;
    for (const l of this.listeners) l();
  }

  home(): void {
    this.stack = [];
    this.screen = 'menu';
    for (const l of this.listeners) l();
  }

  setEngine(e: GameEngine): void {
    this.engine = e;
    for (const w of this.engineWaiters) w(e);
    this.engineWaiters = [];
    applySettings();
  }

  whenEngine(): Promise<GameEngine> {
    if (this.engine) return Promise.resolve(this.engine);
    return new Promise((r) => this.engineWaiters.push(r));
  }

  /** Inicia uma corrida com as escolhas atuais do jogador. */
  startRun(): void {
    const e = this.engine;
    if (!e) return;
    const d = progression.data;
    e.startRun({
      mapId: d.selectedMap,
      characterId: d.selectedCharacter,
      skinId: d.selectedSkin[d.selectedCharacter] ?? 'padrao',
      baseMultiplier: progression.baseMultiplier,
      durations: progression.durations(),
    });
    this.go('game', true);
  }

  /** Volta ao menu restaurando o personagem e o mapa escolhidos. */
  showMenuScene(): void {
    const e = this.engine;
    if (!e) return;
    const d = progression.data;
    e.setMap(d.selectedMap);
    e.setCharacter(d.selectedCharacter, d.selectedSkin[d.selectedCharacter] ?? 'padrao');
    e.showMenu('menu');
    audio.playMusic('menu');
  }
}

export const UIManager = new UIManagerImpl();

export function useScreen(): Screen {
  return useSyncExternalStore(UIManager.subscribe, UIManager.getScreen);
}

export function useProgress(): number {
  return useSyncExternalStore(progression.subscribe, progression.getVersion);
}

export const SENSITIVITY_PX = { baixa: 44, media: 28, alta: 16 } as const;

export function applySettings(): void {
  const s = progression.data.settings;
  audio.setVolumes(s.music, s.sfx);
  const e = UIManager.engine;
  if (!e) return;
  e.autoQuality = s.quality === 'auto';
  const q = s.quality === 'auto' ? 'alta' : s.quality;
  if (e.getQuality() !== q && !(s.quality === 'auto' && e.getQuality() !== 'alta')) e.setQuality(q);
  e.setSwipeThreshold(SENSITIVITY_PX[s.sensitivity]);
}

export const fmt = (n: number) => Math.floor(n).toLocaleString('pt-BR');
