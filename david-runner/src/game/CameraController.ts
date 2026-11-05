import * as THREE from 'three';
import { MAX_SPEED, START_SPEED } from './config';

export type CameraMode = 'follow' | 'menu' | 'showcase' | 'crash';

const FOLLOW_OFFSET = new THREE.Vector3(0, 3.7, 6.6);
const FOLLOW_LOOK = new THREE.Vector3(0, 1.1, -8);
const MENU_POS = new THREE.Vector3(2.2, 2.2, -5.7);
const MENU_LOOK = new THREE.Vector3(-0.5, 1.8, 0);
const SHOWCASE_POS = new THREE.Vector3(0.6, 1.4, -5.3);
const SHOWCASE_LOOK = new THREE.Vector3(0.1, 0.45, 0);

/** Duração (s) das transições entre modos. */
const TRANSITION: Record<CameraMode, number> = { follow: 1.05, menu: 1.1, showcase: 0.9, crash: 0.45 };
/** Abertura extra (graus) na velocidade máxima. */
const SPEED_FOV = 8;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Câmera em terceira pessoa: transições em arco (com aceleração suave) entre
 * menu, vitrine e corrida, FOV que abre com a velocidade, balanço leve da
 * corrida, impacto amortecido na aterrissagem e tremor nas colisões.
 */
export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  mode: CameraMode = 'menu';
  private pos = new THREE.Vector3().copy(MENU_POS);
  private look = new THREE.Vector3().copy(MENU_LOOK);
  private shake = 0;
  private aspect = 1;
  // transição em arco
  private trans = 1;
  private transDur = 1;
  private fromPos = new THREE.Vector3();
  private fromLook = new THREE.Vector3();
  // FOV
  private fov = 60;
  private baseFov = 60;
  private speedK = 0;
  // balanço e aterrissagem
  private bobPhase = 0;
  private bobAmp = 0;
  private landOffset = 0;
  private landVel = 0;
  private prevPy = 0;
  private fallSpeed = 0;
  // vetores reaproveitados (nada de alocação por quadro)
  private tp = new THREE.Vector3();
  private tl = new THREE.Vector3();
  private pivot = new THREE.Vector3();
  private tmp = new THREE.Vector3();

  constructor() {
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 900);
    this.camera.position.copy(this.pos);
  }

  resize(w: number, h: number): void {
    this.aspect = w / h;
    this.camera.aspect = this.aspect;
    this.baseFov = this.fovFor(this.mode);
    if (this.trans >= 1) this.fov = this.runFov();
    this.applyFov();
  }

  /** FOV vertical do modo: em retrato abre para que as três pistas caibam na tela. */
  private fovFor(mode: CameraMode): number {
    const run = mode === 'follow' || mode === 'crash';
    const hHalf = THREE.MathUtils.degToRad(run ? 31 : 24);
    const v = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hHalf) / this.aspect));
    return THREE.MathUtils.clamp(v, run ? 58 : 45, run ? 82 : 72);
  }

  /** FOV alvo: o do modo + abertura pela velocidade (limitada para não distorcer em retrato). */
  private runFov(): number {
    return Math.min(this.baseFov + this.speedK * SPEED_FOV, Math.max(this.baseFov, 86));
  }

  private applyFov(): void {
    if (Math.abs(this.camera.fov - this.fov) < 0.01 && this.camera.aspect === this.aspect) return;
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
  }

  setMode(mode: CameraMode, instant = false): void {
    const changed = mode !== this.mode;
    this.mode = mode;
    this.baseFov = this.fovFor(mode);
    if (instant) {
      this.targets(0, 0);
      this.pos.copy(this.tp);
      this.look.copy(this.tl);
      this.fov = this.baseFov;
      this.trans = 1;
      this.applyFov();
      return;
    }
    if (!changed && this.trans >= 1 && mode !== 'follow') return;
    this.fromPos.copy(this.pos);
    this.fromLook.copy(this.look);
    this.transDur = TRANSITION[mode];
    this.trans = 0;
  }

  /** Avança o tempo da câmera sem renderizar (usado pela simulação acelerada). */
  advance(seconds: number, px: number, py: number): void {
    if (seconds <= 0) return;
    this.trans = Math.min(1, this.trans + seconds / this.transDur);
    if (this.trans >= 1) {
      this.targets(px, py);
      this.pos.copy(this.tp);
      this.look.copy(this.tl);
      this.fov = this.runFov();
      this.prevPy = py;
    }
  }

  addShake(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  /** Calcula posição e ponto de mira ideais do modo atual em `tp` / `tl`. */
  private targets(px: number, py: number): void {
    const p = this.tp;
    const l = this.tl;
    switch (this.mode) {
      case 'follow': {
        const portrait = this.aspect < 1;
        p.set(px * 0.72, FOLLOW_OFFSET.y + py * 0.35 + (portrait ? 0.5 : 0), FOLLOW_OFFSET.z + (portrait ? 0.6 : 0));
        l.set(px * 0.85, FOLLOW_LOOK.y + py * 0.5, FOLLOW_LOOK.z);
        break;
      }
      case 'crash':
        p.set(px * 0.6 + 2.2, 3.0, 5.2);
        l.set(px, 0.6, -1);
        break;
      case 'showcase':
        p.copy(SHOWCASE_POS);
        l.copy(SHOWCASE_LOOK);
        if (this.aspect < 0.8) {
          p.set(0.4, 1.5, -6.2);
          l.set(0.05, 0.25, 0);
        }
        break;
      case 'menu':
      default:
        p.copy(MENU_POS);
        l.copy(MENU_LOOK);
        if (this.aspect < 0.8) {
          p.set(0.8, 1.6, -4.7);
          l.set(0, 0.5, 0);
        }
    }
  }

  /**
   * @param px, py posição do jogador
   * @param speed velocidade atual (0 fora da corrida)
   */
  update(dt: number, px: number, py: number, speed = 0): void {
    this.targets(px, py);
    const running = this.mode === 'follow';

    // velocidade → FOV e intensidade do balanço
    const sk = running ? THREE.MathUtils.clamp((speed - START_SPEED * 0.5) / (MAX_SPEED - START_SPEED * 0.5), 0, 1) : 0;
    this.speedK += (sk - this.speedK) * (1 - Math.exp(-dt * 2.5));

    if (this.trans < 1) {
      // arco em volta do herói: interpola ângulo, raio e altura com aceleração suave
      this.trans = Math.min(1, this.trans + dt / this.transDur);
      const e = easeInOut(this.trans);
      this.pivot.set(px, 1, 0);
      const fx = this.fromPos.x - this.pivot.x;
      const fz = this.fromPos.z - this.pivot.z;
      const tx = this.tp.x - this.pivot.x;
      const tz = this.tp.z - this.pivot.z;
      const a0 = Math.atan2(fx, fz);
      let da = Math.atan2(tx, tz) - a0;
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      // no meio do arco a câmera se aproxima do herói e sobe: passa por cima da
      // rua sem atravessar as casas laterais (que começam a ~5 m do centro)
      const mid = Math.sin(Math.PI * e) * Math.min(1, Math.abs(da) / 2);
      const r = THREE.MathUtils.lerp(Math.hypot(fx, fz), Math.hypot(tx, tz), e) * (1 - 0.4 * mid);
      const a = a0 + da * e;
      const lift = mid * 1.7;
      this.pos.set(this.pivot.x + Math.sin(a) * r, THREE.MathUtils.lerp(this.fromPos.y, this.tp.y, e) + lift, this.pivot.z + Math.cos(a) * r);
      this.look.lerpVectors(this.fromLook, this.tl, e);
      this.fov = THREE.MathUtils.lerp(this.fov, this.runFov(), 1 - Math.exp(-dt * 5));
    } else {
      const rate = running ? 9 : 3.5;
      const k = 1 - Math.exp(-dt * rate);
      this.pos.lerp(this.tp, k);
      this.look.lerp(this.tl, k);
      this.fov += (this.runFov() - this.fov) * (1 - Math.exp(-dt * 4));
    }
    this.applyFov();

    // aterrissagem: mola amortecida acionada pela velocidade de queda
    if (dt > 0) {
      const vy = (py - this.prevPy) / dt;
      if (py > 0.02) this.fallSpeed = Math.max(0, -vy);
      if (running && this.prevPy > 0.02 && py <= 0.02) {
        this.landVel -= Math.min(1, this.fallSpeed / 22) * 2.6;
      }
      this.prevPy = py;
    }
    this.landVel += (-140 * this.landOffset - 16 * this.landVel) * dt;
    this.landOffset += this.landVel * dt;
    this.landOffset = THREE.MathUtils.clamp(this.landOffset, -0.35, 0.2);

    // balanço da corrida (só no chão)
    const grounded = py <= 0.02;
    const bobTarget = running && grounded ? 0.35 + 0.65 * this.speedK : 0;
    this.bobAmp += (bobTarget - this.bobAmp) * (1 - Math.exp(-dt * 6));
    this.bobPhase += dt * (7 + speed * 0.22);
    const bobY = -Math.abs(Math.sin(this.bobPhase)) * 0.045 * this.bobAmp;
    const roll = Math.sin(this.bobPhase) * 0.0045 * this.bobAmp;

    const cam = this.camera;
    cam.position.copy(this.pos);
    cam.position.y += bobY + this.landOffset;
    this.tmp.copy(this.look);
    this.tmp.y += bobY * 0.5 + this.landOffset * 0.6;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * 0.35;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
    }
    cam.lookAt(this.tmp);
    if (roll !== 0) cam.rotateZ(roll);
  }
}
