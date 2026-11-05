import * as THREE from 'three';
import { resolveLook } from '../data/characters';
import {
  FAST_FALL_VELOCITY,
  GRAVITY,
  JUMP_VELOCITY,
  LANE_CHANGE_TIME,
  LANE_X,
  PLAYER_HALF_DEPTH,
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SLIDE_HEIGHT,
  SLIDE_DURATION,
} from './config';
import { CharacterAnimator } from './models/characterAnimator';
import { buildCharacter, type CharacterRig } from './models/characterModel';
import { Materials } from './models/materials';
import type { PlayerBox } from './ObstacleManager';

export type PlayerEvent = 'jump' | 'slide' | 'land' | 'lane';

/** Movimentação do Davi (e dos demais heróis): pistas, pulo, deslize e animações. */
export class PlayerController {
  readonly root = new THREE.Group();
  rig: CharacterRig;
  readonly animator: CharacterAnimator;
  lane = 1;
  prevLane = 1;
  x = 0;
  y = 0;
  vy = 0;
  grounded = true;
  slideTimer = 0;
  slideQueued = false;
  jumpBuffer = 0;
  crashed = false;
  invulnerable = 0;
  private laneVel = 0;
  private blob: THREE.Mesh;
  private shieldBubble: THREE.Mesh;
  onEvent: (e: PlayerEvent) => void = () => {};

  constructor(scene: THREE.Scene, charId: string, skinId: string) {
    this.rig = buildCharacter(resolveLook(charId, skinId));
    this.root.add(this.rig.root);
    this.animator = new CharacterAnimator(this.rig);
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), Materials.shadowBlob);
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.03;
    this.root.add(this.blob);
    this.shieldBubble = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x7fc8ff, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    this.shieldBubble.position.y = 0.95;
    this.shieldBubble.scale.set(0.9, 1.05, 0.9);
    this.shieldBubble.visible = false;
    this.root.add(this.shieldBubble);
    scene.add(this.root);
  }

  setCharacter(charId: string, skinId: string): void {
    this.rig.dispose();
    this.rig = buildCharacter(resolveLook(charId, skinId));
    this.root.add(this.rig.root);
    this.animator.setRig(this.rig);
  }

  setShadowsEnabled(on: boolean): void {
    this.blob.visible = !on;
  }

  setShield(on: boolean): void {
    this.shieldBubble.visible = on;
  }

  reset(): void {
    this.lane = this.prevLane = 1;
    this.x = LANE_X[1];
    this.y = 0;
    this.vy = 0;
    this.grounded = true;
    this.slideTimer = 0;
    this.slideQueued = false;
    this.jumpBuffer = 0;
    this.crashed = false;
    this.invulnerable = 0;
    this.laneVel = 0;
    this.rig.root.rotation.set(0, 0, 0);
    this.rig.root.visible = true;
    this.animator.lean = 0;
    this.animator.setState('run');
    this.syncTransform();
  }

  get sliding(): boolean {
    return this.slideTimer > 0;
  }

  get laneMoving(): boolean {
    return Math.abs(this.x - LANE_X[this.lane]) > 0.12;
  }

  moveLane(dir: -1 | 1): boolean {
    if (this.crashed) return false;
    const target = this.lane + dir;
    if (target < 0 || target > 2) return false;
    this.prevLane = this.lane;
    this.lane = target;
    this.onEvent('lane');
    return true;
  }

  /** Volta para a pista anterior (batida lateral). */
  bounceBack(): void {
    this.lane = this.prevLane;
  }

  jump(): void {
    if (this.crashed) return;
    if (this.grounded) {
      this.slideTimer = 0;
      this.vy = JUMP_VELOCITY;
      this.grounded = false;
      this.slideQueued = false;
      this.onEvent('jump');
    } else {
      this.jumpBuffer = 0.16;
    }
  }

  slide(): void {
    if (this.crashed) return;
    if (this.grounded) {
      if (this.slideTimer <= 0) this.onEvent('slide');
      this.slideTimer = SLIDE_DURATION;
    } else {
      // no ar: desce rápido e desliza ao tocar o chão
      this.vy = Math.min(this.vy, FAST_FALL_VELOCITY);
      this.slideQueued = true;
      this.jumpBuffer = 0;
    }
  }

  update(dt: number, speed: number): void {
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.crashed) {
      this.animator.setState('crash');
      this.animator.update(dt, 0);
      this.syncTransform();
      return;
    }
    // troca de pista suave (mola criticamente amortecida)
    const tx = LANE_X[this.lane];
    const omega = 4.6 / LANE_CHANGE_TIME;
    const f = 1 + 2 * dt * omega;
    const oo = omega * omega;
    const hoo = dt * oo;
    const det = 1 / (f + dt * hoo);
    const newVel = (this.laneVel - hoo * (this.x - tx)) * det;
    this.x = (f * this.x + dt * this.laneVel + dt * hoo * tx) * det;
    this.laneVel = newVel;
    this.animator.lean = THREE.MathUtils.clamp(this.laneVel / 18, -1, 1);

    // vertical
    if (!this.grounded) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.grounded = true;
        this.onEvent('land');
        if (this.slideQueued) {
          this.slideQueued = false;
          this.slideTimer = SLIDE_DURATION;
          this.onEvent('slide');
        } else if (this.jumpBuffer > 0) {
          this.jumpBuffer = 0;
          this.jump();
        }
      }
    }
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (this.slideTimer > 0) this.slideTimer -= dt;

    if (this.sliding) this.animator.setState('slide');
    else if (!this.grounded) this.animator.setState('jump');
    else if (this.animator.state !== 'stumble' || this.animator.stateTime > 0.4) this.animator.setState('run');
    this.animator.vy = this.vy;
    this.animator.update(dt, speed);

    // pisca quando invulnerável
    this.rig.root.visible = this.invulnerable > 0 ? Math.floor(this.invulnerable * 12) % 2 === 0 : true;
    this.syncTransform();
  }

  stumble(): void {
    this.animator.setState('stumble');
  }

  crash(): void {
    this.crashed = true;
    this.slideTimer = 0;
    this.animator.setState('crash');
  }

  private syncTransform(): void {
    this.root.position.set(this.x, 0, 0);
    this.rig.root.position.y = this.y;
    this.blob.scale.setScalar(Math.max(0.4, 1 - this.y * 0.25));
  }

  getBox(): PlayerBox {
    return {
      x: this.x,
      y: this.y,
      height: this.sliding ? PLAYER_SLIDE_HEIGHT : PLAYER_HEIGHT,
      hw: PLAYER_HALF_WIDTH,
      hd: PLAYER_HALF_DEPTH,
    };
  }
}
