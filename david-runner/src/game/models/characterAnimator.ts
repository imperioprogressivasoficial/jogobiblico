import type { CharacterRig } from './characterModel';

export type AnimState = 'run' | 'jump' | 'slide' | 'crash' | 'idle' | 'celebrate' | 'stumble' | 'laneLeft' | 'laneRight';

interface Pose {
  pivotY: number;
  pivotRotX: number;
  pivotRotZ: number;
  torsoX: number;
  torsoY: number;
  headX: number;
  armLX: number;
  armLZ: number;
  armRX: number;
  armRZ: number;
  foreLX: number;
  foreRX: number;
  legLX: number;
  legRX: number;
  shinLX: number;
  shinRX: number;
}

const KEYS: (keyof Pose)[] = [
  'pivotY', 'pivotRotX', 'pivotRotZ', 'torsoX', 'torsoY', 'headX', 'armLX', 'armLZ', 'armRX', 'armRZ',
  'foreLX', 'foreRX', 'legLX', 'legRX', 'shinLX', 'shinRX',
];

/**
 * Animação procedural por poses: cada estado calcula uma pose-alvo e as
 * articulações interpolam suavemente até ela (transições sem "estalos").
 */
export class CharacterAnimator {
  private cur: Pose;
  private time = 0;
  private runPhase = 0;
  state: AnimState = 'idle';
  stateTime = 0;
  /** Inclinação lateral ao trocar de pista (-1..1). */
  lean = 0;
  /** Velocidade vertical (para a pose de pulo). */
  vy = 0;

  constructor(private rig: CharacterRig) {
    this.cur = this.idlePose(0);
    this.apply(this.cur);
  }

  setRig(rig: CharacterRig): void {
    this.rig = rig;
    this.apply(this.cur);
  }

  setState(s: AnimState): void {
    if (s !== this.state) {
      this.state = s;
      this.stateTime = 0;
    }
  }

  update(dt: number, runSpeed: number): void {
    this.time += dt;
    this.stateTime += dt;
    this.runPhase += dt * (5.5 + runSpeed * 0.32);
    const target = this.targetPose();
    const sharp = this.state === 'crash' ? 9 : this.state === 'slide' || this.state === 'jump' ? 20 : 14;
    const k = 1 - Math.exp(-dt * sharp);
    for (const key of KEYS) this.cur[key] += (target[key] - this.cur[key]) * k;
    this.apply(this.cur);
  }

  private targetPose(): Pose {
    switch (this.state) {
      case 'run':
      case 'laneLeft':
      case 'laneRight':
      case 'stumble':
        return this.runPose();
      case 'jump':
        return this.jumpPose();
      case 'slide':
        return this.slidePose();
      case 'crash':
        return this.crashPose();
      case 'celebrate':
        return this.celebratePose();
      case 'idle':
      default:
        return this.idlePose(this.time);
    }
  }

  private runPose(): Pose {
    const p = this.runPhase;
    const s = Math.sin(p);
    const c = Math.cos(p);
    const stumble = this.state === 'stumble' && this.stateTime < 0.35 ? Math.sin(this.stateTime * 18) * 0.25 : 0;
    return {
      pivotY: this.rig.hipHeight + Math.abs(c) * 0.07 - 0.03,
      pivotRotX: 0,
      pivotRotZ: this.lean * -0.22 + stumble,
      torsoX: -0.2,
      torsoY: s * 0.12,
      headX: 0.12,
      armLX: -s * 0.95,
      armLZ: -0.12,
      armRX: s * 0.95,
      armRZ: 0.12,
      foreLX: 1.35 + Math.max(0, -s) * 0.2,
      foreRX: 1.35 + Math.max(0, s) * 0.2,
      legLX: s * 0.95,
      legRX: -s * 0.95,
      shinLX: -0.25 - Math.max(0, -Math.sin(p + 0.9)) * 1.25,
      shinRX: -0.25 - Math.max(0, Math.sin(p + 0.9)) * 1.25,
    };
  }

  private jumpPose(): Pose {
    const rising = this.vy > 2;
    return {
      pivotY: this.rig.hipHeight,
      pivotRotX: rising ? -0.05 : 0.08,
      pivotRotZ: this.lean * -0.2,
      torsoX: -0.25,
      torsoY: 0,
      headX: 0.0,
      armLX: rising ? 0.6 : -0.2,
      armLZ: -0.9,
      armRX: rising ? 2.5 : 1.9,
      armRZ: 0.35,
      foreLX: 0.9,
      foreRX: 0.6,
      legLX: rising ? 1.15 : 0.6,
      legRX: rising ? -0.25 : 0.25,
      shinLX: rising ? -1.5 : -0.9,
      shinRX: rising ? -0.6 : -0.4,
    };
  }

  private slidePose(): Pose {
    return {
      pivotY: 0.34,
      pivotRotX: 1.2,
      pivotRotZ: 0,
      torsoX: -0.45,
      torsoY: 0,
      headX: -0.55,
      armLX: -0.9,
      armLZ: -0.5,
      armRX: 0.4,
      armRZ: 0.6,
      foreLX: 0.4,
      foreRX: 0.9,
      legLX: -0.05,
      legRX: -0.55,
      shinLX: -0.15,
      shinRX: -1.3,
    };
  }

  private crashPose(): Pose {
    const t = Math.min(1, this.stateTime / 0.5);
    return {
      pivotY: 0.82 - t * 0.56,
      pivotRotX: t * 1.45,
      pivotRotZ: 0.15,
      torsoX: -0.1,
      torsoY: 0.2,
      headX: -0.2,
      armLX: -1.0,
      armLZ: -1.5,
      armRX: -0.9,
      armRZ: 1.5,
      foreLX: 0.3,
      foreRX: 0.3,
      legLX: 0.5,
      legRX: 0.1,
      shinLX: -0.6,
      shinRX: -0.2,
    };
  }

  private celebratePose(): Pose {
    const t = this.stateTime;
    const bounce = Math.abs(Math.sin(t * 6));
    return {
      pivotY: this.rig.hipHeight + bounce * 0.18,
      pivotRotX: 0,
      pivotRotZ: Math.sin(t * 3) * 0.06,
      torsoX: 0.05,
      torsoY: Math.sin(t * 3) * 0.15,
      headX: -0.15,
      armLX: 0,
      armLZ: -2.6 - Math.sin(t * 12) * 0.2,
      armRX: 0,
      armRZ: 2.6 + Math.sin(t * 12) * 0.2,
      foreLX: 0.3,
      foreRX: 0.3,
      legLX: bounce * 0.3,
      legRX: -bounce * 0.1,
      shinLX: -bounce * 0.5,
      shinRX: -bounce * 0.3,
    };
  }

  private idlePose(t: number): Pose {
    const br = Math.sin(t * 2.2);
    return {
      pivotY: this.rig ? this.rig.hipHeight + br * 0.012 : 0.82,
      pivotRotX: 0,
      pivotRotZ: 0,
      torsoX: 0.02 + br * 0.02,
      torsoY: Math.sin(t * 0.7) * 0.08,
      headX: Math.sin(t * 0.9) * 0.05,
      armLX: 0.05,
      armLZ: -0.12 - br * 0.03,
      armRX: 0.1,
      armRZ: 0.12 + br * 0.03,
      foreLX: 0.25,
      foreRX: 1.5,
      legLX: 0.02,
      legRX: -0.02,
      shinLX: 0,
      shinRX: 0,
    };
  }

  private apply(p: Pose): void {
    const r = this.rig;
    r.pivot.position.y = p.pivotY;
    r.pivot.rotation.x = p.pivotRotX;
    r.pivot.rotation.z = p.pivotRotZ;
    r.torso.rotation.x = p.torsoX;
    r.torso.rotation.y = p.torsoY;
    r.head.rotation.x = p.headX;
    r.armL.rotation.x = p.armLX;
    r.armL.rotation.z = p.armLZ;
    r.armR.rotation.x = p.armRX;
    r.armR.rotation.z = p.armRZ;
    r.foreL.rotation.x = p.foreLX;
    r.foreR.rotation.x = p.foreRX;
    r.legL.rotation.x = p.legLX;
    r.legR.rotation.x = p.legRX;
    r.shinL.rotation.x = p.shinLX;
    r.shinR.rotation.x = p.shinRX;
  }
}
