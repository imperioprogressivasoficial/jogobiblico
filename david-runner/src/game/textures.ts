import * as THREE from 'three';
import type { MapTheme } from '../data/maps';

/** Texturas procedurais desenhadas em canvas — nenhum arquivo de imagem é necessário. */

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function finish(canvas: HTMLCanvasElement, repeatX: number, repeatY: number): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function makeRoadTexture(road: MapTheme['road']): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const r = rng(1234);
  ctx.fillStyle = road.grout;
  ctx.fillRect(0, 0, size, size);

  const drawStone = (x: number, y: number, w: number, h: number, rad: number) => {
    const col = road.stones[Math.floor(r() * road.stones.length)];
    ctx.fillStyle = col;
    roundRect(ctx, x, y, w, h, rad);
    ctx.fill();
    // brilho superior e sombra inferior para dar volume
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, x + 3, y + 3, w - 6, h * 0.35, rad * 0.6);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    roundRect(ctx, x + 2, y + h * 0.7, w - 4, h * 0.28, rad * 0.6);
    ctx.fill();
  };

  if (road.pattern === 'cobble') {
    const rows = 8;
    const rh = size / rows;
    for (let row = 0; row < rows; row++) {
      let x = row % 2 ? -rh * 0.5 : 0;
      while (x < size) {
        const w = rh * (0.8 + r() * 0.6);
        drawStone(x + 3, row * rh + 3, w - 6, rh - 6, 14);
        if (x + w > size) drawStone(x - size + 3, row * rh + 3, w - 6, rh - 6, 14);
        x += w;
      }
    }
  } else if (road.pattern === 'slabs' || road.pattern === 'bricks') {
    const rows = road.pattern === 'bricks' ? 10 : 4;
    const rh = size / rows;
    const cols = road.pattern === 'bricks' ? 4 : 2;
    const cw = size / cols;
    for (let row = 0; row < rows; row++) {
      const off = row % 2 ? cw / 2 : 0;
      for (let col = -1; col < cols + 1; col++) {
        drawStone(col * cw + off + 2, row * rh + 2, cw - 4, rh - 4, road.pattern === 'bricks' ? 3 : 6);
      }
    }
  } else {
    // areia / terra batida com pedrinhas
    ctx.fillStyle = road.base;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = road.stones[Math.floor(r() * road.stones.length)];
      const s = 2 + r() * (road.pattern === 'dirt' ? 7 : 4);
      ctx.globalAlpha = 0.35 + r() * 0.5;
      ctx.fillRect(r() * size, r() * size, s, s * (0.6 + r() * 0.6));
    }
    ctx.globalAlpha = 1;
    // marcas de rodas
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (const x of [0.2, 0.36, 0.64, 0.8]) ctx.fillRect(x * size, 0, size * 0.04, size);
  }
  return finish(c, 2, 6);
}

export function makeSideTexture(side: MapTheme['side']): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const r = rng(99);
  ctx.fillStyle = side.base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = side.speckles[Math.floor(r() * side.speckles.length)];
    ctx.globalAlpha = 0.4 + r() * 0.5;
    const s = 2 + r() * 6;
    ctx.beginPath();
    ctx.ellipse(r() * size, r() * size, s, s * 0.6, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return finish(c, 8, 4);
}

/** Textura radial suave usada em brilhos de itens especiais. */
export function makeGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,240,180,0.6)');
  g.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
