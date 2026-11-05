import * as THREE from 'three';

export type CameraMode = 'follow' | 'menu' | 'showcase' | 'crash';

const FOLLOW_OFFSET = new THREE.Vector3(0, 3.7, 6.6);
const FOLLOW_LOOK = new THREE.Vector3(0, 1.1, -8);
const MENU_POS = new THREE.Vector3(2.2, 2.2, -5.7);
const MENU_LOOK = new THREE.Vector3(-0.5, 1.8, 0);
const SHOWCASE_POS = new THREE.Vector3(0.6, 1.4, -5.3);
const SHOWCASE_LOOK = new THREE.Vector3(0.1, 0.45, 0);

/** Câmera em terceira pessoa com transições suaves, tremor e FOV adaptativo. */
export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  mode: CameraMode = 'menu';
  private pos = new THREE.Vector3().copy(MENU_POS);
  private look = new THREE.Vector3().copy(MENU_LOOK);
  private shake = 0;
  private aspect = 1;
  private transitionSpeed = 3;
  private blend = 1;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 900);
    this.camera.position.copy(this.pos);
  }

  resize(w: number, h: number): void {
    this.aspect = w / h;
    this.camera.aspect = this.aspect;
    this.updateFov();
  }

  private updateFov(): void {
    // Em retrato, abre o FOV vertical para que as três pistas caibam na tela.
    const hHalf = THREE.MathUtils.degToRad(this.mode === 'follow' || this.mode === 'crash' ? 31 : 24);
    const v = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hHalf) / this.aspect));
    const min = this.mode === 'follow' || this.mode === 'crash' ? 58 : 45;
    this.camera.fov = THREE.MathUtils.clamp(v, min, this.mode === 'follow' || this.mode === 'crash' ? 82 : 72);
    this.camera.updateProjectionMatrix();
  }

  setMode(mode: CameraMode, instant = false): void {
    this.mode = mode;
    this.transitionSpeed = mode === 'follow' ? 2.6 : 3.5;
    this.blend = 0;
    this.updateFov();
    if (instant) {
      const [p, l] = this.targets(0, 0);
      this.pos.copy(p);
      this.look.copy(l);
    }
  }

  addShake(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  private targets(px: number, py: number): [THREE.Vector3, THREE.Vector3] {
    const p = new THREE.Vector3();
    const l = new THREE.Vector3();
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
    return [p, l];
  }

  update(dt: number, px: number, py: number): void {
    const [tp, tl] = this.targets(px, py);
    // transição lenta ao trocar de modo, depois acompanhamento firme
    this.blend = Math.min(1, this.blend + dt * 0.9);
    const rate = this.mode === 'follow' ? this.transitionSpeed + (9 - this.transitionSpeed) * this.blend : this.transitionSpeed;
    const followK = 1 - Math.exp(-dt * rate);
    this.pos.lerp(tp, followK);
    this.look.lerp(tl, followK);
    this.camera.position.copy(this.pos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * 0.35;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(this.look);
  }
}
