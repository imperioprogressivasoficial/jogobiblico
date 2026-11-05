import * as THREE from 'three';
import type { MapTheme } from '../data/maps';
import { DESPAWN_BEHIND, LANE_X, OBSTACLE_HEIGHT } from './config';
import { Materials } from './models/materials';
import { OBSTACLE_FACTORIES } from './models/props';
import type { ObstacleSpec } from './TrackGenerator';

export interface Hitbox {
  hw: number;
  yMin: number;
  yMax: number;
}

export interface ActiveObstacle {
  spec: ObstacleSpec;
  mesh: THREE.Mesh;
  x: number;
  vx: number;
  box: Hitbox;
  hit: boolean;
}

export interface PlayerBox {
  x: number;
  y: number;
  height: number;
  hw: number;
  hd: number;
}

export interface CollisionResult {
  obstacle: ActiveObstacle;
  /** Batida lateral (troca de pista contra um obstáculo já ao lado). */
  side: boolean;
}

/** Altura de colisão específica de algumas variantes baixas. */
const LOW_HEIGHT: Record<string, number> = {
  pedra: 0.95,
  tronco: 0.86,
  tronco_curto: 0.82,
  ovelha: 1.05,
  cabra: 1.05,
  cesto: 0.95,
  muro_baixo: 0.93,
  coluna_caida: 0.92,
};

/** Obstáculos com pool de malhas por variante e colisão AABB. */
export class ObstacleManager {
  readonly root = new THREE.Group();
  readonly active: ActiveObstacle[] = [];
  private geos = new Map<string, THREE.BufferGeometry>();
  private pools = new Map<string, THREE.Mesh[]>();
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.root);
  }

  setTheme(theme: MapTheme): void {
    this.reset();
    for (const g of this.geos.values()) g.dispose();
    this.geos.clear();
    this.pools.clear();
    const c = theme.catalog;
    const ids = new Set<string>([
      ...c.low.map((v) => v.id),
      ...c.high.map((v) => v.id),
      ...c.block.map((v) => v.id),
      ...c.fullLow.map((v) => v.id),
      ...c.fullHigh.map((v) => v.id),
      ...c.animal.map((v) => v.id),
      c.trainCar.id,
    ]);
    for (const id of ids) {
      const f = OBSTACLE_FACTORIES[id];
      if (!f) throw new Error(`Obstáculo desconhecido: ${id}`);
      this.geos.set(id, f(theme.palette));
      this.pools.set(id, []);
    }
  }

  spawn(spec: ObstacleSpec): void {
    const pool = this.pools.get(spec.variant)!;
    let mesh = pool.pop();
    if (!mesh) {
      mesh = new THREE.Mesh(this.geos.get(spec.variant)!, Materials.prop);
      mesh.castShadow = true;
      mesh.userData.variant = spec.variant;
    }
    const x = spec.fullWidth ? 0 : LANE_X[spec.lane];
    let box: Hitbox;
    let vx = 0;
    if (spec.kind === 'high') {
      box = { hw: spec.fullWidth ? 3.9 : 1.0, yMin: OBSTACLE_HEIGHT.highBottom, yMax: OBSTACLE_HEIGHT.highTop + 1 };
    } else if (spec.kind === 'block') {
      box = { hw: 0.95, yMin: 0, yMax: OBSTACLE_HEIGHT.block + 1 };
    } else if (spec.kind === 'animal') {
      box = { hw: 0.72, yMin: 0, yMax: LOW_HEIGHT[spec.variant] ?? 1.05 };
      vx = spec.lane === 0 ? 1.7 : -1.7;
    } else {
      box = { hw: spec.fullWidth ? 3.9 : 0.92, yMin: 0, yMax: LOW_HEIGHT[spec.variant] ?? OBSTACLE_HEIGHT.low };
    }
    mesh.position.set(x, 0, 0);
    mesh.visible = true; // pode ter sido escondida (escudo/carruagem) antes de voltar ao pool
    mesh.rotation.set(0, spec.kind === 'animal' && vx < 0 ? Math.PI : 0, 0);
    this.root.add(mesh);
    this.active.push({ spec, mesh, x, vx, box, hit: false });
  }

  update(distance: number, dt: number): void {
    this.time += dt;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      const s = o.spec;
      if (s.d + s.length < distance - DESPAWN_BEHIND) {
        this.release(i);
        continue;
      }
      o.mesh.position.z = -(s.d + s.length / 2 - distance);
      if (s.kind === 'animal') {
        // só começa a andar quando está razoavelmente perto
        if (s.d - distance < 60) {
          o.x += o.vx * dt;
          if (o.x > LANE_X[2] + 0.4 || o.x < LANE_X[0] - 0.4) {
            o.vx = -o.vx;
            o.mesh.rotation.y = o.vx < 0 ? Math.PI : 0;
          }
        }
        o.mesh.position.x = o.x;
        o.mesh.position.y = Math.abs(Math.sin(this.time * 9 + s.d)) * 0.06;
      }
    }
  }

  /** Testa colisão do jogador (posição em metros de pista `distance`). */
  checkCollision(p: PlayerBox, distance: number, laneMoving: boolean): CollisionResult | null {
    const pz0 = distance - p.hd;
    const pz1 = distance + p.hd;
    for (const o of this.active) {
      if (o.hit) continue;
      const s = o.spec;
      if (s.d > pz1 || s.d + s.length < pz0) continue;
      if (Math.abs(p.x - o.x) > p.hw + o.box.hw) continue;
      if (p.y > o.box.yMax || p.y + p.height < o.box.yMin) continue;
      // Já estava ao lado do obstáculo quando trocou de pista?
      const side = laneMoving && s.d < distance - 0.25 && !s.fullWidth;
      return { obstacle: o, side };
    }
    return null;
  }

  /** Remove obstáculos num intervalo de pista (usado ao reviver). */
  clearRange(d0: number, d1: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const s = this.active[i].spec;
      if (s.d + s.length > d0 && s.d < d1) this.release(i);
    }
  }

  /** Obstáculos em uma pista que se sobrepõem ao intervalo de pista [d0, d1]. */
  laneOccupied(lane: number, d0: number, d1: number, includePassable = false): boolean {
    const x = LANE_X[lane];
    for (const o of this.active) {
      const s = o.spec;
      if (s.d > d1 || s.d + s.length < d0) continue;
      if (Math.abs(o.x - x) > o.box.hw + 0.4) continue;
      if (includePassable || s.kind === 'block') return true;
    }
    return false;
  }

  private release(i: number): void {
    const o = this.active[i];
    o.mesh.removeFromParent();
    this.pools.get(o.mesh.userData.variant as string)?.push(o.mesh);
    this.active.splice(i, 1);
  }

  reset(): void {
    for (let i = this.active.length - 1; i >= 0; i--) this.release(i);
  }
}
