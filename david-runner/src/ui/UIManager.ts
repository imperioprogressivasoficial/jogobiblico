import { isFreeStory } from '../data/access';
import { useSyncExternalStore } from 'react';
import type { GameEngine } from '../game/GameEngine';
import { DIFFICULTY } from '../data/chariot';
import { audio } from '../game/AudioManager';
import { progression } from '../state/ProgressionManager';
import type { StoryEpisode } from '../data/story';

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
  | 'journey'
  | 'onboarding'
  | 'modes'
  | 'mode-quiz'
  | 'mode-memory'
  | 'mode-verse'
  | 'mode-sling'
  | 'mode-gideon'
  | 'access'
  | 'coins-info'
  | 'parents'
  | 'world';

export type ShopTab = 'destaque' | 'herois' | 'trajes' | 'melhorias' | 'poderes';

/** Navegação entre telas + acesso ao motor 3D compartilhado. */
class UIManagerImpl {
  screen: Screen = 'splash';
  private stack: Screen[] = [];
  private listeners = new Set<() => void>();
  engine: GameEngine | null = null;
  private engineWaiters: ((e: GameEngine) => void)[] = [];
  /** Janelas abertas por cima da tela (ex.: leitor de história) que fecham com "voltar". */
  private backHandlers: (() => void)[] = [];

  /** Registra quem fecha com o botão "voltar" do Android; retorna a função para remover. */
  pushBackHandler(fn: () => void): () => void {
    this.backHandlers.push(fn);
    return () => {
      const i = this.backHandlers.lastIndexOf(fn);
      if (i >= 0) this.backHandlers.splice(i, 1);
    };
  }

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

  /**
   * Botão "voltar" do Android: pausa a corrida, fecha telas e volta ao menu.
   * Retorna false no menu principal (o app vai para segundo plano).
   */
  handleBack(): boolean {
    const top = this.backHandlers[this.backHandlers.length - 1];
    if (top) {
      top();
      return true;
    }
    const e = this.engine;
    if (this.screen === 'game') {
      if (e && e.mode === 'playing') e.pause();
      return true;
    }
    if (this.screen === 'onboarding') return true;
    if (this.screen === 'menu' || this.screen === 'splash') return false;
    this.back();
    return true;
  }

  /** Aba inicial da Loja (o botão de poderes do menu abre direto em "Poderes"). */
  shopTab: ShopTab = 'destaque';
  /** Modo escolhido no lobby (o botão JOGAR abre este modo). */
  selectedMode = 'corrida';

  /** História sendo vivida na corrida atual (modo "Viver a história"); null numa corrida normal. */
  storyRun: StoryEpisode | null = null;

  /** Leva o herói para dentro do cenário da história: corrida no mapa dela, com narração e quiz. */
  startStoryRun(story: StoryEpisode): void {
    // versão grátis: só as primeiras histórias e a história do dia
    if (!progression.hasAccess && !isFreeStory(story, progression.data.daily.storyId)) return this.go('access');
    this.storyRun = story;
    this.startRun(story.mapId, true);
  }

  /** Inicia uma corrida com as escolhas atuais do jogador. */
  startRun(mapOverride?: string, keepStory = false): void {
    const e = this.engine;
    if (!e) return;
    if (!keepStory) this.storyRun = null;
    const d = progression.data;
    const diff = DIFFICULTY[d.settings.difficulty] ?? DIFFICULTY.crianca;
    e.startRun({
      mapId: mapOverride ?? d.selectedMap,
      characterId: d.selectedCharacter,
      skinId: d.selectedSkin[d.selectedCharacter] ?? 'padrao',
      baseMultiplier: progression.baseMultiplier,
      durations: progression.durations(),
      chariot: { id: progression.data.equippedPower, charges: progression.chariotCharges, duration: progression.chariotDuration() },
      speedScale: diff.speedScale,
      rampScale: diff.rampScale,
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
  e.vibration = s.vibration;
}

export const fmt = (n: number) => Math.floor(n).toLocaleString('pt-BR');
