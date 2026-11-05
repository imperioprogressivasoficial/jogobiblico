import * as THREE from 'three';
import { DESPAWN_BEHIND, LANE_X } from './config';
import { GeoBuilder } from './models/geo';
import { Materials } from './models/materials';
import type { CollectibleSpec, CollectibleType } from './TrackGenerator';
import { makeGlowTexture } from './textures';
import type { ParticleSystem } from './ParticleSystem';

interface Coin {
  d: number;
  x: number;
  y: number;
  phase: number;
  attracted: boolean;
}

interface Special {
  type: Exclude<CollectibleType, 'coin'>;
  d: number;
  x: number;
  y: number;
  group: THREE.Group;
}

const MAX_COINS = 320;

function coinGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder(0);
  // moeda de frente para o jogador (eixo em z)
  b.cyl(0.42, 0.42, 0.1, 16, '#e8a514', { rot: [Math.PI / 2, 0, 0] });
  b.cyl(0.34, 0.34, 0.13, 16, '#ffd23f', { rot: [Math.PI / 2, 0, 0] });
  // coroa em relevo
  b.box(0.3, 0.08, 0.16, '#fff1a0', { pos: [0, -0.08, 0] });
  for (const x of [-0.12, 0, 0.12]) b.cone(0.06, 0.16, 4, '#fff1a0', { pos: [x, 0.04, 0], scale: [1, 1, 1.3] });
  return b.build();
}

function scrollGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder(0.03);
  b.cyl(0.22, 0.22, 0.8, 12, '#f3e2b5', { rot: [0, 0, Math.PI / 2] });
  b.box(0.7, 0.5, 0.04, '#f8ecc8', { pos: [0, -0.35, 0.12], rot: [0.2, 0, 0] });
  for (const x of [-0.45, 0.45]) {
    b.cyl(0.07, 0.07, 0.14, 8, '#7b4a26', { pos: [x, 0, 0], rot: [0, 0, Math.PI / 2] });
    b.sphere(0.09, 6, 5, '#d4a23a', { pos: [x * 1.18, 0, 0] });
  }
  b.cyl(0.235, 0.235, 0.1, 12, '#c43a2b', { rot: [0, 0, Math.PI / 2] });
  for (let i = 0; i < 3; i++) b.box(0.45, 0.025, 0.01, '#8a6a45', { pos: [0, -0.22 - i * 0.12, 0.16], rot: [0.2, 0, 0] });
  return b.build();
}

function relicGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder(0.02);
  b.cyl(0.36, 0.32, 0.26, 12, '#f2c13a');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.cone(0.09, 0.3, 4, '#ffd95a', { pos: [Math.cos(a) * 0.33, 0.26, Math.sin(a) * 0.33] });
    b.sphere(0.04, 4, 3, '#ffffff', { pos: [Math.cos(a) * 0.33, 0.42, Math.sin(a) * 0.33] });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    b.add(new THREE.OctahedronGeometry(0.07), i % 2 ? '#d93b5b' : '#3bb0d9', { pos: [Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35] });
  }
  b.add(new THREE.OctahedronGeometry(0.14), '#9b4bd9', { pos: [0, 0.48, 0] });
  return b.build();
}

function magnetGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder(0.02);
  b.torus(0.3, 0.11, 6, 12, '#d9342b', { pos: [0, 0.1, 0] }, Math.PI);
  for (const x of [-0.3, 0.3]) {
    b.cyl(0.11, 0.11, 0.25, 8, '#d9342b', { pos: [x, -0.02, 0] });
    b.cyl(0.115, 0.115, 0.14, 8, '#e6e6ee', { pos: [x, -0.21, 0] });
  }
  return b.build();
}

function harpGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder(0.02);
  b.torus(0.4, 0.06, 5, 12, '#f2c13a', { pos: [0, 0, 0], rot: [0, 0, Math.PI * 0.15] }, Math.PI * 1.2);
  b.cyl(0.06, 0.06, 0.85, 6, '#d49a20', { pos: [-0.3, -0.05, 0], rot: [0, 0, 0.15] });
  for (let i = 0; i < 5; i++) b.box(0.015, 0.55 - Math.abs(i - 2) * 0.08, 0.015, '#fff7d0', { pos: [-0.18 + i * 0.11, -0.02, 0] });
  b.sphere(0.08, 6, 4, '#ffffff', { pos: [0.34, 0.25, 0] });
  return b.build();
}

function shieldGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder(0.02);
  b.cyl(0.45, 0.45, 0.08, 14, '#2f6fc1', { rot: [Math.PI / 2, 0, 0] });
  b.torus(0.45, 0.05, 5, 16, '#f2c13a');
  b.sphere(0.12, 8, 6, '#f2c13a', { pos: [0, 0, 0.05], scale: [1, 1, 0.6] });
  b.box(0.06, 0.6, 0.02, '#f2c13a', { pos: [0, 0, 0.05] });
  b.box(0.6, 0.06, 0.02, '#f2c13a', { pos: [0, 0, 0.05] });
  return b.build();
}

export interface PickupEvent {
  type: CollectibleType;
}

/** Moedas (InstancedMesh: 1 draw call), pergaminhos, relíquias e power-ups. */
export class CollectibleManager {
  private coins: Coin[] = [];
  private coinMesh: THREE.InstancedMesh;
  private specials: Special[] = [];
  private specialGeos: Record<Special['type'], THREE.BufferGeometry>;
  private specialPools = new Map<string, THREE.Group[]>();
  private glowMat: THREE.SpriteMaterial;
  private time = 0;
  private dummy = new THREE.Object3D();
  private readonly root = new THREE.Group();

  constructor(scene: THREE.Scene, private particles: ParticleSystem) {
    this.coinMesh = new THREE.InstancedMesh(coinGeometry(), Materials.coin, MAX_COINS);
    this.coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coinMesh.count = 0;
    this.coinMesh.frustumCulled = false;
    this.coinMesh.castShadow = false;
    scene.add(this.coinMesh, this.root);
    this.specialGeos = {
      scroll: scrollGeometry(),
      relic: relicGeometry(),
      magnet: magnetGeometry(),
      double: harpGeometry(),
      shield: shieldGeometry(),
    };
    this.glowMat = new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.8,
    });
  }

  spawn(c: CollectibleSpec): void {
    const x = LANE_X[c.lane];
    if (c.type === 'coin') {
      if (this.coins.length >= MAX_COINS) return;
      this.coins.push({ d: c.d, x, y: c.y, phase: c.d * 0.35, attracted: false });
      return;
    }
    const pool = this.specialPools.get(c.type) ?? [];
    let group = pool.pop();
    if (!group) {
      group = new THREE.Group();
      const mesh = new THREE.Mesh(this.specialGeos[c.type], Materials.prop);
      mesh.scale.setScalar(c.type === 'relic' ? 1.2 : 1.1);
      const glow = new THREE.Sprite(this.glowMat);
      glow.scale.setScalar(c.type === 'relic' ? 2.6 : 2.1);
      group.add(glow, mesh);
      group.userData.type = c.type;
    }
    this.root.add(group);
    this.specials.push({ type: c.type, d: c.d, x, y: c.y, group });
  }

  /**
   * Atualiza posições e retorna os itens coletados neste quadro.
   * `px, py, ph`: posição e altura do jogador.
   */
  update(distance: number, dt: number, px: number, py: number, ph: number, magnet: boolean, out: PickupEvent[]): void {
    this.time += dt;
    const dummy = this.dummy;
    let n = 0;
    const spin = this.time * 3.2;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      const rel = c.d - distance;
      if (rel < -DESPAWN_BEHIND) {
        this.coins.splice(i, 1);
        continue;
      }
      if (magnet && !c.attracted && rel < 16 && rel > -1) c.attracted = true;
      if (c.attracted) {
        const k = Math.min(1, dt * 14);
        c.x += (px - c.x) * k;
        c.y += (py + 0.9 - c.y) * k;
        c.d += (distance - c.d) * k;
      }
      const rel2 = c.d - distance;
      if (
        Math.abs(rel2) < 0.75 &&
        Math.abs(c.x - px) < 0.85 &&
        c.y > py - 0.35 &&
        c.y < py + ph + 0.35
      ) {
        this.particles.burst(c.x, c.y, -rel2, '#ffd23f', 6, 3, 1.5);
        this.coins.splice(i, 1);
        out.push({ type: 'coin' });
        continue;
      }
      if (rel2 > 165) continue;
      dummy.position.set(c.x, c.y + Math.sin(this.time * 4 + c.phase) * 0.06, -rel2);
      dummy.rotation.set(0, spin + c.phase, 0);
      dummy.updateMatrix();
      this.coinMesh.setMatrixAt(n++, dummy.matrix);
    }
    this.coinMesh.count = n;
    this.coinMesh.instanceMatrix.needsUpdate = true;

    for (let i = this.specials.length - 1; i >= 0; i--) {
      const s = this.specials[i];
      const rel = s.d - distance;
      if (rel < -DESPAWN_BEHIND) {
        this.releaseSpecial(i);
        continue;
      }
      if (Math.abs(rel) < 0.9 && Math.abs(s.x - px) < 0.95 && s.y > py - 0.5 && s.y < py + ph + 0.5) {
        const color = s.type === 'relic' ? '#c77dff' : s.type === 'scroll' ? '#fff1b0' : s.type === 'shield' ? '#6fb6ff' : '#ffd23f';
        this.particles.burst(s.x, s.y, -rel, color, 22, 5, 2.5);
        out.push({ type: s.type });
        this.releaseSpecial(i);
        continue;
      }
      s.group.position.set(s.x, s.y + Math.sin(this.time * 3 + s.d) * 0.15, -rel);
      const mesh = s.group.children[1];
      mesh.rotation.y = this.time * 2.2;
    }
  }

  private releaseSpecial(i: number): void {
    const s = this.specials[i];
    s.group.removeFromParent();
    const pool = this.specialPools.get(s.type) ?? [];
    pool.push(s.group);
    this.specialPools.set(s.type, pool);
    this.specials.splice(i, 1);
  }

  /** Modelos 3D dos itens para pré-visualização em telas. */
  getSpecialGeometry(type: Special['type']): THREE.BufferGeometry {
    return this.specialGeos[type];
  }

  reset(): void {
    this.coins.length = 0;
    this.coinMesh.count = 0;
    for (let i = this.specials.length - 1; i >= 0; i--) this.releaseSpecial(i);
  }
}
