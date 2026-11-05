import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
  // ----- parte visual (não interfere na física)
  private blob: THREE.Mesh;
  private blobMat: THREE.MeshBasicMaterial;
  private shieldBubble: THREE.Mesh;
  private shieldMat: THREE.ShaderMaterial;
  private stars: THREE.Mesh;
  private visualY = 0;
  private visualVy = 0;
  private fxTime = 0;
  private readonly tmpV = new THREE.Vector3();
  onEvent: (e: PlayerEvent) => void = () => {};

  constructor(scene: THREE.Scene, charId: string, skinId: string) {
    this.rig = buildCharacter(resolveLook(charId, skinId));
    this.root.add(this.rig.root);
    this.animator = new CharacterAnimator(this.rig);

    // sombra de contato suave (degradê radial por transparência nos vértices)
    this.blobMat = new THREE.MeshBasicMaterial({ color: 0x1c0e05, vertexColors: true, transparent: true, opacity: 0.4, depthWrite: false });
    this.blob = new THREE.Mesh(softDiscGeometry(0.62), this.blobMat);
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.03;
    this.blob.renderOrder = 1;
    this.root.add(this.blob);

    // bolha do Escudo da Fé: brilho na borda (fresnel) com faixas de luz
    this.shieldMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCore: { value: new THREE.Color(0x6fc4ff) }, uRim: { value: new THREE.Color(0xfff1b8) } },
      vertexShader: SHIELD_VS,
      fragmentShader: SHIELD_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(1.1, 28, 18), this.shieldMat);
    this.shieldBubble.position.y = 0.95;
    this.shieldBubble.scale.set(0.92, 1.05, 0.92);
    this.shieldBubble.visible = false;
    this.shieldBubble.renderOrder = 2;
    this.root.add(this.shieldBubble);

    // estrelinhas girando na cabeça depois da colisão
    this.stars = new THREE.Mesh(starsGeometry(), new THREE.MeshBasicMaterial({ color: 0xffd447 }));
    this.stars.visible = false;
    this.root.add(this.stars);
    scene.add(this.root);
  }

  setCharacter(charId: string, skinId: string): void {
    this.rig.dispose();
    this.rig = buildCharacter(resolveLook(charId, skinId));
    this.root.add(this.rig.root);
    this.animator.setRig(this.rig);
  }

  setShadowsEnabled(on: boolean): void {
    // com sombra real a mancha vira só um "contato" mais leve sob os pés
    this.blobMat.opacity = on ? 0.26 : 0.45;
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
    this.visualY = 0;
    this.visualVy = 0;
    this.stars.visible = false;
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
    this.fxTime += dt;
    if (this.crashed) {
      this.animator.setState('crash');
      this.animator.update(dt, 0);
      // só visual: se bateu no ar, o corpo cai até o chão
      this.visualVy -= GRAVITY * dt;
      this.visualY = Math.max(0, this.visualY + this.visualVy * dt);
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
    this.visualY = this.y;
    this.visualVy = Math.min(0, this.vy);
    this.animator.setState('crash');
  }

  private syncTransform(): void {
    this.root.position.set(this.x, 0, 0);
    if (!this.crashed) {
      this.visualY = this.y;
      this.visualVy = 0;
    }
    const y = this.visualY;
    this.rig.root.position.y = y;
    // sombra: encolhe e clareia no ar; alonga no deslize
    const s = Math.max(0.35, 1 - y * 0.28);
    const sliding = this.sliding || this.animator.state === 'crash';
    this.blob.scale.set(s * (sliding ? 1.05 : 0.9), s * (sliding ? 1.7 : 1), 1);
    this.blob.position.z = sliding ? 0.35 : 0;
    // escudo acompanha o corpo (pulo/deslize) e pulsa
    if (this.shieldBubble.visible) {
      this.shieldMat.uniforms.uTime.value = this.fxTime;
      const pulse = 1 + Math.sin(this.fxTime * 5) * 0.025;
      const low = this.sliding ? 0.72 : 1;
      this.shieldBubble.position.y = y + 0.95 * low;
      this.shieldBubble.scale.set(0.92 * pulse * (this.sliding ? 1.15 : 1), 1.05 * pulse * low, 0.92 * pulse * (this.sliding ? 1.25 : 1));
    }
    // estrelinhas de tontura
    const dizzy = this.crashed && this.animator.stateTime > 0.45;
    this.stars.visible = dizzy;
    if (dizzy) {
      this.rig.head.getWorldPosition(this.tmpV);
      this.root.worldToLocal(this.tmpV);
      this.stars.position.set(this.tmpV.x, this.tmpV.y + 0.5, this.tmpV.z);
      this.stars.rotation.set(0.25, this.fxTime * 4, 0);
      const k = Math.min(1, (this.animator.stateTime - 0.45) * 4);
      this.stars.scale.setScalar(k);
    }
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

// ------------------------------------------------------------------ efeitos

const SHIELD_VS = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying float vY;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = -mv.xyz;
  vY = position.y;
  gl_Position = projectionMatrix * mv;
}`;

const SHIELD_FS = /* glsl */ `
uniform float uTime;
uniform vec3 uCore;
uniform vec3 uRim;
varying vec3 vN;
varying vec3 vV;
varying float vY;
void main() {
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float fres = pow(f, 2.4);
  float bands = 0.5 + 0.5 * sin(vY * 9.0 - uTime * 5.0);
  float sparkle = pow(max(0.0, sin(vY * 23.0 + uTime * 3.0) * sin(atan(vN.x, vN.z) * 7.0 - uTime * 2.0)), 8.0);
  float a = clamp(0.05 + fres * 0.85 + bands * 0.08 * (0.3 + fres) + sparkle * 0.25, 0.0, 1.0);
  vec3 c = mix(uCore, uRim, smoothstep(0.35, 0.95, fres) + sparkle * 0.5);
  gl_FragColor = vec4(c, a);
}`;

/** Disco com borda suave (alfa por vértice) para a sombra de contato. */
function softDiscGeometry(radius: number): THREE.BufferGeometry {
  const g = new THREE.RingGeometry(0.0001, radius, 32, 6);
  const pos = g.getAttribute('position');
  const col = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i)) / radius;
    const a = Math.pow(Math.max(0, 1 - r), 1.4);
    col[i * 4] = 1;
    col[i * 4 + 1] = 1;
    col[i * 4 + 2] = 1;
    col[i * 4 + 3] = a;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  g.deleteAttribute('uv');
  return g;
}

/** Três estrelinhas 3D num anel (tontura após a colisão). */
function starsGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 0.045 : 0.1;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 3; k++) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 });
    g.deleteAttribute('uv');
    g.translate(0, 0, -0.015);
    const a = (k / 3) * Math.PI * 2;
    g.rotateY(-a);
    g.translate(Math.cos(a) * 0.32, Math.sin(a * 2) * 0.04, Math.sin(a) * 0.32);
    parts.push(g.index ? g.toNonIndexed() : g);
  }
  const merged = mergeGeometries(parts, false)!;
  for (const p of parts) p.dispose();
  return merged;
}
