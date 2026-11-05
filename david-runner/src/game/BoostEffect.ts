import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Visual da Carruagem de Fogo (2 Reis 2:11), preso ao jogador sem alterar o modelo:
 * aura dourada, carruagem e cavalos de fogo, rastro de chamas/brasas, linhas de
 * velocidade, onda de choque ao ativar e obstáculos arremessados.
 * Tudo com mistura aditiva e sem luzes novas (não força recompilar shaders da cena).
 */

const EMBERS = 260;
const LINES = 42;
const MAX_DEBRIS = 8;

type V3 = [number, number, number];

function radialTexture(stops: [number, string][]): THREE.CanvasTexture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Une primitivas (posição/rotação/escala) numa geometria só. */
function merge(parts: [THREE.BufferGeometry, V3, V3?, V3?][]): THREE.BufferGeometry {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const list = parts.map(([g, pos, rot = [0, 0, 0], scale = [1, 1, 1]]) => {
    let geo = g.index ? g.toNonIndexed() : g;
    if (geo !== g) g.dispose();
    for (const k of Object.keys(geo.attributes)) if (k !== 'position') geo.deleteAttribute(k);
    q.setFromEuler(new THREE.Euler(...rot));
    m.compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...scale));
    geo = geo.applyMatrix4(m);
    return geo;
  });
  const out = mergeGeometries(list)!;
  list.forEach((g) => g.dispose());
  return out;
}

interface Debris {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  rz: number;
  life: number;
}

interface Horse {
  root: THREE.Group;
  legs: THREE.Mesh[];
  phase: number;
}

export class BoostEffect {
  readonly root = new THREE.Group();
  /** Acompanha o herói (x e altura do pulo). */
  private rider = new THREE.Group();
  private chariot = new THREE.Group();
  private wheels: THREE.Group[] = [];
  private horses: Horse[] = [];
  private auraOuter: THREE.Sprite;
  private auraInner: THREE.Sprite;
  private pillar: THREE.Sprite;
  private ring: THREE.Mesh;
  private flash: THREE.Sprite;
  private fireMat: THREE.MeshBasicMaterial;
  private coreMat: THREE.MeshBasicMaterial;
  private ringMat: THREE.MeshBasicMaterial;
  private spriteMats: THREE.SpriteMaterial[] = [];

  // brasas
  private embers: THREE.Points;
  private ePos = new Float32Array(EMBERS * 3);
  private eVel = new Float32Array(EMBERS * 3);
  private eCol = new Float32Array(EMBERS * 3);
  private eAlpha = new Float32Array(EMBERS);
  private eSize = new Float32Array(EMBERS);
  private eLife = new Float32Array(EMBERS);
  private eMax = new Float32Array(EMBERS);
  private eBig = new Uint8Array(EMBERS);
  private eNext = 0;
  private emitAcc = 0;
  private emberMat: THREE.ShaderMaterial;

  // linhas de velocidade
  private lines: THREE.InstancedMesh;
  private lineMat: THREE.MeshBasicMaterial;
  private lineData = new Float32Array(LINES * 4); // x, y, z, comprimento

  private debris: Debris[] = [];
  /** Estilo do poder equipado: cor dos brilhos e se mostra a carruagem com cavalos. */
  private tint = new THREE.Color(0xff8a1e);
  private showChariot = true;
  private intensity = 0;
  private time = 0;
  private ringT = 1;
  private warm = 0;
  private dummy = new THREE.Object3D();
  private tmpV2 = new THREE.Vector2();
  // FOV
  private fovKick = 0;
  private appliedKick = 0;
  private lastFov = -1;

  constructor(scene: THREE.Scene) {
    const glowTex = radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.3, 'rgba(255,240,190,0.75)'],
      [0.65, 'rgba(255,190,90,0.25)'],
      [1, 'rgba(255,160,60,0)'],
    ]);
    const dotTex = radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.45, 'rgba(255,255,255,0.8)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    const sprite = (color: number, opacity: number) => {
      const m = new THREE.SpriteMaterial({
        map: glowTex,
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      });
      this.spriteMats.push(m);
      m.userData.base = opacity;
      return new THREE.Sprite(m);
    };

    this.fireMat = new THREE.MeshBasicMaterial({
      color: 0xff8a1e,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.coreMat = new THREE.MeshBasicMaterial({
      color: 0xffe27a,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    // ---------- aura dourada
    this.auraOuter = sprite(0xffb12e, 0.55);
    this.auraOuter.position.set(0, 1.0, 0.2);
    this.auraInner = sprite(0xfff0b0, 0.42);
    this.auraInner.position.set(0, 1.05, 0.25);
    this.pillar = sprite(0xff7a1a, 0.5);
    this.pillar.position.set(0, 1.3, 0.3);
    this.rider.add(this.auraOuter, this.pillar, this.auraInner);

    // ---------- carruagem: rodas, eixo, grade da frente e piso
    const wheelGeo = merge([
      [new THREE.TorusGeometry(0.46, 0.065, 6, 22), [0, 0, 0], [0, Math.PI / 2, 0]],
      [new THREE.BoxGeometry(0.05, 0.86, 0.06), [0, 0, 0]],
      [new THREE.BoxGeometry(0.05, 0.86, 0.06), [0, 0, 0], [Math.PI / 3, 0, 0]],
      [new THREE.BoxGeometry(0.05, 0.86, 0.06), [0, 0, 0], [-Math.PI / 3, 0, 0]],
      [new THREE.CylinderGeometry(0.11, 0.11, 0.12, 10), [0, 0, 0], [0, 0, Math.PI / 2]],
    ]);
    for (const side of [-1, 1]) {
      const w = new THREE.Group();
      w.position.set(side * 0.78, 0.5, 0.18);
      w.add(new THREE.Mesh(wheelGeo, this.fireMat));
      this.wheels.push(w);
      this.chariot.add(w);
    }
    const bodyGeo = merge([
      // eixo
      [new THREE.BoxGeometry(1.5, 0.06, 0.06), [0, 0.5, 0.18]],
      // piso
      [new THREE.BoxGeometry(1.1, 0.05, 0.85), [0, 0.42, 0.05]],
      // grade em U na frente, na altura da cintura
      [new THREE.TorusGeometry(0.55, 0.05, 6, 18, Math.PI), [0, 0.98, -0.05], [Math.PI / 2, 0, Math.PI]],
      [new THREE.BoxGeometry(0.05, 0.56, 0.05), [-0.55, 0.7, -0.05]],
      [new THREE.BoxGeometry(0.05, 0.56, 0.05), [0.55, 0.7, -0.05]],
      [new THREE.BoxGeometry(0.05, 0.56, 0.05), [0, 0.7, -0.6]],
      // lança que liga aos cavalos
      [new THREE.BoxGeometry(0.06, 0.06, 1.5), [0, 0.72, -1.25], [0.12, 0, 0]],
    ]);
    this.chariot.add(new THREE.Mesh(bodyGeo, this.coreMat));

    // ---------- dois cavalos de fogo
    const horseGeo = merge([
      [new THREE.SphereGeometry(0.5, 12, 8), [0, 1.0, 0], [0, 0, 0], [0.36, 0.36, 0.78]],
      [new THREE.CylinderGeometry(0.11, 0.18, 0.62, 8), [0, 1.36, -0.5], [-0.65, 0, 0]],
      [new THREE.SphereGeometry(0.5, 10, 7), [0, 1.62, -0.78], [0.5, 0, 0], [0.15, 0.17, 0.34]],
      [new THREE.ConeGeometry(0.05, 0.18, 5), [-0.07, 1.82, -0.62], [-0.3, 0, 0]],
      [new THREE.ConeGeometry(0.05, 0.18, 5), [0.07, 1.82, -0.62], [-0.3, 0, 0]],
      [new THREE.ConeGeometry(0.12, 0.62, 7), [0, 1.0, 0.72], [-2.1, 0, 0]],
    ]);
    const legGeo = new THREE.CylinderGeometry(0.06, 0.045, 0.82, 6);
    legGeo.translate(0, -0.41, 0);
    for (const side of [-1, 1]) {
      const root = new THREE.Group();
      root.position.set(side * 0.5, 0, -2.55);
      root.scale.setScalar(0.92);
      root.add(new THREE.Mesh(horseGeo, this.fireMat));
      const legs: THREE.Mesh[] = [];
      for (const [lx, lz] of [
        [-0.16, -0.38],
        [0.16, -0.38],
        [-0.16, 0.38],
        [0.16, 0.38],
      ]) {
        const leg = new THREE.Mesh(legGeo, this.coreMat);
        leg.position.set(lx, 0.88, lz);
        root.add(leg);
        legs.push(leg);
      }
      this.horses.push({ root, legs, phase: side > 0 ? 0.9 : 0 });
      this.chariot.add(root);
    }
    this.rider.add(this.chariot);

    // ---------- onda de choque e clarão ao ativar
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xffc340,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.05, 40), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.12;
    this.flash = sprite(0xffe08a, 0);
    this.flash.position.set(0, 1.1, 0);
    this.rider.add(this.ring, this.flash);
    this.root.add(this.rider);

    // ---------- brasas e chamas (partículas com tamanho e transparência próprios)
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.ePos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.eCol, 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.eAlpha, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.eSize, 1));
    this.emberMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: dotTex }, uScale: { value: 400 } },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aAlpha;
        attribute float aSize;
        uniform float uScale;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = min(aSize * uScale / max(0.2, -mv.z), 180.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vColor * t.rgb, t.a * vAlpha);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.embers = new THREE.Points(g, this.emberMat);
    this.embers.frustumCulled = false;
    this.embers.onBeforeRender = (renderer) => {
      renderer.getDrawingBufferSize(this.tmpV2);
      this.emberMat.uniforms.uScale.value = this.tmpV2.y * 0.5;
    };
    for (let i = 0; i < EMBERS; i++) this.ePos[i * 3 + 1] = -100;
    this.root.add(this.embers);

    // ---------- linhas de velocidade (1 draw call)
    this.lineMat = new THREE.MeshBasicMaterial({
      color: 0xfff1c8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.lines = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.lineMat, LINES);
    this.lines.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.lines.frustumCulled = false;
    for (let i = 0; i < LINES; i++) this.respawnLine(i, -Math.random() * 70);
    this.root.add(this.lines);

    this.root.visible = false;
    scene.add(this.root);
  }

  private respawnLine(i: number, z: number): void {
    const side = Math.random() < 0.5 ? -1 : 1;
    const high = Math.random() < 0.3;
    const x = high ? (Math.random() * 2 - 1) * 4 : side * (1.9 + Math.random() * 5);
    const y = high ? 3.6 + Math.random() * 2.5 : 0.25 + Math.random() * 3.6;
    const d = this.lineData;
    d[i * 4] = x;
    d[i * 4 + 1] = y;
    d[i * 4 + 2] = z;
    d[i * 4 + 3] = 2.5 + Math.random() * 4.5;
  }

  /** Define a cor dos efeitos e se a carruagem com cavalos aparece (só na Carruagem de Fogo). */
  setStyle(glow: number, chariot: boolean): void {
    this.tint.set(glow);
    this.showChariot = chariot;
    const warm = new THREE.Color(glow).lerp(new THREE.Color(0xffffff), 0.45);
    (this.auraOuter.material as THREE.SpriteMaterial).color.set(glow);
    (this.auraInner.material as THREE.SpriteMaterial).color.copy(warm);
    (this.pillar.material as THREE.SpriteMaterial).color.set(glow);
    (this.flash.material as THREE.SpriteMaterial).color.copy(warm);
    this.ringMat.color.copy(warm);
    this.lineMat.color.copy(warm);
  }

  /** Efeito de ativação: onda de choque, clarão e explosão de chamas. */
  pulse(): void {
    this.ringT = 0;
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = 3 + Math.random() * 4;
      this.emit(this.rider.position.x, this.rider.position.y + 0.6 + Math.random(), 0.1, Math.cos(a) * s, 1 + Math.random() * 3, Math.sin(a) * s, Math.random() < 0.5);
    }
  }

  private emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, big: boolean): void {
    const i = this.eNext;
    this.eNext = (this.eNext + 1) % EMBERS;
    this.ePos[i * 3] = x;
    this.ePos[i * 3 + 1] = y;
    this.ePos[i * 3 + 2] = z;
    this.eVel[i * 3] = vx;
    this.eVel[i * 3 + 1] = vy;
    this.eVel[i * 3 + 2] = vz;
    const life = big ? 0.32 + Math.random() * 0.25 : 0.5 + Math.random() * 0.5;
    this.eLife[i] = this.eMax[i] = life;
    this.eBig[i] = big ? 1 : 0;
  }

  /**
   * Arremessa a cópia de um obstáculo atravessado pela carruagem.
   * `x, z`: posição do obstáculo; `heroX`: para qual lado ele voa.
   */
  fling(source: THREE.Mesh, x: number, z: number, heroX: number): void {
    let d: Debris;
    if (this.debris.length >= MAX_DEBRIS) {
      d = this.debris.shift()!;
    } else {
      d = { mesh: new THREE.Mesh(), vx: 0, vy: 0, vz: 0, rx: 0, rz: 0, life: 0 };
      d.mesh.castShadow = false;
    }
    d.mesh.geometry = source.geometry;
    d.mesh.material = source.material;
    d.mesh.position.set(x, 0.05, z);
    d.mesh.rotation.copy(source.rotation);
    d.mesh.scale.setScalar(1);
    let dir = Math.sign(x - heroX);
    if (Math.abs(x - heroX) < 0.4) dir = Math.random() < 0.5 ? -1 : 1;
    d.vx = dir * (3.5 + Math.random() * 3.5);
    d.vy = 7 + Math.random() * 4;
    d.vz = -(9 + Math.random() * 6);
    d.rx = (Math.random() * 2 - 1) * 9;
    d.rz = dir * (5 + Math.random() * 6);
    d.life = 1.15;
    this.root.add(d.mesh);
    this.debris.push(d);
    for (let k = 0; k < 14; k++) {
      this.emit(x + (Math.random() - 0.5) * 1.2, 0.3 + Math.random() * 1.6, z, (Math.random() - 0.5) * 6, 1 + Math.random() * 4, -Math.random() * 4, k % 2 === 0);
    }
  }

  /**
   * `target`: intensidade desejada (0..1). `dd`: quanto o mundo andou neste passo.
   * `px, py`: posição do herói; `speed`: velocidade atual.
   */
  update(dt: number, dd: number, target: number, px: number, py: number, sliding: boolean, speed: number): void {
    this.time += dt;
    this.intensity += (target - this.intensity) * Math.min(1, dt * (target > this.intensity ? 10 : 4));
    if (this.intensity < 0.003 && target === 0) this.intensity = 0;
    const k = this.intensity;
    const t = this.time;

    this.rider.position.set(px, py, 0);
    this.rider.visible = k > 0.001 || this.ringT < 1;

    // aura pulsante
    const pulse = 1 + Math.sin(t * 9) * 0.07 + Math.sin(t * 23) * 0.04;
    const auraY = sliding ? 0.55 : 1.0;
    this.auraOuter.position.y = auraY;
    this.auraInner.position.y = auraY + 0.05;
    this.auraOuter.scale.setScalar(3.4 * pulse);
    this.auraInner.scale.setScalar(1.9 * pulse);
    this.pillar.position.y = auraY + 0.35;
    this.pillar.scale.set(1.7 * pulse, 3.6 * (1 + Math.sin(t * 13) * 0.08), 1);
    for (const m of this.spriteMats) if (m !== this.flash.material) m.opacity = (m.userData.base as number) * k;

    // carruagem e cavalos
    const fk = Math.min(1, k * 1.2);
    this.fireMat.opacity = 0.72 * fk * (0.9 + Math.sin(t * 31) * 0.1);
    this.coreMat.opacity = 0.8 * fk;
    this.chariot.visible = this.showChariot && k > 0.02;
    this.chariot.position.y = sliding ? -0.15 : 0;
    const roll = (speed * dt) / 0.46;
    for (const w of this.wheels) w.rotation.x -= roll;
    const gallop = t * Math.max(8, speed * 0.55);
    for (const h of this.horses) {
      h.root.position.y = Math.abs(Math.sin(gallop * 0.5 + h.phase)) * 0.16;
      h.root.rotation.x = Math.sin(gallop + h.phase) * 0.06;
      h.legs.forEach((leg, i) => {
        const front = i < 2;
        leg.rotation.x = Math.sin(gallop + h.phase + (front ? 0 : Math.PI) + (i % 2) * 0.5) * 0.75;
      });
    }

    // onda de choque
    if (this.ringT < 1) {
      this.ringT = Math.min(1, this.ringT + dt / 0.6);
      const e = 1 - Math.pow(1 - this.ringT, 3);
      this.ring.scale.setScalar(1 + e * 7);
      this.ringMat.opacity = (1 - this.ringT) * 0.95;
      (this.flash.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - this.ringT * 2.2) * 0.9;
      this.flash.scale.setScalar(2 + e * 7);
    } else {
      this.ringMat.opacity = 0;
      (this.flash.material as THREE.SpriteMaterial).opacity = 0;
    }

    // emissão de chamas: rodas, corpo do herói e cavalos
    if (k > 0.02) {
      this.emitAcc += dt * 260 * k;
      while (this.emitAcc >= 1) {
        this.emitAcc -= 1;
        const r = Math.random();
        const y0 = sliding ? 0.15 : 0;
        if (r < 0.34) {
          const side = Math.random() < 0.5 ? -0.78 : 0.78;
          this.emit(px + side, py + y0 + 0.1 + Math.random() * 0.5, 0.35, (Math.random() - 0.5) * 0.8, 0.6 + Math.random() * 1.4, 0.5, Math.random() < 0.45);
        } else if (r < 0.7) {
          this.emit(px + (Math.random() - 0.5) * 0.9, py + y0 + 0.3 + Math.random() * 1.4, 0.3, (Math.random() - 0.5) * 1.2, 1.4 + Math.random() * 2.2, 0.8, Math.random() < 0.55);
        } else {
          const side = Math.random() < 0.5 ? -0.46 : 0.46;
          this.emit(px + side, py + y0 + 0.9 + Math.random() * 0.8, -2.5 + Math.random() * 1.2, (Math.random() - 0.5) * 0.6, 0.6 + Math.random(), 1.5, Math.random() < 0.6);
        }
      }
    }

    // atualiza brasas
    let alive = false;
    const trail = dd * 0.42;
    for (let i = 0; i < EMBERS; i++) {
      if (this.eLife[i] <= 0) continue;
      this.eLife[i] -= dt;
      if (this.eLife[i] <= 0) {
        this.ePos[i * 3 + 1] = -100;
        this.eAlpha[i] = 0;
        continue;
      }
      alive = true;
      const life = 1 - this.eLife[i] / this.eMax[i];
      this.eVel[i * 3 + 1] += 2.2 * dt;
      this.ePos[i * 3] += this.eVel[i * 3] * dt;
      this.ePos[i * 3 + 1] += this.eVel[i * 3 + 1] * dt;
      this.ePos[i * 3 + 2] += this.eVel[i * 3 + 2] * dt + trail;
      // branco → cor do poder → escurece (fogo: branco-amarelo → laranja → vermelho)
      const c = this.eCol;
      const tr = this.tint.r, tg = this.tint.g, tb = this.tint.b;
      if (life < 0.35) {
        const u = life / 0.35;
        c[i * 3] = 1 - u * (1 - tr) * 0.5;
        c[i * 3 + 1] = 1 - u * (1 - tg) * 0.6;
        c[i * 3 + 2] = 1 - u * (1 - tb) * 0.7;
      } else {
        const u = (life - 0.35) / 0.65;
        c[i * 3] = tr * (1 - u * 0.3);
        c[i * 3 + 1] = tg * (1 - u * 0.6);
        c[i * 3 + 2] = tb * (1 - u * 0.6);
      }
      const big = this.eBig[i] === 1;
      this.eAlpha[i] = (1 - life) * (big ? 0.75 : 1);
      this.eSize[i] = big ? 0.75 * (1 - life * 0.5) : 0.16 * (1 - life * 0.4);
    }
    const geo = this.embers.geometry;
    geo.getAttribute('position').needsUpdate = true;
    geo.getAttribute('aColor').needsUpdate = true;
    geo.getAttribute('aAlpha').needsUpdate = true;
    geo.getAttribute('aSize').needsUpdate = true;

    // linhas de velocidade
    this.lineMat.opacity = 0.5 * k;
    this.lines.visible = k > 0.02;
    if (this.lines.visible) {
      const ld = this.lineData;
      const v = speed * 1.7 + 18;
      for (let i = 0; i < LINES; i++) {
        ld[i * 4 + 2] += v * dt;
        if (ld[i * 4 + 2] > 9) this.respawnLine(i, -60 - Math.random() * 20);
        this.dummy.position.set(ld[i * 4], ld[i * 4 + 1], ld[i * 4 + 2]);
        this.dummy.scale.set(0.035, 0.035, ld[i * 4 + 3] * (0.6 + k * 0.6));
        this.dummy.updateMatrix();
        this.lines.setMatrixAt(i, this.dummy.matrix);
      }
      this.lines.instanceMatrix.needsUpdate = true;
    }

    // obstáculos arremessados
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      if (d.life <= 0) {
        d.mesh.removeFromParent();
        this.debris.splice(i, 1);
        continue;
      }
      d.vy -= 22 * dt;
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y = Math.max(0, d.mesh.position.y + d.vy * dt);
      d.mesh.position.z += d.vz * dt + dd;
      d.mesh.rotation.x += d.rx * dt;
      d.mesh.rotation.z += d.rz * dt;
      if (d.life < 0.3) d.mesh.scale.setScalar(Math.max(0.01, d.life / 0.3));
    }

    const busy = k > 0.001 || alive || this.debris.length > 0 || this.ringT < 1;
    if (this.warm > 0) {
      // primeiros quadros: desenha tudo transparente para compilar os shaders antes de usar
      this.warm--;
      this.root.visible = this.rider.visible = this.chariot.visible = this.lines.visible = true;
    } else {
      this.root.visible = busy;
    }
  }

  /** Abre um pouco o campo de visão durante o poder (sensação de velocidade). */
  applyCamera(camera: THREE.PerspectiveCamera, dt: number): void {
    const target = 8 * this.intensity;
    this.fovKick += (target - this.fovKick) * Math.min(1, dt * 5);
    if (Math.abs(this.fovKick) < 0.01 && target === 0) this.fovKick = 0;
    if (this.fovKick === 0 && this.appliedKick === 0) {
      this.lastFov = camera.fov;
      return;
    }
    // se a câmera recalculou o FOV (redimensionar/trocar modo), ele já vem sem o acréscimo
    const base = camera.fov === this.lastFov ? camera.fov - this.appliedKick : camera.fov;
    camera.fov = base + this.fovKick;
    camera.updateProjectionMatrix();
    this.appliedKick = this.fovKick;
    this.lastFov = camera.fov;
  }

  reset(): void {
    this.intensity = 0;
    this.ringT = 1;
    this.emitAcc = 0;
    this.eLife.fill(0);
    this.eAlpha.fill(0);
    for (let i = 0; i < EMBERS; i++) this.ePos[i * 3 + 1] = -100;
    for (const d of this.debris) d.mesh.removeFromParent();
    this.debris.length = 0;
    this.warm = 2;
  }
}
