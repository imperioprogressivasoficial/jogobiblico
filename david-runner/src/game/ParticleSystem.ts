import * as THREE from 'three';

function dotTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

const MAX = 180;

/** Partículas simples num único THREE.Points (1 draw call, quantidade limitada). */
export class ParticleSystem {
  readonly points: THREE.Points;
  private pos = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 3);
  private vel = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private next = 0;
  private tmp = new THREE.Color();

  constructor(scene: THREE.Scene) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const m = new THREE.PointsMaterial({ size: 0.16, map: dotTexture(), vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = -100;
    scene.add(this.points);
  }

  burst(x: number, y: number, z: number, color: THREE.ColorRepresentation, count = 10, speed = 4, up = 2): void {
    this.tmp.set(color);
    for (let k = 0; k < count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % MAX;
      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI - Math.PI / 2;
      this.vel[i * 3] = Math.cos(a) * Math.cos(b) * speed;
      this.vel[i * 3 + 1] = Math.sin(b) * speed * 0.6 + up;
      this.vel[i * 3 + 2] = Math.sin(a) * Math.cos(b) * speed;
      this.life[i] = 0.45 + Math.random() * 0.35;
      const v = 0.85 + Math.random() * 0.3;
      this.col[i * 3] = this.tmp.r * v;
      this.col[i * 3 + 1] = this.tmp.g * v;
      this.col[i * 3 + 2] = this.tmp.b * v;
    }
  }

  /** `dd`: deslocamento do mundo neste quadro (as partículas ficam no chão). */
  update(dt: number, dd: number, worldAttached = true): void {
    let any = false;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[i * 3 + 1] = -100;
        continue;
      }
      this.vel[i * 3 + 1] -= 9 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt + (worldAttached ? dd * 0.6 : 0);
    }
    if (any) {
      this.points.geometry.getAttribute('position').needsUpdate = true;
      this.points.geometry.getAttribute('color').needsUpdate = true;
    }
  }

  clear(): void {
    this.life.fill(0);
    for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = -100;
    this.points.geometry.getAttribute('position').needsUpdate = true;
  }
}
