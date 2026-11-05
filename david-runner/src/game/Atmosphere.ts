import * as THREE from 'three';
import type { MapTheme } from '../data/maps';
import { GeoBuilder } from './models/geo';
import { Materials, RimUniforms } from './models/materials';
import { BACKDROP_FACTORIES } from './models/scenery';
import { Rng } from './rng';

/** Ajustes de luz de "hora dourada" por mapa (os dados do mapa não mudam). */
interface MapLook {
  /** Direção de onde vem o sol (normalizada no uso). */
  sunDir: [number, number, number];
  /** Tom quente misturado à cor do sol do mapa. */
  sunTint: string;
  tintAmount: number;
  /** Multiplicador da intensidade do sol do mapa. */
  sunScale: number;
  /** Intensidade do mapa de ambiente (céu) nos materiais. */
  envIntensity: number;
  exposure: number;
  /** Cor do céu entre o horizonte e o topo. */
  skyMid: string;
  /** Brilho quente no horizonte. */
  horizonGlow: number;
  /** Cor da luz de contorno dos personagens. */
  rim: string;
  /** Brilho do chão no mapa de ambiente (luz rebatida quente vinda de baixo). */
  groundBounce: number;
  /** Brilho das nuvens (HDR: >1 fica branco depois do tone mapping). */
  cloudLit: number;
}

const DEFAULT_LOOK: MapLook = {
  sunDir: [-0.42, 0.72, 0.66],
  sunTint: '#ffcf96',
  tintAmount: 0.45,
  sunScale: 1.85,
  envIntensity: 0.56,
  exposure: 0.85,
  skyMid: '#74bdf2',
  horizonGlow: 0.55,
  rim: '#ffd3a0',
  groundBounce: 1.1,
  cloudLit: 1.6,
};

const LOOKS: Record<string, Partial<MapLook>> = {
  jerusalem: {},
  deserto: { sunTint: '#ffbf7a', tintAmount: 0.5, skyMid: '#86c6f2', horizonGlow: 0.7, exposure: 0.82 },
  vale: { sunTint: '#ffdca8', tintAmount: 0.35, skyMid: '#86c4f2', envIntensity: 0.95, rim: '#ffe2b5' },
  egito: { sunTint: '#ffc483', tintAmount: 0.5, skyMid: '#84c2f0', horizonGlow: 0.7, exposure: 0.82 },
  babilonia: { sunDir: [-0.5, 0.64, 0.62], sunTint: '#ffae73', tintAmount: 0.55, skyMid: '#88b9ec', horizonGlow: 0.85, rim: '#ffbf8f' },
};

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
	vDir = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

/** Céu em degradê rico com disco do sol, halo e brilho quente no horizonte. */
const SKY_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec4 uSun; // x: disco, y: halo, z: cos do raio do disco, w: brilho do horizonte
varying vec3 vDir;
void main() {
	vec3 d = normalize( vDir );
	float h = d.y;
	float up = max( h, 0.0 );
	vec3 col = mix( uHorizon, uMid, smoothstep( 0.0, 0.16, up ) );
	col = mix( col, uTop, smoothstep( 0.06, 0.5, up ) );
	col = mix( col, uGround, smoothstep( 0.0, -0.05, h ) );
	float sd = max( dot( d, uSunDir ), 0.0 );
	float disc = smoothstep( uSun.z, mix( uSun.z, 1.0, 0.4 ), sd );
	float halo = pow( sd, 900.0 ) * 2.0 + pow( sd, 64.0 ) * 0.8 + pow( sd, 8.0 ) * 0.22;
	float band = pow( 1.0 - min( abs( h ), 1.0 ), 7.0 );
	col += uSunColor * ( disc * uSun.x + halo * uSun.y + band * uSun.w * ( 0.35 + 0.65 * sd * sd ) );
	gl_FragColor = vec4( col, 1.0 );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`;

function skyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGround: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uSun: { value: new THREE.Vector4(6, 1, 0.9995, 0.5) },
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
}

/** Nuvem fofa: vários "puffs" lisos, base achatada e degradê de cor (claro em cima). */
function puffyCloudGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder(0);
  const puffs: [number, number, number, number][] = [
    [0, 0.6, 0, 5.4],
    [-5.4, -0.4, 0.8, 4.1],
    [5.6, -0.3, -0.5, 4.4],
    [1.8, 3.2, 0.3, 3.9],
    [-2.8, 2.4, -0.4, 3.3],
    [-9.4, -1.4, 0.3, 2.9],
    [9.8, -1.5, 0.4, 3.0],
    [-0.6, -1.0, 2.8, 3.6],
  ];
  for (const [x, y, z, r] of puffs) b.ico(r, 1, '#ffffff', { pos: [x, y, z], scale: [1, 0.9, 0.85] });
  const g = b.build();
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const col = g.getAttribute('color') as THREE.BufferAttribute;
  const bottom = -1.9;
  const lo = new THREE.Color(0.8, 0.82, 0.92);
  const hi = new THREE.Color(1, 1, 1);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i);
    if (y < bottom) {
      y = bottom + (y - bottom) * 0.18;
      pos.setY(i, y);
    }
    const t = THREE.MathUtils.smoothstep(y, bottom - 0.3, 6.5);
    c.copy(lo).lerp(hi, t);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}

interface Cloud {
  x: number;
  y: number;
  z: number;
  s: number;
  sy: number;
  rot: number;
  speed: number;
}

const CLOUD_COUNT = 16;

/**
 * Atmosfera: céu, sol, luzes, neblina, nuvens, horizonte distante e o mapa de
 * ambiente (PMREM) usado para reflexos e luz ambiente suave.
 * (O chão e as construções ficam no EnvironmentManager.)
 */
export class Atmosphere {
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  /**
   * Luz de preenchimento do herói nas telas de menu/vitrine: lá a câmera fica de
   * frente para o personagem, com o sol atrás dele. Sem sombra; na corrida fica em 0.
   */
  readonly fill: THREE.DirectionalLight;
  private fillK = 0;
  private fillMax = 2.2;
  /** Exposição sugerida para o mapa atual (aplicada ao renderizador). */
  exposure = 1;
  private sky: THREE.Mesh;
  private skyMat = skyMaterial();
  private backdrop: THREE.Mesh | null = null;
  private clouds: THREE.InstancedMesh;
  private cloudData: Cloud[] = [];
  private cloudDummy = new THREE.Object3D();
  private rng = new Rng(77);
  private sunDir = new THREE.Vector3();
  private renderer: THREE.WebGLRenderer | null = null;
  private pmrem: THREE.PMREMGenerator | null = null;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private envScene = new THREE.Scene();
  private envMat = skyMaterial();
  private theme: MapTheme | null = null;
  private envIntensity = 1;
  private override: Partial<MapLook> = {};

  constructor(private scene: THREE.Scene) {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.35);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 2.5;
    this.sun.shadow.intensity = 0.88;
    scene.add(this.sun, this.sun.target);
    this.fill = new THREE.DirectionalLight(0xffe8cc, 0);
    this.fill.position.set(3.2, 4.5, -9);
    this.fill.target.position.set(0, 1, 0);
    scene.add(this.fill, this.fill.target);

    this.sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), this.skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), this.envMat);
    this.envScene.add(envSky);

    this.clouds = new THREE.InstancedMesh(puffyCloudGeometry(), Materials.cloud, CLOUD_COUNT);
    this.clouds.frustumCulled = false;
    this.clouds.renderOrder = -6;
    for (let i = 0; i < CLOUD_COUNT; i++) {
      // 2/3 à frente (corrida) e 1/3 atrás (câmera do menu olha para trás)
      const ahead = i % 3 !== 2;
      const cloud: Cloud = {
        x: this.rng.range(-240, 240),
        y: this.rng.range(42, 92),
        z: ahead ? this.rng.range(-170, -330) : this.rng.range(140, 300),
        s: this.rng.range(1.5, 2.8),
        sy: this.rng.range(0.75, 1.05),
        rot: this.rng.range(0, Math.PI * 2),
        speed: this.rng.range(1, 2.4),
      };
      this.cloudData.push(cloud);
      this.placeCloud(i);
    }
    scene.add(this.clouds);
  }

  /** Liga o renderizador (necessário para gerar o mapa de ambiente). */
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    this.pmrem?.dispose();
    this.pmrem = new THREE.PMREMGenerator(renderer);
    if (this.theme) this.rebuildEnvironment();
  }

  setTheme(theme: MapTheme): void {
    this.theme = theme;
    const look: MapLook = { ...DEFAULT_LOOK, ...(LOOKS[theme.backdrop] ?? {}), ...this.override };
    const scene = this.scene;
    scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
    scene.background = new THREE.Color(theme.fog);
    this.exposure = look.exposure;
    if (this.renderer) this.renderer.toneMappingExposure = look.exposure;

    // luzes: sol de hora dourada + preenchimento fraco (o céu ilumina via PMREM)
    this.sunDir.set(...look.sunDir).normalize();
    const sunColor = new THREE.Color(theme.sun).lerp(new THREE.Color(look.sunTint), look.tintAmount);
    this.sun.color.copy(sunColor);
    this.sun.intensity = theme.sunIntensity * look.sunScale;
    this.hemi.color.set(theme.hemiSky);
    this.hemi.groundColor.set(theme.hemiGround);
    this.envIntensity = look.envIntensity;
    RimUniforms.drRimColor.value.set(look.rim);
    this.fitShadow();

    // céu
    const fog = new THREE.Color(theme.fog);
    const top = new THREE.Color(theme.skyTop);
    const mid = new THREE.Color(look.skyMid).lerp(new THREE.Color(theme.skyBottom), 0.25);
    const horizon = new THREE.Color(theme.skyBottom).lerp(fog, 0.55);
    const u = this.skyMat.uniforms;
    u.uTop.value.copy(top);
    u.uMid.value.copy(mid);
    u.uHorizon.value.copy(fog);
    u.uGround.value.copy(fog);
    u.uSunDir.value.copy(this.sunDir);
    u.uSunColor.value.copy(sunColor);
    u.uSun.value.set(7, 1.2, Math.cos(THREE.MathUtils.degToRad(2.2)), look.horizonGlow);

    // ambiente para reflexos/luz difusa: o mesmo céu, chão quente e sol mais forte
    const e = this.envMat.uniforms;
    e.uTop.value.copy(top);
    e.uMid.value.copy(mid);
    e.uHorizon.value.copy(horizon);
    e.uGround.value.set(theme.hemiGround).lerp(new THREE.Color(theme.road.base), 0.5).multiplyScalar(look.groundBounce);
    e.uSunDir.value.copy(this.sunDir);
    e.uSunColor.value.copy(sunColor);
    e.uSun.value.set(40, 2.5, Math.cos(THREE.MathUtils.degToRad(3.5)), look.horizonGlow);

    // nuvens
    const cu = Materials.cloud.uniforms;
    cu.uSunDir.value.copy(this.sunDir);
    cu.uLit.value.set(0xffffff).lerp(sunColor, 0.3).multiplyScalar(look.cloudLit);
    cu.uShade.value.copy(mid).lerp(new THREE.Color(0.86, 0.88, 1.0), 0.7).multiplyScalar(look.cloudLit * 0.78);
    this.fill.color.set(0xffffff).lerp(sunColor, 0.5);
    cu.uHorizon.value.copy(fog);

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

    this.rebuildEnvironment();
  }

  /** Ajuste fino em tempo real (ferramenta de desenvolvimento): reaplica o mapa atual. */
  tune(look: Partial<MapLook>): void {
    Object.assign(this.override, look);
    if (this.theme) this.setTheme(this.theme);
  }

  /** Gera o PMREM do céu do mapa e liga em scene.environment e nas moedas. */
  private rebuildEnvironment(): void {
    if (!this.pmrem) return;
    const rt = this.pmrem.fromScene(this.envScene, 0, 1, 200, { size: 128 });
    this.envRT?.dispose();
    this.envRT = rt;
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = this.envIntensity;
    const firstEnv = Materials.coin.envMap === null;
    Materials.coin.envMap = rt.texture;
    if (firstEnv) Materials.coin.needsUpdate = true;
  }

  /**
   * Ajusta a câmera de sombra do sol à região que importa: a estrada desde trás
   * do jogador até ~55 m à frente (o mundo se move, o jogador fica em z = 0).
   */
  private fitShadow(): void {
    const target = new THREE.Vector3(0, 0, -20);
    this.sun.target.position.copy(target);
    this.sun.position.copy(target).addScaledVector(this.sunDir, 70);
    this.sun.updateMatrixWorld();
    this.sun.target.updateMatrixWorld();
    const view = new THREE.Matrix4().lookAt(this.sun.position, target, new THREE.Vector3(0, 1, 0));
    view.setPosition(this.sun.position);
    view.invert();
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    const p = new THREE.Vector3();
    for (const x of [-6.2, 6.2])
      for (const y of [0, 4.6])
        for (const z of [-56, 6]) {
          p.set(x, y, z).applyMatrix4(view);
          min.min(p);
          max.max(p);
        }
    const sc = this.sun.shadow.camera;
    sc.left = min.x - 0.5;
    sc.right = max.x + 0.5;
    sc.bottom = min.y - 0.5;
    sc.top = max.y + 0.5;
    sc.near = Math.max(0.5, -max.z - 8);
    sc.far = -min.z + 8;
    sc.updateProjectionMatrix();
  }

  /** Resolução e suavidade da sombra por qualidade. */
  setShadowQuality(mapSize: number, radius: number): void {
    const s = this.sun.shadow;
    s.radius = radius;
    if (s.mapSize.x === mapSize) return;
    s.mapSize.set(mapSize, mapSize);
    s.map?.dispose();
    s.map = null;
  }

  /** Liga (1) ou desliga (0) suavemente o preenchimento do herói. */
  setHeroFill(target: number, dt: number): void {
    this.fillK += (target - this.fillK) * (1 - Math.exp(-dt * 3));
    this.fill.intensity = this.fillK * this.fillMax;
  }

  /** Menos nuvens nas qualidades baixas. */
  setCloudDetail(count: number): void {
    this.clouds.count = Math.max(0, Math.min(CLOUD_COUNT, count));
  }

  private placeCloud(i: number): void {
    const c = this.cloudData[i];
    const d = this.cloudDummy;
    d.position.set(c.x, c.y, c.z);
    d.rotation.set(0, c.rot, 0);
    d.scale.set(c.s, c.s * c.sy, c.s);
    d.updateMatrix();
    this.clouds.setMatrixAt(i, d.matrix);
  }

  update(dt: number): void {
    for (let i = 0; i < this.clouds.count; i++) {
      const c = this.cloudData[i];
      c.x += dt * c.speed;
      if (c.x > 280) c.x = -280;
      this.placeCloud(i);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  setShadows(enabled: boolean): void {
    this.sun.castShadow = enabled;
  }
}
