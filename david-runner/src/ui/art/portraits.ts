import * as THREE from 'three';
import { resolveLook } from '../../data/characters';
import { buildCharacter } from '../../game/models/characterModel';
import { CharacterAnimator } from '../../game/models/characterAnimator';

/**
 * Retratos dos heróis desenhados a partir do próprio modelo 3D (busto, três quartos, sorrindo),
 * com um pequeno renderizador fora da tela. Cada retrato é gerado uma vez e fica em cache.
 * Usados na interface no lugar de avatares com letra.
 */
const cache = new Map<string, string>();
const waiting = new Map<string, ((url: string) => void)[]>();
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
const SIZE = 256;

function setup(): boolean {
  if (renderer) return true;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(SIZE, SIZE, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.0;
    scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a7a6a, 0.9);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(2.5, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fd3ff, 1.4);
    rim.position.set(-3, 2, -2);
    scene.add(rim);
    camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
    return true;
  } catch {
    renderer = null;
    return false;
  }
}

/** Retrato do herói (busto). Devolve um data URL em cache, ou null na primeira vez (chame `onReady`). */
export function portraitUrl(charId: string, skinId = 'padrao'): string | null {
  return cache.get(charId + '/' + skinId) ?? null;
}

export function loadPortrait(charId: string, skinId = 'padrao', onReady: (url: string) => void): void {
  const key = charId + '/' + skinId;
  const hit = cache.get(key);
  if (hit) {
    onReady(hit);
    return;
  }
  const list = waiting.get(key);
  if (list) {
    list.push(onReady);
    return;
  }
  waiting.set(key, [onReady]);
  // gera no próximo quadro para não travar a abertura da tela
  requestAnimationFrame(() => {
    const url = render(charId, skinId);
    if (url) cache.set(key, url);
    const cbs = waiting.get(key) ?? [];
    waiting.delete(key);
    if (url) for (const cb of cbs) cb(url);
  });
}

function render(charId: string, skinId: string): string | null {
  if (!setup() || !renderer || !scene || !camera) return null;
  const rig = buildCharacter(resolveLook(charId, skinId));
  const anim = new CharacterAnimator(rig);
  anim.setState('celebrate');
  // avança a animação para uma pose simpática já assentada
  for (let i = 0; i < 40; i++) anim.update(1 / 60, 0);
  anim.setState('idle');
  for (let i = 0; i < 30; i++) anim.update(1 / 60, 0);
  rig.root.rotation.y = 0.5; // três quartos (o modelo olha para -Z), virado um pouco para a câmera
  scene.add(rig.root);
  // enquadra o busto: a cabeça no terço superior
  const box = new THREE.Box3().setFromObject(rig.root);
  const top = box.max.y;
  const h = box.max.y - box.min.y;
  const headY = top - h * 0.17;
  camera.position.set(-0.75, headY + 0.05, -3.3);
  camera.lookAt(0.02, headY - 0.2, 0);
  renderer.setClearColor(0x000000, 0);
  renderer.render(scene, camera);
  let url: string | null = null;
  try {
    url = renderer.domElement.toDataURL('image/png');
  } catch {
    url = null;
  }
  scene.remove(rig.root);
  rig.dispose();
  return url;
}
