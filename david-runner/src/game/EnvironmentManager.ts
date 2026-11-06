import * as THREE from 'three';
import type { MapTheme } from '../data/maps';
import { ROAD_HALF_WIDTH, SEGMENT_LENGTH } from './config';
import { GeoBuilder } from './models/geo';
import { Materials } from './models/materials';
import { SIDE_FACTORIES, buntingGeometry } from './models/scenery';
import { Atmosphere } from './Atmosphere';
import { makeRoadTexture, makeSideTexture } from './textures';
import { Rng } from './rng';
import { buildVerge } from './scenery/verge';

interface Slot {
  mesh: THREE.Mesh | null;
  id: string | null;
}

interface Segment {
  group: THREE.Group;
  slots: Slot[];
  bunting: THREE.Mesh | null;
  verge: THREE.Mesh | null;
}

const SEGMENTS_AHEAD = 7;
const SEGMENTS_BEHIND = 2;
const SEGMENT_COUNT = SEGMENTS_AHEAD + SEGMENTS_BEHIND;
/** Posições (z local) e lados dos props laterais em cada segmento. */
const SLOT_LAYOUT: { side: -1 | 1; z: number; far?: boolean }[] = [
  { side: -1, z: -6 },
  { side: -1, z: 6 },
  { side: 1, z: -6 },
  { side: 1, z: 6 },
  // segunda fileira, mais afastada e maior: dá profundidade entre a rua e o horizonte
  { side: -1, z: 0, far: true },
  { side: 1, z: 0, far: true },
];

/**
 * Cenário: céu, luzes, neblina, chão em segmentos reciclados, construções
 * laterais (com pool de malhas), decoração e horizonte distante.
 */
export class EnvironmentManager {
  readonly root = new THREE.Group();
  /** Céu, luzes, neblina e horizonte. */
  readonly atmosphere: Atmosphere;
  private segments: Segment[] = [];
  private theme: MapTheme | null = null;
  private propGeos = new Map<string, THREE.BufferGeometry>();
  private propPool = new Map<string, THREE.Mesh[]>();
  private propWeights: { id: string; weight: number }[] = [];
  private buntingGeo: THREE.BufferGeometry | null = null;
  private buntingPool: THREE.Mesh[] = [];
  private roadGeo: THREE.BufferGeometry;
  private sideGeo: THREE.BufferGeometry;
  private curbGeo: THREE.BufferGeometry | null = null;
  private vergeGeos: THREE.BufferGeometry[] = [];
  private roadMat = new THREE.MeshLambertMaterial();
  private sideMat = new THREE.MeshLambertMaterial();
  private rng = new Rng(2024);

  constructor(scene: THREE.Scene) {
    scene.add(this.root);
    this.atmosphere = new Atmosphere(scene);

    this.roadGeo = new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, SEGMENT_LENGTH);
    this.roadGeo.rotateX(-Math.PI / 2);
    // laterais: duas faixas largas fora da estrada
    const sideW = 70;
    const l = new THREE.PlaneGeometry(sideW, SEGMENT_LENGTH);
    l.rotateX(-Math.PI / 2);
    l.translate(-(ROAD_HALF_WIDTH + 0.5 + sideW / 2), -0.02, 0);
    const r = l.clone();
    r.translate(2 * (ROAD_HALF_WIDTH + 0.5 + sideW / 2), 0, 0);
    const uvScale = (g: THREE.BufferGeometry) => {
      const uv = g.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 2);
    };
    uvScale(l);
    uvScale(r);
    this.sideGeo = mergeTwo(l, r);

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const group = new THREE.Group();
      group.position.z = SEGMENTS_BEHIND * SEGMENT_LENGTH - i * SEGMENT_LENGTH;
      const road = new THREE.Mesh(this.roadGeo, this.roadMat);
      road.receiveShadow = true;
      const side = new THREE.Mesh(this.sideGeo, this.sideMat);
      side.receiveShadow = true;
      group.add(road, side);
      this.root.add(group);
      this.segments.push({ group, slots: SLOT_LAYOUT.map(() => ({ mesh: null, id: null })), bunting: null, verge: null });
    }
  }

  setTheme(theme: MapTheme): void {
    this.theme = theme;
    this.atmosphere.setTheme(theme);

    // texturas
    this.roadMat.map?.dispose();
    this.sideMat.map?.dispose();
    this.roadMat.map = makeRoadTexture(theme.road);
    this.roadMat.needsUpdate = true;
    this.sideMat.map = makeSideTexture(theme.side);
    this.sideMat.needsUpdate = true;

    // meio-fio
    this.curbGeo?.dispose();
    const cb = new GeoBuilder(0.08);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 8; k++) {
        cb.box(0.55, 0.22, SEGMENT_LENGTH / 8 - 0.06, k % 2 ? theme.curb : theme.palette.stoneLight, {
          pos: [s * (ROAD_HALF_WIDTH + 0.27), 0.1, -SEGMENT_LENGTH / 2 + (k + 0.5) * (SEGMENT_LENGTH / 8)],
        });
      }
    }
    this.curbGeo = cb.build();

    // beira da pista (duas variações, alternadas)
    for (const g of this.vergeGeos) g.dispose();
    this.vergeGeos = [0, 1].map((v) => buildVerge(theme.verge, theme.palette, v));

    // props laterais
    for (const seg of this.segments) {
      for (const slot of seg.slots) {
        if (slot.mesh) slot.mesh.removeFromParent();
        slot.mesh = null;
        slot.id = null;
      }
      if (seg.bunting) seg.bunting.removeFromParent();
      seg.bunting = null;
      const curb = seg.group.children.find((c) => c.userData.curb) as THREE.Mesh | undefined;
      if (curb) curb.removeFromParent();
      const m = new THREE.Mesh(this.curbGeo, Materials.prop);
      m.userData.curb = true;
      m.receiveShadow = true;
      seg.group.add(m);
      if (seg.verge) seg.verge.removeFromParent();
      seg.verge = new THREE.Mesh(this.vergeGeos[0], Materials.prop);
      seg.verge.receiveShadow = true;
      seg.verge.castShadow = true;
      seg.group.add(seg.verge);
    }
    for (const g of this.propGeos.values()) g.dispose();
    this.propGeos.clear();
    this.propPool.clear();
    this.buntingGeo?.dispose();
    this.buntingPool = [];
    this.buntingGeo = theme.bunting ? buntingGeometry(theme.palette) : null;
    this.propWeights = theme.sideProps.filter((p) => SIDE_FACTORIES[p.id]);
    for (const p of this.propWeights) this.propGeos.set(p.id, SIDE_FACTORIES[p.id](theme.palette));

    for (const seg of this.segments) this.decorate(seg);
  }

  private pickProp(): string {
    let total = 0;
    for (const p of this.propWeights) total += p.weight;
    let r = this.rng.next() * total;
    for (const p of this.propWeights) {
      r -= p.weight;
      if (r <= 0) return p.id;
    }
    return this.propWeights[0].id;
  }

  private acquireProp(id: string): THREE.Mesh {
    const pool = this.propPool.get(id);
    const m = pool?.pop();
    if (m) return m;
    const mesh = new THREE.Mesh(this.propGeos.get(id)!, Materials.prop);
    mesh.userData.propId = id;
    mesh.matrixAutoUpdate = false;
    return mesh;
  }

  private releaseProp(m: THREE.Mesh): void {
    m.removeFromParent();
    const id = m.userData.propId as string;
    if (!this.propPool.has(id)) this.propPool.set(id, []);
    this.propPool.get(id)!.push(m);
  }

  private decorate(seg: Segment): void {
    if (!this.theme) return;
    SLOT_LAYOUT.forEach((layout, i) => {
      const slot = seg.slots[i];
      if (slot.mesh) this.releaseProp(slot.mesh);
      const id = this.pickProp();
      const m = this.acquireProp(id);
      if (layout.far) {
        m.position.set(layout.side * (ROAD_HALF_WIDTH + 11 + this.rng.range(0, 5)), 0, layout.z + this.rng.range(-8, 8));
      } else {
        m.position.set(layout.side * (ROAD_HALF_WIDTH + 3.4 + this.rng.range(0, 1.4)), 0, layout.z + this.rng.range(-1.5, 1.5));
      }
      m.rotation.set(0, layout.side === 1 ? Math.PI : 0, 0);
      const s = layout.far ? this.rng.range(1.35, 1.7) : this.rng.range(0.9, 1.1);
      m.scale.set(s, s, s);
      m.updateMatrix();
      seg.group.add(m);
      slot.mesh = m;
      slot.id = id;
    });
    if (seg.verge) seg.verge.geometry = this.vergeGeos[this.rng.int(0, 1)];
    if (seg.bunting) {
      seg.bunting.removeFromParent();
      this.buntingPool.push(seg.bunting);
      seg.bunting = null;
    }
    if (this.buntingGeo && this.rng.chance(0.3)) {
      const b = this.buntingPool.pop() ?? new THREE.Mesh(this.buntingGeo, Materials.prop);
      b.position.set(0, 0, this.rng.range(-8, 8));
      seg.group.add(b);
      seg.bunting = b;
    }
  }

  /** Avança o cenário em `dd` metros. */
  update(dd: number, dt: number): void {
    const limit = SEGMENTS_BEHIND * SEGMENT_LENGTH + SEGMENT_LENGTH / 2;
    for (const seg of this.segments) {
      seg.group.position.z += dd;
      if (seg.group.position.z > limit) {
        seg.group.position.z -= SEGMENT_COUNT * SEGMENT_LENGTH;
        this.decorate(seg);
      }
    }
    this.atmosphere.update(dt);
  }

  setShadows(enabled: boolean): void {
    this.atmosphere.setShadows(enabled);
  }
}

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const A = a.getAttribute(name) as THREE.BufferAttribute;
    const B = b.getAttribute(name) as THREE.BufferAttribute;
    const arr = new Float32Array(A.array.length + B.array.length);
    arr.set(A.array as Float32Array, 0);
    arr.set(B.array as Float32Array, A.array.length);
    out.setAttribute(name, new THREE.BufferAttribute(arr, A.itemSize));
  }
  const ia = a.index!.array;
  const ib = b.index!.array;
  const idx = new Uint16Array(ia.length + ib.length);
  idx.set(ia, 0);
  const offset = a.getAttribute('position').count;
  for (let i = 0; i < ib.length; i++) idx[ia.length + i] = ib[i] + offset;
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
