import * as THREE from 'three';
import { getMap, type MapDef } from '../data/maps';
import { vibrate } from '../platform/native';
import { CHARIOT } from '../data/chariot';
import { audio } from './AudioManager';
import { BoostEffect } from './BoostEffect';
import { CameraController } from './CameraController';
import { ChariotPower } from './ChariotPower';
import { CollectibleManager, type PickupEvent } from './CollectibleManager';
import { DESPAWN_BEHIND, LANE_X, SPAWN_AHEAD, scaledSpeedCurve, speedForDistance } from './config';
import { EnvironmentManager } from './EnvironmentManager';
import { InputManager, type GameAction } from './InputManager';
import { ObstacleManager } from './ObstacleManager';
import { ParticleSystem } from './ParticleSystem';
import { PlayerController } from './PlayerController';
import { Rng } from './rng';
import { ScoreManager, type RunStats } from './ScoreManager';
import { TrackGenerator } from './TrackGenerator';

export type EngineMode = 'menu' | 'showcase' | 'playing' | 'paused' | 'crashed' | 'over';
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
  /** Carruagem de Fogo: cargas disponíveis e duração (s). Sem isso, 0 cargas. */
  chariot?: { charges: number; duration: number };
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
  readonly env: EnvironmentManager;
  readonly obstacles: ObstacleManager;
  readonly collectibles: CollectibleManager;
  readonly particles: ParticleSystem;
  readonly player: PlayerController;
  readonly score = new ScoreManager();
  readonly input: InputManager;
  readonly chariot = new ChariotPower();
  readonly boostFx: BoostEffect;
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
  private hud: HudData = { distance: 0, score: 0, coins: 0, multiplier: 1, speed: 0, powers: [], boost: { remaining: 0, total: 1, charges: 0 } };
  /** Curva de velocidade da corrida atual (Normal ou Criança). */
  private speedAt: (d: number) => number = speedForDistance;

  constructor(private canvas: HTMLCanvasElement, inputTarget: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.env = new EnvironmentManager(this.scene);
    this.obstacles = new ObstacleManager(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.collectibles = new CollectibleManager(this.scene, this.particles);
    this.player = new PlayerController(this.scene, 'davi', 'padrao');
    this.boostFx = new BoostEffect(this.scene);
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
  };

  private onVisibility = () => {
    if (document.hidden && this.mode === 'playing') this.pause();
    audio.setHidden(document.hidden);
  };

  // ------------------------------------------------------------- telas
  showMenu(view: 'menu' | 'showcase' = 'menu'): void {
    this.stopChariot();
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
    this.stopChariot();
    this.chariot.configure(opts.chariot?.charges ?? 0, opts.chariot?.duration ?? CHARIOT.baseDuration);
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

  // ------------------------------------------------------------- Carruagem de Fogo
  /** Chama a Carruagem de Fogo (toque duplo, tecla E ou botão do HUD). */
  activateBoost(): boolean {
    if (this.mode !== 'playing') return false;
    if (!this.chariot.activate()) {
      if (this.chariot.charges <= 0 && !this.chariot.active) this.emit('boostDenied');
      return false;
    }
    this.score.run.boosts++;
    this.boostFx.pulse();
    this.cameraCtl.addShake(0.35);
    audio.play('chariot');
    this.emit('boost');
    return true;
  }

  private stopChariot(): void {
    this.chariot.stop();
    this.boostFx.reset();
    audio.setBoostLoop(false);
  }

  /** Durante a carruagem, os obstáculos no caminho são arremessados em vez de bater. */
  private smashObstacles(): void {
    const p = this.player;
    const box = { x: p.x, y: 0, height: 3.4, hw: 0.8, hd: 0.9 };
    for (let k = 0; k < 6; k++) {
      const hit = this.obstacles.checkCollision(box, this.distance, false);
      if (!hit) return;
      const o = hit.obstacle;
      o.hit = true;
      const z = o.mesh.position.z;
      this.boostFx.fling(o.mesh, o.mesh.position.x, z, p.x);
      o.mesh.visible = false;
      this.particles.burst(o.mesh.position.x, 0.9, z, '#ffb02e', 16, 6, 3);
      this.particles.burst(o.mesh.position.x, 0.6, z, '#ff5a1f', 8, 4, 2);
      this.cameraCtl.addShake(0.22);
      this.score.run.smashed++;
      this.score.addBonus(20);
      audio.play('smash');
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
      this.env.update(0, dt);
      this.particles.update(dt, 0);
    }
    this.cameraCtl.update(dt, this.player.x, this.player.y);
    this.boostFx.applyCamera(this.cameraCtl.camera, dt);
    this.renderer.render(this.scene, this.cameraCtl.camera);

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
      audio.play('chariotEnd');
      this.emit('boostEnd');
    }
    audio.setBoostLoop(this.chariot.active);
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
    this.score.doubleActive = this.powers.double.remaining > 0;

    // coleta
    const box = p.getBox();
    this.pickups.length = 0;
    const magnet = this.powers.magnet.remaining > 0 || this.chariot.active;
    this.collectibles.update(this.distance, dt, p.x, p.y, box.height, magnet, this.pickups);
    for (const e of this.pickups) this.handlePickup(e);

    // colisão
    if (this.sideCooldown > 0) this.sideCooldown -= dt;
    if (this.chariot.shielding) {
      this.smashObstacles();
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
        r.coins++;
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
    this.renderer.dispose();
  }
}
