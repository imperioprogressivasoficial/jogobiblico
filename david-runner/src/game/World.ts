import * as THREE from 'three';
import { resolveLook } from '../data/characters';
import type { MapTheme } from '../data/maps';
import { GeoBuilder } from './models/geo';
import { Materials } from './models/materials';
import { buildCharacter, type CharacterRig } from './models/characterModel';
import { CharacterAnimator } from './models/characterAnimator';
import { SIDE_FACTORIES } from './models/scenery';
import { makeRoadTexture, makeSideTexture } from './textures';

/**
 * MUNDO ABERTO (beta): uma praça de Jerusalém para explorar a pé, com outros jogadores aparecendo
 * ao vivo. Esta classe cuida só do 3D (cenário, herói, jogadores remotos, câmera, colisões);
 * a rede e a interface ficam fora (net/worldClient.ts e ui/screens/WorldScreen.tsx).
 */
export const WORLD_RADIUS = 46;
const WALK = 3.2;
const RUN = 6;

/** Estado de animação enviado pela rede: 0 parado, 1 andando, 2 correndo, 3 gesto, 4 pulo. */
export type NetAnim = 0 | 1 | 2 | 3 | 4;
export type Emote = 'wave' | 'dance' | 'jump' | 'pray';

interface Avatar {
  id: number;
  name: string;
  rig: CharacterRig;
  anim: CharacterAnimator;
  shadow: THREE.Mesh;
  x: number;
  z: number;
  r: number;
  tx: number;
  tz: number;
  tr: number;
  a: NetAnim;
  /** Gesto em andamento (segundos restantes). */
  emote: number;
}

interface Collider {
  x: number;
  z: number;
  r: number;
}

const angDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export class World {
  readonly group = new THREE.Group();
  private built = false;
  private colliders: Collider[] = [];
  private textures: THREE.Texture[] = [];
  private geos: THREE.BufferGeometry[] = [];
  private shadowMat = Materials.shadowBlob;
  private shadowGeo = new THREE.CircleGeometry(0.55, 16).rotateX(-Math.PI / 2);

  private me: Avatar | null = null;
  private others = new Map<number, Avatar>();
  /** Direção do joystick (x: direita, y: para frente). */
  private move = new THREE.Vector2();
  private yaw = 0;
  private pitch = 0.5;
  private dist = 8;
  private time = 0;
  private v = new THREE.Vector3();
  private look = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.group.visible = false;
  }

  get active(): boolean {
    return this.group.visible;
  }

  // ------------------------------------------------------------------ entrada e saída
  enter(charId: string, skinId: string, theme: MapTheme): void {
    if (!this.built) this.build(theme);
    this.group.visible = true;
    this.clearOthers();
    if (this.me) this.dispose(this.me);
    this.me = this.makeAvatar(0, '', charId, skinId);
    this.me.x = this.me.tx = 0;
    this.me.z = this.me.tz = 7;
    this.yaw = 0;
    this.move.set(0, 0);
    this.group.add(this.me.rig.root, this.me.shadow);
  }

  leave(): void {
    this.group.visible = false;
    this.clearOthers();
    if (this.me) this.dispose(this.me);
    this.me = null;
  }

  // ------------------------------------------------------------------ controles
  setMove(x: number, y: number): void {
    this.move.set(x, y);
  }

  rotateCamera(dx: number, dy = 0): void {
    this.yaw -= dx * 0.008;
    this.pitch = Math.min(0.9, Math.max(0.12, this.pitch + dy * 0.004));
  }

  /** Posição e estado do jogador local, para enviar à rede. */
  state(): { x: number; z: number; r: number; a: NetAnim } {
    const m = this.me;
    if (!m) return { x: 0, z: 0, r: 0, a: 0 };
    return { x: m.x, z: m.z, r: m.r, a: m.a };
  }

  emote(e: Emote): void {
    this.playEmote(this.me, e);
  }

  // ------------------------------------------------------------------ jogadores remotos
  addRemote(id: number, name: string, charId: string, skinId: string, x: number, z: number, r: number): void {
    if (this.others.has(id) || !Number.isFinite(x) || !Number.isFinite(z)) return;
    const av = this.makeAvatar(id, name, charId, skinId);
    av.x = av.tx = x;
    av.z = av.tz = z;
    av.r = av.tr = Number.isFinite(r) ? r : 0;
    this.group.add(av.rig.root, av.shadow);
    this.others.set(id, av);
  }

  /** Remove todos os jogadores remotos (ao reconectar, a lista vem de novo no "welcome"). */
  clearRemotes(): void {
    this.clearOthers();
  }

  removeRemote(id: number): void {
    const av = this.others.get(id);
    if (!av) return;
    this.dispose(av);
    this.others.delete(id);
  }

  updateRemote(id: number, x: number, z: number, r: number, a: NetAnim): void {
    const av = this.others.get(id);
    if (!av || !Number.isFinite(x) || !Number.isFinite(z)) return;
    av.tx = x;
    av.tz = z;
    av.tr = Number.isFinite(r) ? r : av.tr;
    av.a = a;
  }

  remoteEmote(id: number, e: Emote): void {
    this.playEmote(this.others.get(id) ?? null, e);
  }

  get remoteCount(): number {
    return this.others.size;
  }

  /** Posição na tela (0..1) das etiquetas de nome e balões de fala. */
  labels(camera: THREE.Camera): { id: number; name: string; x: number; y: number; visible: boolean; self: boolean }[] {
    const out: { id: number; name: string; x: number; y: number; visible: boolean; self: boolean }[] = [];
    const push = (av: Avatar, self: boolean) => {
      this.v.set(av.x, 2.35, av.z).project(camera);
      out.push({ id: av.id, name: av.name, x: (this.v.x + 1) / 2, y: (1 - this.v.y) / 2, visible: this.v.z < 1 && Math.abs(this.v.x) < 1.2, self });
    };
    if (this.me) push(this.me, true);
    for (const av of this.others.values()) push(av, false);
    return out;
  }

  // ------------------------------------------------------------------ laço
  update(dt: number, camera: THREE.PerspectiveCamera): void {
    if (!this.group.visible || !this.me) return;
    this.time += dt;
    const m = this.me;

    // movimento relativo à câmera
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    const mag = Math.min(1, this.move.length());
    let moving = false;
    if (m.emote <= 0 && mag > 0.08) {
      const dx = fx * this.move.y + rx * this.move.x;
      const dz = fz * this.move.y + rz * this.move.x;
      const len = Math.hypot(dx, dz) || 1;
      const speed = mag > 0.85 ? RUN : WALK + (RUN - WALK) * Math.max(0, (mag - 0.3) / 0.55) * 0.4;
      m.x += (dx / len) * speed * dt;
      m.z += (dz / len) * speed * dt;
      m.tr = Math.atan2(-dx, -dz);
      m.a = mag > 0.85 ? 2 : 1;
      moving = true;
      m.anim.setState('run');
      m.anim.update(dt, speed * 1.6);
    }
    if (!moving) {
      if (m.emote > 0) {
        m.emote -= dt;
        if (m.emote <= 0) m.a = 0;
      } else m.a = 0;
      if (m.emote <= 0) m.anim.setState('idle');
      m.anim.update(dt, 0);
    }
    this.collide(m);
    m.r += angDiff(m.r, m.tr) * Math.min(1, dt * 12);
    this.place(m);

    for (const av of this.others.values()) {
      av.x += (av.tx - av.x) * Math.min(1, dt * 9);
      av.z += (av.tz - av.z) * Math.min(1, dt * 9);
      av.r += angDiff(av.r, av.tr) * Math.min(1, dt * 10);
      let speed = 0;
      if (av.emote > 0) {
        av.emote -= dt;
        if (av.emote <= 0) av.anim.setState('idle');
      } else if (av.a === 1 || av.a === 2) {
        av.anim.setState('run');
        speed = av.a === 2 ? RUN * 1.6 : WALK * 1.6;
      } else if (av.a === 3) {
        av.anim.setState('celebrate');
      } else {
        av.anim.setState('idle');
      }
      av.anim.update(dt, speed);
      this.place(av);
    }

    // câmera em órbita atrás do herói
    const cp = Math.cos(this.pitch);
    camera.position.set(m.x + Math.sin(this.yaw) * cp * this.dist, 1.5 + Math.sin(this.pitch) * this.dist, m.z + Math.cos(this.yaw) * cp * this.dist);
    this.look.set(m.x, 1.25, m.z);
    camera.lookAt(this.look);
    camera.fov = 60;
    camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ internos
  private place(av: Avatar): void {
    av.rig.root.position.set(av.x, 0, av.z);
    av.rig.root.rotation.y = av.r;
    av.shadow.position.set(av.x, 0.03, av.z);
  }

  private collide(av: Avatar): void {
    for (const c of this.colliders) {
      const dx = av.x - c.x;
      const dz = av.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + 0.45;
      if (d < min && d > 0.001) {
        av.x = c.x + (dx / d) * min;
        av.z = c.z + (dz / d) * min;
      }
    }
    const rr = Math.hypot(av.x, av.z);
    if (rr > WORLD_RADIUS - 1) {
      av.x = (av.x / rr) * (WORLD_RADIUS - 1);
      av.z = (av.z / rr) * (WORLD_RADIUS - 1);
    }
  }

  private playEmote(av: Avatar | null, e: Emote): void {
    if (!av) return;
    const t = e === 'dance' ? 3 : e === 'wave' ? 1.8 : e === 'jump' ? 0.9 : 2.4;
    av.emote = t;
    av.a = e === 'jump' ? 4 : 3;
    av.anim.setState(e === 'jump' ? 'jump' : 'celebrate');
  }

  private makeAvatar(id: number, name: string, charId: string, skinId: string): Avatar {
    const rig = buildCharacter(resolveLook(charId, skinId));
    const anim = new CharacterAnimator(rig);
    anim.setState('idle');
    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    return { id, name, rig, anim, shadow, x: 0, z: 0, r: 0, tx: 0, tz: 0, tr: 0, a: 0, emote: 0 };
  }

  private dispose(av: Avatar): void {
    av.rig.root.removeFromParent();
    av.shadow.removeFromParent();
    av.rig.dispose();
  }

  private clearOthers(): void {
    for (const av of this.others.values()) this.dispose(av);
    this.others.clear();
  }

  /** Monta a praça: chão de pedra, fonte no centro e um anel de casas, torres e árvores. */
  private build(theme: MapTheme): void {
    this.built = true;
    const p = theme.palette;

    // chão: terra batida ao redor e piso de pedra na praça
    const side = makeSideTexture(theme.side);
    side.repeat.set(14, 14);
    const road = makeRoadTexture(theme.road);
    road.repeat.set(7, 7);
    this.textures.push(side, road);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: side }));
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(19, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: road }));
    plaza.position.y = 0.01;
    plaza.receiveShadow = true;
    this.group.add(ground, plaza);

    // fonte central
    const fb = new GeoBuilder(0.03);
    fb.cyl(3.2, 3.4, 0.7, 20, p.stoneLight, { pos: [0, 0.35, 0] });
    fb.cyl(2.7, 2.7, 0.12, 20, '#5fb7e8', { pos: [0, 0.68, 0] });
    fb.cyl(0.5, 0.65, 1.8, 10, p.stone, { pos: [0, 1.3, 0] });
    fb.cyl(1.2, 0.5, 0.35, 12, p.stoneLight, { pos: [0, 2.1, 0] });
    fb.sphere(0.45, 8, 6, '#bfe8ff', { pos: [0, 2.55, 0] });
    const fountain = new THREE.Mesh(fb.build(), Materials.prop);
    this.geos.push(fountain.geometry);
    this.group.add(fountain);
    this.colliders.push({ x: 0, z: 0, r: 3.4 });

    // construções em dois anéis, sempre com a frente voltada para o centro
    const make = (id: string, R: number, theta: number, scale: number, colR: number, outset: number) => {
      const factory = SIDE_FACTORIES[id];
      if (!factory) return;
      const geo = factory(p);
      this.geos.push(geo);
      const m = new THREE.Mesh(geo, Materials.prop);
      m.position.set(Math.cos(theta) * R, 0, Math.sin(theta) * R);
      m.rotation.y = Math.PI - theta;
      m.scale.setScalar(scale);
      m.castShadow = true;
      m.receiveShadow = true;
      this.group.add(m);
      if (colR > 0) this.colliders.push({ x: Math.cos(theta) * (R + outset * scale), z: Math.sin(theta) * (R + outset * scale), r: colR * scale });
    };
    const inner = ['casa', 'mercado', 'casa_alta', 'mercado', 'casa', 'torre', 'casa_alta', 'mercado', 'casa', 'casa_alta', 'mercado', 'casa'];
    inner.forEach((id, i) => {
      const th = (i / inner.length) * Math.PI * 2 + 0.2;
      // abre um "portão" ao sul (onde o jogador nasce) deixando a entrada livre
      if (Math.abs(angDiff(th, Math.PI / 2)) < 0.35) return;
      make(id, 25, th, 1.0, 3.3, 2);
    });
    const outer = ['casa_alta', 'torre', 'casa_alta', 'casa', 'casa_alta', 'torre', 'casa', 'casa_alta', 'torre', 'casa', 'casa_alta', 'casa', 'torre', 'casa_alta'];
    outer.forEach((id, i) => make(id, 39, (i / outer.length) * Math.PI * 2 + 0.55, 1.25, 4.2, 2));
    // árvores, jarros e um poço espalhados pela praça (sem fechar os caminhos)
    const deco: [string, number, number, number][] = [
      ['oliveira', 13, 0.5, 1.0], ['palmeira', 14, 1.6, 1.0], ['oliveira', 13, 2.7, 1.0], ['palmeira', 15, 3.9, 1.1],
      ['oliveira', 14, 5.0, 1.0], ['poco', 11, 5.9, 1.0], ['jarros', 10, 1.1, 1.0], ['jarros', 10, 4.3, 1.0],
      ['palmeira', 31, 0.9, 1.3], ['oliveira', 32, 2.3, 1.2], ['palmeira', 31, 3.5, 1.3], ['oliveira', 33, 4.7, 1.2], ['palmeira', 32, 6.0, 1.3],
    ];
    for (const [id, R, th, s] of deco) make(id, R, th, s, id === 'jarros' ? 0.7 : id === 'poco' ? 1.1 : 0.7, 1.2);
  }
}
