import * as THREE from 'three';
import { getMap, type MapDef } from '../data/maps';
import { vibrate } from '../platform/native';
import { CHARIOT } from '../data/chariot';
import { getPower } from '../data/powers';
import { audio } from './AudioManager';
import { BoostEffect } from './BoostEffect';
import { CameraController } from './CameraController';
import { ChariotPower } from './ChariotPower';
import { CollectibleManager, type PickupEvent } from './CollectibleManager';
import { DESPAWN_BEHIND, LANE_X, SPAWN_AHEAD, scaledSpeedCurve, speedForDistance } from './config';
import { EnvironmentManager } from './EnvironmentManager';
import { InputManager, type GameAction } from './InputManager';
import { ObstacleManager, type ActiveObstacle } from './ObstacleManager';
import { ParticleSystem } from './ParticleSystem';
import { PlayerController } from './PlayerController';
import { PostFX, colorPipelineReady } from './PostFX';
import { Rng } from './rng';
import { ScoreManager, type RunStats } from './ScoreManager';
import { TrackGenerator } from './TrackGenerator';
import { StoryProps } from './StoryProps';
import { NpcManager } from './Npcs';
import { World } from './World';

export type EngineMode = 'menu' | 'showcase' | 'playing' | 'paused' | 'crashed' | 'over' | 'world';
export type Quality = 'alta' | 'media' | 'baixa';
export type PowerType = 'magnet' | 'double' | 'shield';

export interface RunOptions {
  mapId: string;
  characterId: string;
  skinId: string;
  baseMultiplier: number;
  /** Duração (s) de cada power-up, conforme as melhorias compradas. */
  durations: Record<PowerType, number>;
  seed?: number;
  /** Poder equipado (id em data/powers.ts), cargas disponíveis e duração (s). Sem isso, Carruagem com 0 cargas. */
  chariot?: { id?: string; charges: number; duration: number };
  /** Escala de velocidade (modo Criança < 1). Padrão 1 = Normal. */
  speedScale?: number;
  /** Escala da distância de aceleração (> 1 = acelera mais devagar). Padrão 1. */
  rampScale?: number;
}

export interface HudData {
  distance: number;
  score: number;
  coins: number;
  multiplier: number;
  speed: number;
  powers: { type: PowerType; remaining: number; total: number }[];
  /** Carruagem de Fogo: tempo restante, duração total e cargas da corrida. */
  boost: { remaining: number; total: number; charges: number };
}

type EngineEvents = {
  gameover: (stats: RunStats) => void;
  pickup: (e: PickupEvent) => void;
  stumble: () => void;
  shieldBreak: () => void;
  mode: (m: EngineMode) => void;
  /** Carruagem de Fogo ativada (gastou 1 carga). */
  boost: () => void;
  boostEnd: () => void;
  /** Pediu a carruagem sem cargas. */
  boostDenied: () => void;
};

/**
 * Núcleo do jogo: renderização, laço principal com subpassos fixos,
 * geração da pista, colisões, coleta e eventos para a interface.
 */
export class GameEngine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cameraCtl = new CameraController();
  /** Moradores do lobby (só aparecem no menu). */
  npcs!: NpcManager;
  /** Mundo Aberto (beta): praça para explorar a pé. */
  world!: World;
  readonly env: EnvironmentManager;
  readonly obstacles: ObstacleManager;
  readonly collectibles: CollectibleManager;
  readonly particles: ParticleSystem;
  readonly player: PlayerController;
  readonly score = new ScoreManager();
  readonly input: InputManager;
  readonly chariot = new ChariotPower();
  readonly boostFx: BoostEffect;
  /** Pós-processamento (bloom, gradação de cor, vinheta, FXAA) por qualidade. */
  readonly post: PostFX;
  mode: EngineMode = 'menu';
  distance = 0;
  speed = 0;
  autopilot = false;
  /** Vibrar o aparelho ao colidir (configurações). */
  vibration = true;
  /** Modo de teste: torna o jogador invencível. */
  godMode = false;

  private generator: TrackGenerator | null = null;
  private map: MapDef | null = null;
  private clock = new THREE.Timer();
  private raf = 0;
  private listeners: { [K in keyof EngineEvents]: EngineEvents[K][] } = {
    gameover: [],
    pickup: [],
    stumble: [],
    shieldBreak: [],
    mode: [],
    boost: [],
    boostEnd: [],
    boostDenied: [],
  };
  private frameListeners: ((hud: HudData) => void)[] = [];
  private runTime = 0;
  private crashTimer = 0;
  private lastStumble = -10;
  private sideCooldown = 0;
  private powers: Record<PowerType, { remaining: number; total: number }> = {
    magnet: { remaining: 0, total: 1 },
    double: { remaining: 0, total: 1 },
    shield: { remaining: 0, total: 1 },
  };
  private durations: Record<PowerType, number> = { magnet: 10, double: 10, shield: 12 };
  private pickups: PickupEvent[] = [];
  private quality: Quality = 'alta';
  private fpsAccum = 0;
  private fpsFrames = 0;
  private lowFpsSeconds = 0;
  private menuTime = 0;
  private resizeObs: ResizeObserver;
  private disposed = false;
  /** Pedra da Funda em voo. */
  private stone: THREE.Mesh;
  private stoneT = 0;
  private stoneTarget: ActiveObstacle | null = null;
  private stoneMiss = 0;
  /** Obstáculos afastados pelo Cajado (animação de abertura). */
  private parted: { o: ActiveObstacle; dir: number }[] = [];
  private hud: HudData = { distance: 0, score: 0, coins: 0, multiplier: 1, speed: 0, powers: [], boost: { remaining: 0, total: 1, charges: 0 } };
  /** Curva de velocidade da corrida atual (Normal ou Criança). */
  private speedAt: (d: number) => number = speedForDistance;

  constructor(private canvas: HTMLCanvasElement, inputTarget: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Curva própria (AgX "Punchy" + gradação quente), ver PostFX.ts.
    this.renderer.toneMapping = colorPipelineReady() ? THREE.CustomToneMapping : THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    // No three r187 o PCFShadowMap já é o filtro suave (disco de Vogel; suavidade = shadow.radius).
    // O antigo PCFSoftShadowMap foi removido e cairia neste mesmo modo.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // As estatísticas somam todos os passes do quadro (sombra, cena e pós).
    this.renderer.info.autoReset = false;

    this.env = new EnvironmentManager(this.scene);
    this.env.atmosphere.setRenderer(this.renderer);
    this.post = new PostFX(this.renderer, this.scene, this.cameraCtl.camera);
    this.obstacles = new ObstacleManager(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.collectibles = new CollectibleManager(this.scene, this.particles);
    this.player = new PlayerController(this.scene, 'davi', 'padrao');
    this.npcs = new NpcManager(this.scene);
    this.world = new World(this.scene);
    this.boostFx = new BoostEffect(this.scene);
    this.stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.9 }));
    this.stone.visible = false;
    this.scene.add(this.stone);
    this.scene.add(this.storyProps.group);
    this.player.onEvent = (e) => {
      if (this.mode !== 'playing') return;
      const r = this.score.run;
      if (e === 'jump') {
        r.jumps++;
        audio.play('jump');
      } else if (e === 'slide') {
        r.slides++;
        audio.play('slide');
        this.particles.burst(this.player.x, 0.1, 0.3, '#d9c49a', 6, 2, 0.6);
      } else if (e === 'land') {
        audio.play('land');
        this.particles.burst(this.player.x, 0.05, 0.2, '#d9c49a', 5, 1.5, 0.5);
      } else if (e === 'lane') {
        r.laneChanges++;
        audio.play('lane');
      }
    };
    this.input = new InputManager(inputTarget, (a) => this.handleAction(a));
    for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown'] as const) window.addEventListener(ev, this.unlockAudio, { passive: true, capture: true });
    this.input.enabled = false;

    this.setMap('jerusalem');
    this.setQuality('alta');
    this.cameraCtl.setMode('menu', true);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas.parentElement ?? canvas);
    this.resize();
    document.addEventListener('visibilitychange', this.onVisibility);
    this.loop();
  }

  // ------------------------------------------------------------- eventos
  on<K extends keyof EngineEvents>(ev: K, fn: EngineEvents[K]): () => void {
    (this.listeners[ev] as EngineEvents[K][]).push(fn);
    return () => {
      const arr = this.listeners[ev] as EngineEvents[K][];
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    };
  }

  onFrame(fn: (hud: HudData) => void): () => void {
    this.frameListeners.push(fn);
    return () => {
      const i = this.frameListeners.indexOf(fn);
      if (i >= 0) this.frameListeners.splice(i, 1);
    };
  }

  private emit<K extends keyof EngineEvents>(ev: K, ...args: Parameters<EngineEvents[K]>): void {
    for (const fn of this.listeners[ev] as ((...a: Parameters<EngineEvents[K]>) => void)[]) fn(...args);
  }

  private setMode(m: EngineMode): void {
    this.mode = m;
    this.input.enabled = m === 'playing';
    this.emit('mode', m);
  }

  // ------------------------------------------------------------- configuração
  setMap(mapId: string): void {
    if (this.map?.id === mapId) return;
    this.map = getMap(mapId);
    this.env.setTheme(this.map.theme);
    this.obstacles.setTheme(this.map.theme);
    this.collectibles.reset();
  }

  setCharacter(charId: string, skinId: string): void {
    this.player.setCharacter(charId, skinId);
  }

  setQuality(q: Quality): void {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    const cap = q === 'alta' ? 2 : q === 'media' ? 1.5 : 1;
    this.renderer.setPixelRatio(Math.min(dpr, cap));
    const shadows = q !== 'baixa';
    this.env.setShadows(shadows);
    this.player.setShadowsEnabled(shadows);
    this.env.atmosphere.setShadowQuality(q === 'alta' ? 2048 : 1024, q === 'alta' ? 2.5 : 1.6);
    this.env.atmosphere.setCloudDetail(q === 'alta' ? 16 : q === 'media' ? 12 : 8);
    this.post.setQuality(q);
    this.resize();
  }

  getQuality(): Quality {
    return this.quality;
  }

  setSwipeThreshold(px: number): void {
    this.input.threshold = px;
  }

  private resize = () => {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.cameraCtl.resize(w, h);
    this.post?.setSize(w, h);
  };

  private unlockAudio = () => audio.unlock();

  private onVisibility = () => {
    if (document.hidden && this.mode === 'playing') this.pause();
    audio.setHidden(document.hidden);
  };

  // ------------------------------------------------------------- telas
  /** Entra no Mundo Aberto: esconde a pista e mostra a praça. */
  enterWorld(charId: string, skinId: string): void {
    this.stopChariot();
    this.obstacles.reset();
    this.collectibles.reset();
    this.particles.clear();
    this.storyProps.clear();
    this.generator = null;
    this.npcs.hide();
    this.setMap('jerusalem');
    this.player.root.visible = false;
    this.env.root.visible = false;
    this.world.enter(charId, skinId, this.map!.theme);
    this.setMode('world');
    audio.playMusic('menu');
  }

  showMenu(view: 'menu' | 'showcase' = 'menu'): void {
    this.world.leave();
    this.player.root.visible = true;
    this.env.root.visible = true;
    this.stopChariot();
    if (view === 'menu') this.npcs.show();
    else this.npcs.hide();
    this.obstacles.reset();
    this.collectibles.reset();
    this.particles.clear();
    this.generator = null;
    this.player.reset();
    this.player.setShield(false);
    this.player.animator.setState('idle');
    this.player.rig.root.rotation.y = 0;
    this.cameraCtl.setMode(view);
    this.menuTime = 0;
    this.setMode(view === 'menu' ? 'menu' : 'showcase');
  }

  celebrate(): void {
    this.player.animator.setState('celebrate');
    this.menuTime = -2.5;
  }

  startRun(opts: RunOptions): void {
    this.npcs.hide();
    this.world.leave();
    this.player.root.visible = true;
    this.env.root.visible = true;
    this.stopChariot();
    const powerDef = getPower(opts.chariot?.id ?? 'chariot');
    this.chariot.configure(opts.chariot?.charges ?? 0, opts.chariot?.duration ?? CHARIOT.baseDuration, powerDef);
    this.boostFx.setStyle(powerDef.glow, powerDef.id === 'chariot');
    this.parted.length = 0;
    this.storyProps.clear();
    this.speedAt = scaledSpeedCurve(opts.speedScale ?? 1, opts.rampScale ?? 1);
    this.setMap(opts.mapId);
    this.setCharacter(opts.characterId, opts.skinId);
    this.durations = { ...opts.durations };
    this.obstacles.reset();
    this.collectibles.reset();
    this.particles.clear();
    this.player.reset();
    this.player.rig.root.rotation.y = 0;
    this.player.setShield(false);
    for (const k of Object.keys(this.powers) as PowerType[]) this.powers[k].remaining = 0;
    this.distance = 0;
    this.speed = 0;
    this.runTime = 0;
    this.lastStumble = -10;
    this.sideCooldown = 0;
    this.score.start(opts.mapId, opts.characterId, opts.baseMultiplier);
    const rng = new Rng(opts.seed ?? (Date.now() ^ (Math.random() * 1e9)));
    this.generator = new TrackGenerator(this.map!.theme.catalog, rng, {
      obstacle: (o) => this.obstacles.spawn(o),
      collectible: (c) => this.collectibles.spawn(c),
    });
    this.generator.generateUntil(SPAWN_AHEAD, this.speedAt);
    this.cameraCtl.setMode('follow');
    this.setMode('playing');
    audio.playMusic('game');
  }

  /** Figuras da história ao lado da pista (modo "Viver a história"). */
  readonly storyProps = new StoryProps();

  spawnStoryProps(emojis: string[], count?: number): void {
    this.storyProps.spawn(emojis, this.distance, count);
  }

  pause(): void {
    if (this.mode !== 'playing') return;
    audio.setBoostLoop(false);
    this.setMode('paused');
    audio.setPaused(true);
  }

  resume(): void {
    if (this.mode !== 'paused') return;
    this.clock.update();
    this.setMode('playing');
    audio.setPaused(false);
  }

  /** Continua a corrida após uma colisão. */
  revive(): void {
    if (this.mode !== 'over' && this.mode !== 'crashed') return;
    this.score.run.revived = true;
    this.obstacles.clearRange(this.distance - DESPAWN_BEHIND, this.distance + 40);
    this.player.crashed = false;
    this.player.y = 0;
    this.player.vy = 0;
    this.player.grounded = true;
    this.player.invulnerable = 2.5;
    this.player.animator.setState('run');
    this.cameraCtl.setMode('follow');
    this.speed = this.speedAt(this.distance) * 0.6;
    this.setMode('playing');
    audio.setPaused(false);
    audio.playMusic('game');
  }

  /** Encerra a corrida sem reviver (vai para o fim de partida). */
  getRunStats(): RunStats {
    return { ...this.score.run, distance: Math.floor(this.score.run.distance), score: Math.floor(this.score.run.score) };
  }

  // ------------------------------------------------------------- entrada
  private handleAction(a: GameAction): void {
    if (a === 'pause') {
      if (this.mode === 'playing') this.pause();
      return;
    }
    if (this.mode !== 'playing') return;
    const p = this.player;
    if (a === 'left') p.moveLane(-1);
    else if (a === 'right') p.moveLane(1);
    else if (a === 'jump') p.jump();
    else if (a === 'slide') p.slide();
    else if (a === 'boost') this.activateBoost();
  }

  // ------------------------------------------------------------- Poderes (Carruagem, Funda, Cajado, Manto, Harpa, Sansão)
  /** Usa o poder equipado (toque duplo, tecla E ou botão do HUD). */
  activateBoost(): boolean {
    if (this.mode !== 'playing') return false;
    if (!this.chariot.activate()) {
      if (this.chariot.charges <= 0 && !this.chariot.active) this.emit('boostDenied');
      return false;
    }
    this.score.run.boosts++;
    const fx = this.chariot.def.effects;
    if (fx.stone) {
      this.throwStone();
    } else {
      this.boostFx.pulse();
      this.cameraCtl.addShake(this.chariot.def.id === 'chariot' ? 0.35 : 0.2);
      audio.play(this.chariot.def.id === 'chariot' ? 'chariot' : 'powerup');
    }
    this.emit('boost');
    return true;
  }

  /** Funda de Davi: a pedra destrói o primeiro obstáculo à frente na pista do herói. */
  private throwStone(): void {
    const p = this.player;
    let best: ActiveObstacle | null = null;
    for (const o of this.obstacles.active) {
      if (o.hit) continue;
      const s = o.spec;
      if (s.d + s.length < this.distance - 0.5 || s.d > this.distance + 34) continue;
      if (Math.abs(o.x - p.x) > o.box.hw + 0.6) continue;
      if (!best || s.d < best.spec.d) best = o;
    }
    this.stone.visible = true;
    this.stone.position.set(p.x, p.y + 1.1, -0.3);
    this.stoneT = 0;
    this.stoneTarget = best;
    audio.play('jump');
    if (!best) this.stoneMiss = this.distance + 34;
  }

  private updateStone(dt: number): void {
    if (!this.stone.visible) return;
    this.stoneT += dt;
    const t = Math.min(1, this.stoneT / 0.28);
    const o = this.stoneTarget;
    const zTarget = o ? o.mesh.position.z : -(this.stoneMiss - this.distance);
    this.stone.position.z = -0.3 + (zTarget + 0.3) * t;
    this.stone.position.y = this.player.y + 1.1 + Math.sin(t * Math.PI) * 1.2 - t * 0.5;
    this.stone.position.x += ((o ? o.x : this.player.x) - this.stone.position.x) * Math.min(1, dt * 12);
    this.stone.rotation.x += dt * 20;
    if (t >= 1) {
      this.stone.visible = false;
      if (o && !o.hit) this.destroyObstacle(o, 30);
    }
  }

  /** Obstáculo destruído por um poder: arremessado em pedaços, com pontos. */
  private destroyObstacle(o: ActiveObstacle, points: number): void {
    o.hit = true;
    const z = o.mesh.position.z;
    this.boostFx.fling(o.mesh, o.mesh.position.x, z, this.player.x);
    o.mesh.visible = false;
    this.particles.burst(o.mesh.position.x, 0.9, z, this.chariot.def.color, 16, 6, 3);
    this.particles.burst(o.mesh.position.x, 0.6, z, '#ffffff', 8, 4, 2);
    this.cameraCtl.addShake(0.22);
    this.score.run.smashed++;
    this.score.addBonus(points);
    audio.play('smash');
  }

  /** Cajado de Moisés: os obstáculos à frente na pista do herói se afastam para os lados. */
  private partObstacles(dt: number): void {
    const p = this.player;
    if (this.chariot.active) {
      for (const o of this.obstacles.active) {
        if (o.hit || o.spec.fullWidth) continue;
        const s = o.spec;
        if (s.d + s.length < this.distance - 1 || s.d > this.distance + 28) continue;
        if (Math.abs(o.x - p.x) > o.box.hw + 0.7) continue;
        o.hit = true;
        this.parted.push({ o, dir: o.x <= p.x ? -1 : 1 });
        this.particles.burst(o.x, 0.5, o.mesh.position.z, this.chariot.def.color, 10, 4, 2);
      }
    }
    for (let i = this.parted.length - 1; i >= 0; i--) {
      const { o, dir } = this.parted[i];
      if (!o.mesh.parent || o.mesh.position.z > 12) {
        this.parted.splice(i, 1);
        continue;
      }
      o.mesh.position.x += (dir * 6.2 - o.mesh.position.x) * Math.min(1, dt * 7);
      o.mesh.rotation.z = -dir * Math.min(0.25, Math.abs(o.mesh.position.x) * 0.05);
    }
  }

  private stopChariot(): void {
    this.chariot.stop();
    this.stone.visible = false;
    this.parted.length = 0;
    this.boostFx.reset();
    audio.setBoostLoop(false);
  }

  /** Carruagem / Sansão: os obstáculos no caminho são arremessados em vez de bater. */
  private smashObstacles(): void {
    const p = this.player;
    const box = { x: p.x, y: 0, height: 3.4, hw: 0.8, hd: 0.9 };
    const points = this.chariot.def.id === 'sansao' ? 50 : 20;
    for (let k = 0; k < 6; k++) {
      const hit = this.obstacles.checkCollision(box, this.distance, false);
      if (!hit) return;
      this.destroyObstacle(hit.obstacle, points);
    }
  }

  /** Manto de Elias: o herói atravessa os obstáculos sem destruí-los. */
  private passThrough(): void {
    const box = this.player.getBox();
    for (let k = 0; k < 6; k++) {
      const hit = this.obstacles.checkCollision(box, this.distance, false);
      if (!hit) return;
      hit.obstacle.hit = true;
      this.particles.burst(this.player.x, 1, 0, this.chariot.def.color, 8, 3, 1.5);
    }
  }

  /** Permite que a interface envie comandos (ex.: botões de teste). */
  action(a: GameAction): void {
    this.handleAction(a);
  }

  // ------------------------------------------------------------- laço
  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    this.clock.update();
    const rawDt = Math.min(this.clock.getDelta(), 0.1);
    this.trackFps(rawDt);
    const dt = Math.min(rawDt, 1 / 20);

    if (this.mode === 'playing' || this.mode === 'crashed') {
      // subpassos fixos: colisões confiáveis mesmo em quadros lentos
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let i = 0; i < steps && (this.mode === 'playing' || this.mode === 'crashed'); i++) this.step(h);
    } else if (this.mode === 'menu' || this.mode === 'showcase') {
      this.menuTime += dt;
      const anim = this.player.animator;
      if (this.mode === 'showcase') {
        this.player.rig.root.rotation.y = Math.sin(this.menuTime * 0.6) * 0.6;
      } else {
        this.player.rig.root.rotation.y += (0 - this.player.rig.root.rotation.y) * 0.1;
        if (this.menuTime > 5) {
          anim.setState('celebrate');
          this.menuTime = -1.6;
        } else if (this.menuTime > 0 && anim.state === 'celebrate') {
          anim.setState('idle');
        }
      }
      anim.update(dt, 0);
      this.npcs.update(dt, 0);
      this.env.update(0, dt);
      this.particles.update(dt, 0);
    }
    if (this.mode === 'world') {
      this.world.update(dt, this.cameraCtl.camera);
      this.env.update(0, dt);
    } else {
      const camSpeed = this.mode === 'playing' || this.mode === 'crashed' ? this.speed : 0;
      this.storyProps.update(this.distance, dt);
      this.cameraCtl.update(dt, this.player.x, this.player.y, camSpeed);
      this.boostFx.applyCamera(this.cameraCtl.camera, dt);
    }
    this.env.atmosphere.setHeroFill(this.mode === 'menu' || this.mode === 'showcase' ? 1 : 0, dt);
    this.renderer.info.reset();
    this.post.render(dt);

    if (this.frameListeners.length && (this.mode === 'playing' || this.mode === 'paused' || this.mode === 'crashed')) {
      this.updateHud();
      for (const fn of this.frameListeners) fn(this.hud);
    }
  };

  private updateHud(): void {
    const r = this.score.run;
    this.hud.distance = Math.floor(r.distance);
    this.hud.score = Math.floor(r.score);
    this.hud.coins = r.coins;
    this.hud.multiplier = this.score.multiplier;
    this.hud.speed = this.speed;
    this.hud.powers.length = 0;
    for (const t of ['magnet', 'double', 'shield'] as PowerType[]) {
      const p = this.powers[t];
      if (p.remaining > 0) this.hud.powers.push({ type: t, remaining: p.remaining, total: p.total });
    }
    this.hud.boost.remaining = this.chariot.remaining;
    this.hud.boost.total = this.chariot.duration;
    this.hud.boost.charges = this.chariot.charges;
  }

  private step(dt: number): void {
    const p = this.player;
    if (this.mode === 'crashed') {
      this.crashTimer -= dt;
      this.speed *= Math.exp(-dt * 6);
      const dd = this.speed * dt;
      this.distance += dd;
      p.update(dt, 0);
      this.obstacles.update(this.distance, dt);
      this.env.update(dd, dt);
      this.particles.update(dt, dd);
      this.boostFx.update(dt, dd, 0, p.x, p.y, p.sliding, this.speed);
      if (this.crashTimer <= 0) {
        this.setMode('over');
        this.emit('gameover', this.getRunStats());
      }
      return;
    }

    this.runTime += dt;
    // Carruagem de Fogo: tempo, velocidade extra e proteção final
    if (this.chariot.update(dt) === 'ended') {
      p.invulnerable = Math.max(p.invulnerable, CHARIOT.tailProtection);
      audio.play(this.chariot.def.id === 'chariot' ? 'chariotEnd' : 'uiBack');
      this.emit('boostEnd');
    }
    audio.setBoostLoop(this.chariot.active && this.chariot.def.id === 'chariot');
    const target = this.speedAt(this.distance) * this.chariot.speedMul;
    const ramp = Math.min(1, this.runTime / 1.2);
    this.speed += (target * (0.35 + 0.65 * ramp) - this.speed) * Math.min(1, dt * 4);
    const dd = this.speed * dt;
    this.distance += dd;
    this.score.addDistance(dd, dt);

    this.generator!.generateUntil(this.distance + SPAWN_AHEAD, this.speedAt);
    this.generator!.prune(this.distance);

    if (this.autopilot) this.runAutopilot();

    p.update(dt, this.speed);
    this.obstacles.update(this.distance, dt);
    this.env.update(dd, dt);
    this.particles.update(dt, dd);
    this.boostFx.update(dt, dd, this.chariot.intensity, p.x, p.y, p.sliding, this.speed);

    // power-ups
    for (const t of ['magnet', 'double', 'shield'] as PowerType[]) {
      const pw = this.powers[t];
      if (pw.remaining > 0) {
        pw.remaining -= dt;
        if (pw.remaining <= 0) {
          pw.remaining = 0;
          if (t === 'shield') p.setShield(false);
        }
      }
    }
    this.score.doubleActive = this.powers.double.remaining > 0 || (this.chariot.active && this.chariot.def.effects.doubleCoins);

    // coleta
    const box = p.getBox();
    this.pickups.length = 0;
    const magnet = this.powers.magnet.remaining > 0 || (this.chariot.active && this.chariot.def.effects.magnet);
    this.collectibles.update(this.distance, dt, p.x, p.y, box.height, magnet, this.pickups);
    for (const e of this.pickups) this.handlePickup(e);

    // colisão
    if (this.sideCooldown > 0) this.sideCooldown -= dt;
    this.updateStone(dt);
    if (this.chariot.def.effects.part) this.partObstacles(dt);
    if (this.chariot.shielding) {
      if (this.chariot.def.effects.smash) this.smashObstacles();
      else this.passThrough();
    } else if (p.invulnerable <= 0 && !this.godMode) {
      const hit = this.obstacles.checkCollision(box, this.distance, p.laneMoving);
      if (hit) {
        if (hit.side) {
          if (this.sideCooldown <= 0) {
            this.sideCooldown = 0.45;
            p.bounceBack();
            p.stumble();
            this.cameraCtl.addShake(0.6);
            this.score.run.stumbles++;
            if (this.runTime - this.lastStumble < 3.5) {
              this.crash();
            } else {
              this.lastStumble = this.runTime;
              audio.play('stumble');
              this.emit('stumble');
            }
          }
        } else if (this.powers.shield.remaining > 0) {
          this.powers.shield.remaining = 0;
          p.setShield(false);
          p.invulnerable = 1.2;
          hit.obstacle.hit = true;
          hit.obstacle.mesh.visible = false;
          this.particles.burst(hit.obstacle.x, 1, 0, '#8fd0ff', 24, 6, 2);
          this.cameraCtl.addShake(0.4);
          audio.play('shieldBreak');
          this.emit('shieldBreak');
        } else {
          this.crash();
        }
      }
    }
  }

  private crash(): void {
    audio.setBoostLoop(false);
    this.player.crash();
    this.cameraCtl.addShake(1);
    this.cameraCtl.setMode('crash');
    this.crashTimer = 1.25;
    this.setMode('crashed');
    audio.play('crash');
    audio.stopMusic(false);
    if (this.vibration) vibrate(180);
  }

  private handlePickup(e: PickupEvent): void {
    const r = this.score.run;
    switch (e.type) {
      case 'coin':
        r.coins += this.chariot.active && this.chariot.def.effects.doubleCoins ? 2 : 1;
        audio.play('coin');
        break;
      case 'scroll':
        r.scrolls++;
        this.score.addBonus(250);
        audio.play('scroll');
        break;
      case 'relic':
        r.relics++;
        this.score.addBonus(500);
        audio.play('relic');
        break;
      case 'magnet':
      case 'double':
      case 'shield': {
        const d = this.durations[e.type];
        this.powers[e.type] = { remaining: d, total: d };
        if (e.type === 'shield') this.player.setShield(true);
        r.powerups++;
        audio.play('powerup');
        break;
      }
    }
    this.emit('pickup', e);
  }

  /** Piloto automático usado nos testes: segue a pista segura planejada. */
  private runAutopilot(): void {
    const gen = this.generator!;
    const p = this.player;
    const d = this.distance;
    const row = gen.rows.find((r) => r.end + 0.6 > d);
    if (!row) return;
    const dist = row.d - d;
    // trocar de pista quando o caminho até a pista segura estiver livre
    if (p.lane !== row.safeLane) {
      const dir = row.safeLane > p.lane ? 1 : -1;
      const next = p.lane + dir;
      const lead = this.speed * 0.2;
      if (!this.obstacles.laneOccupied(next, d - 0.9, d + lead + 0.9, dist > lead + 1.5)) p.moveLane(dir as 1 | -1);
    }
    const inLane = Math.abs(p.x - LANE_X[row.safeLane]) < 0.5;
    if (row.action === 'jump' && p.grounded && dist < 0.55 + this.speed * 0.1 && dist > -0.5 && inLane) p.jump();
    if (row.action === 'slide' && !p.sliding && dist < 0.5 + this.speed * 0.16 && dist > -0.4) p.slide();
  }

  /**
   * Simulação acelerada (sem renderizar), usada nos testes automatizados.
   * Retorna quantos segundos de jogo foram simulados.
   */
  simulate(seconds: number, dt = 1 / 60): number {
    let t = 0;
    while (t < seconds && (this.mode === 'playing' || this.mode === 'crashed')) {
      this.step(dt);
      t += dt;
    }
    // o tempo também passou para a câmera (transições concluídas)
    this.cameraCtl.advance(t, this.player.x, this.player.y);
    return t;
  }

  // ------------------------------------------------------------- desempenho
  private trackFps(dt: number): void {
    this.fpsAccum += dt;
    this.fpsFrames++;
    if (this.fpsAccum >= 1) {
      const fps = this.fpsFrames / this.fpsAccum;
      this.fpsAccum = 0;
      this.fpsFrames = 0;
      if (this.mode === 'playing' && fps < 38) this.lowFpsSeconds++;
      else this.lowFpsSeconds = Math.max(0, this.lowFpsSeconds - 1);
      if (this.lowFpsSeconds >= 4 && this.autoQuality) {
        this.lowFpsSeconds = 0;
        if (this.quality === 'alta') this.setQuality('media');
        else if (this.quality === 'media') this.setQuality('baixa');
      }
      this.lastFps = fps;
    }
  }
  autoQuality = true;
  lastFps = 60;

  getStats() {
    const info = this.renderer.info;
    return {
      fps: this.lastFps,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      obstacles: this.obstacles.active.length,
      mode: this.mode,
      distance: this.distance,
      speed: this.speed,
    };
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.input.dispose();
    document.removeEventListener('visibilitychange', this.onVisibility);
    for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown'] as const) window.removeEventListener(ev, this.unlockAudio, { capture: true });
    this.post.dispose();
    this.renderer.dispose();
  }
}
