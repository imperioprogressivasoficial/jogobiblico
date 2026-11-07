import * as THREE from 'three';
import type { CharacterLook } from '../data/characters';
import { buildCharacter, type CharacterRig } from './models/characterModel';
import { CharacterAnimator } from './models/characterAnimator';

/**
 * NPCs do lobby: moradores que passeiam pela rua, param perto do herói e conversam.
 * A fala (texto e voz) fica na interface; aqui só o movimento e a posição na tela.
 */
export interface NpcDef {
  id: string;
  name: string;
  look: CharacterLook;
  /** Lado da rua onde passeia. */
  x: number;
  speed: number;
}

interface Npc {
  def: NpcDef;
  rig: CharacterRig;
  anim: CharacterAnimator;
  z: number;
  dir: 1 | -1;
  /** Segundos parado (olhando para o herói). */
  pause: number;
  wave: number;
}

const base: CharacterLook = {
  skin: '#e8b48a',
  hair: '#5a3418',
  hairStyle: 'short',
  beard: 'none',
  tunic: '#c9a77a',
  tunicTrim: '#8a5530',
  belt: '#5a3418',
  longSleeves: false,
  robeLength: 'short',
  bag: false,
  bagColor: '#000',
  headwear: 'none',
  headwearColor: '#000',
  accessory: 'none',
  sandal: '#6b3f1f',
  bulk: 1,
  headScale: 1,
};

export const NPC_DEFS: NpcDef[] = [
  { id: 'eli', name: 'Eli, o mercador', look: { ...base, tunic: '#2f7fc1', tunicTrim: '#f6efe0', beard: 'short', headwear: 'turban', headwearColor: '#f6efe0', bulk: 1.1 }, x: -1.9, speed: 0.9 },
  { id: 'ana', name: 'Ana, a pastora', look: { ...base, skin: '#d9a070', hair: '#2e1a0e', hairStyle: 'long', tunic: '#7fae4a', tunicTrim: '#f6efe0', robeLength: 'long', longSleeves: true, headwear: 'hood', headwearColor: '#f3e2b5', bulk: 0.9, accessory: 'staff' }, x: 1.9, speed: 0.75 },
  { id: 'tomas', name: 'Tomé, o menino', look: { ...base, skin: '#c98a5e', hair: '#1f1208', hairStyle: 'curly', tunic: '#d9473a', tunicTrim: '#ffd23f', bulk: 0.8, headScale: 1.15 }, x: 0.4, speed: 1.3 },
];

export class NpcManager {
  readonly group = new THREE.Group();
  private npcs: Npc[] = [];
  private built = false;
  private v = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.group.visible = false;
  }

  /** Cria os NPCs (uma vez) e mostra no lobby. */
  show(): void {
    if (!this.built) {
      this.built = true;
      NPC_DEFS.forEach((def, i) => {
        const rig = buildCharacter(def.look);
        const anim = new CharacterAnimator(rig);
        anim.setState('run');
        this.group.add(rig.root);
        this.npcs.push({ def, rig, anim, z: 4 + i * 4, dir: i % 2 ? 1 : -1, pause: 0, wave: 0 });
      });
    }
    this.group.visible = true;
  }

  hide(): void {
    this.group.visible = false;
  }

  /** Faz o NPC parar e acenar (quando a criança toca nele). */
  greet(id: string): void {
    const n = this.npcs.find((x) => x.def.id === id);
    if (!n) return;
    n.pause = 4;
    n.wave = 1.2;
    n.anim.setState('celebrate');
  }

  update(dt: number, heroZ = 0): void {
    if (!this.group.visible) return;
    for (const n of this.npcs) {
      if (n.pause > 0) {
        n.pause -= dt;
        n.wave -= dt;
        if (n.wave <= 0 && n.anim.state === 'celebrate') n.anim.setState('idle');
        // olha para o herói
        const target = Math.atan2(0 - n.def.x, heroZ - n.z);
        n.rig.root.rotation.y += (target - n.rig.root.rotation.y) * 0.1;
        if (n.pause <= 0) n.anim.setState('run');
      } else {
        n.z += n.dir * n.def.speed * dt;
        if (n.z > 16) n.dir = -1;
        if (n.z < 2.5) n.dir = 1;
        // às vezes para um pouco perto do herói, como quem cumprimenta
        if (Math.abs(n.z - (heroZ + 2.5)) < 1.2 && Math.random() < dt * 0.25) n.pause = 2.2;
        n.rig.root.rotation.y = n.dir === 1 ? Math.PI : 0; // o modelo olha para -Z
      }
      n.rig.root.position.set(n.def.x, 0, n.z);
      n.anim.update(dt, n.pause > 0 ? 0 : 2.5);
    }
  }

  /** Posição de cada NPC na tela (0..1), para os balões de fala. */
  screenPositions(camera: THREE.Camera): { id: string; name: string; x: number; y: number; depth: number }[] {
    if (!this.group.visible) return [];
    return this.npcs.map((n) => {
      this.v.set(n.def.x, 2.1, n.z).project(camera);
      return { id: n.def.id, name: n.def.name, x: (this.v.x + 1) / 2, y: (1 - this.v.y) / 2, depth: this.v.z };
    });
  }
}
