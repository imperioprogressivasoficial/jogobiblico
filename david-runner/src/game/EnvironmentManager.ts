import * as THREE from 'three';
import type { MapTheme } from '../data/maps';
import { ROAD_HALF_WIDTH, SEGMENT_LENGTH } from './config';
import { GeoBuilder } from './models/geo';
import { Materials } from './models/materials';
import { BACKDROP_FACTORIES, SIDE_FACTORIES, buntingGeometry, cloudGeometry } from './models/props';
import { makeRoadTexture, makeSideTexture } from './textures';
import { Rng } from './rng';

interface Slot {
  mesh: THREE.Mesh | null;
  id: string | null;
}

interface Segment {
  group: THREE.Group;
  slots: Slot[];
  bunting: THREE.Mesh | null;
}

const SEGMENTS_AHEAD = 7;
const SEGMENTS_BEHIND = 2;
const SEGMENT_COUNT = SEGMENTS_AHEAD + SEGMENTS_BEHIND;
/** Posições (z local) e lados dos props laterais em cada segmento. */
const SLOT_LAYOUT: { side: -1 | 1; z: number }[] = [
  { side: -1, z: -6 },
  { side: -1, z: 6 },
  { side: 1, z: -6 },
  { side: 1, z: 6 },
];

/**
 * Cenário: céu, luzes, neblina, chão em segmentos reciclados, construções
 * laterais (com pool de malhas), decoração e horizonte distante.
 */
export class EnvironmentManager {
  readonly root = new THREE.Group();
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  private sky: THREE.Mesh;
  private backdrop: THREE.Mesh | null = null;
  private clouds: THREE.Mesh[] = [];
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
  private roadMat = new THREE.MeshLambertMaterial();
  private sideMat = new THREE.MeshLambertMaterial();
  private rng = new Rng(2024);
  private cloudGeo = cloudGeometry();

  constructor(private scene: THREE.Scene) {
    scene.add(this.root);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.6);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.4);
    this.sun.position.set(-7, 16, 9);
    this.sun.target.position.set(0, 0, -10);
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -11;
    sc.right = 11;
    sc.top = 26;
    sc.bottom = -12;
    sc.near = 1;
    sc.far = 60;
    this.sun.shadow.bias = -0.0015;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun, this.sun.target);

    const skyGeo = new THREE.SphereGeometry(420, 24, 12);
    skyGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(skyGeo.getAttribute('position').count * 3), 3));
    this.sky = new THREE.Mesh(
      skyGeo,
      new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }),
    );
    this.sky.renderOrder = -10;
    scene.add(this.sky);

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
      this.segments.push({ group, slots: SLOT_LAYOUT.map(() => ({ mesh: null, id: null })), bunting: null });
    }

    for (let i = 0; i < 7; i++) {
      const c = new THREE.Mesh(this.cloudGeo, Materials.cloud);
      c.position.set(this.rng.range(-220, 220), this.rng.range(38, 70), this.rng.range(-150, -300));
      c.scale.setScalar(this.rng.range(1.2, 2.4));
      this.clouds.push(c);
      scene.add(c);
    }
  }

  setTheme(theme: MapTheme): void {
    this.theme = theme;
    const scene = this.scene;
    scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
    scene.background = new THREE.Color(theme.skyBottom);
    this.hemi.color.set(theme.hemiSky);
    this.hemi.groundColor.set(theme.hemiGround);
    this.sun.color.set(theme.sun);
    this.sun.intensity = theme.sunIntensity;

    // céu em degradê
    const pos = this.sky.geometry.getAttribute('position');
    const col = this.sky.geometry.getAttribute('color') as THREE.BufferAttribute;
    const top = new THREE.Color(theme.skyTop);
    const bottom = new THREE.Color(theme.skyBottom);
    const fog = new THREE.Color(theme.fog);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 420;
      if (y < 0.02) tmp.copy(fog);
      else tmp.copy(bottom).lerp(top, Math.min(1, Math.pow(y, 0.6) * 1.1));
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    col.needsUpdate = true;

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

    // horizonte
    if (this.backdrop) {
      this.backdrop.geometry.dispose();
      this.scene.remove(this.backdrop);
    }
    const haze = new THREE.Color(theme.fog);
    const bd = BACKDROP_FACTORIES[theme.backdrop] ?? BACKDROP_FACTORIES.jerusalem;
    this.backdrop = new THREE.Mesh(bd(theme.palette, haze), Materials.backdrop);
    this.backdrop.renderOrder = -5;
    this.scene.add(this.backdrop);

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
      m.position.set(layout.side * (ROAD_HALF_WIDTH + 1.6 + this.rng.range(0, 1.2)), 0, layout.z + this.rng.range(-1.5, 1.5));
      m.rotation.set(0, layout.side === 1 ? Math.PI : 0, 0);
      const s = this.rng.range(0.9, 1.1);
      m.scale.set(s, s, s);
      m.updateMatrix();
      seg.group.add(m);
      slot.mesh = m;
      slot.id = id;
    });
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
    for (const c of this.clouds) {
      c.position.x += dt * 1.5;
      if (c.position.x > 260) c.position.x = -260;
    }
  }

  setShadows(enabled: boolean): void {
    this.sun.castShadow = enabled;
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
