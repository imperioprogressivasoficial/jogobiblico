import * as THREE from 'three';

/**
 * Cenas da história ao lado da pista: no modo "Viver a história", os elementos da história
 * (arca, pomba, arco-íris, mar, estrelas...) aparecem como figuras grandes que flutuam
 * à beira do caminho enquanto o narrador conta.
 */
interface Prop {
  sprite: THREE.Sprite;
  d: number;
  side: number;
  phase: number;
  base: number;
}

const textures = new Map<string, THREE.Texture>();

function emojiTexture(emoji: string): THREE.Texture {
  let t = textures.get(emoji);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  // halo dourado por trás da figura, para destacar no cenário
  const grad = g.createRadialGradient(128, 128, 20, 128, 128, 126);
  grad.addColorStop(0, 'rgba(255,240,180,0.85)');
  grad.addColorStop(0.55, 'rgba(255,220,120,0.35)');
  grad.addColorStop(1, 'rgba(255,220,120,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.font = '170px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(emoji, 128, 140);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  textures.set(emoji, t);
  return t;
}

export class StoryProps {
  readonly group = new THREE.Group();
  private props: Prop[] = [];
  private time = 0;

  /** Espalha as figuras pelos próximos metros, alternando os lados da pista. */
  spawn(emojis: string[], fromDistance: number, count = 6, spacing = 22): void {
    if (!emojis.length) return;
    for (let i = 0; i < count; i++) {
      const emoji = emojis[i % emojis.length];
      const mat = new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true, depthWrite: false, fog: true });
      const sprite = new THREE.Sprite(mat);
      const big = i % emojis.length === 0;
      const s = big ? 4.2 : 3.2;
      sprite.scale.set(s, s, 1);
      const side = i % 2 ? 1 : -1;
      const base = big ? 3.2 : 2.6;
      this.props.push({ sprite, d: fromDistance + 30 + i * spacing, side, phase: Math.random() * 6, base });
      this.group.add(sprite);
    }
  }

  update(distance: number, dt: number): void {
    this.time += dt;
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i];
      const rel = p.d - distance;
      if (rel < -8) {
        this.group.remove(p.sprite);
        p.sprite.material.dispose();
        this.props.splice(i, 1);
        continue;
      }
      // surge suavemente ao se aproximar
      const fade = Math.min(1, Math.max(0, (60 - rel) / 14));
      p.sprite.material.opacity = fade;
      p.sprite.position.set(p.side * (5.6 + Math.sin(this.time * 0.6 + p.phase) * 0.3), p.base + Math.sin(this.time * 1.6 + p.phase) * 0.35, -rel);
    }
  }

  clear(): void {
    for (const p of this.props) {
      this.group.remove(p.sprite);
      p.sprite.material.dispose();
    }
    this.props = [];
  }
}
