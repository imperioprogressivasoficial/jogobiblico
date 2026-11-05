import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export type PostQuality = 'alta' | 'media' | 'baixa';

/*
 * Pipeline de cor do jogo
 * -----------------------
 * Todos os materiais usam THREE.CustomToneMapping. A função abaixo substitui a
 * CustomToneMapping vazia do three: AgX com o "look" Punchy (cores de desenho
 * animado, sem estourar o branco) + balanço de branco quente, saturação,
 * contraste suave e sombras levemente frias (split toning).
 *
 * - 'media' e 'baixa': renderização direta; a gradação roda dentro do shader de
 *   cada material (custo praticamente zero) e o antisserrilhado é o MSAA nativo.
 * - 'alta': a cena é renderizada em HDR (meia precisão), recebe bloom e passa
 *   pela MESMA função no passe final (+ vinheta) e depois pelo FXAA.
 *
 * A neblina também foi movida para ANTES do tone mapping (em espaço linear), para
 * que o horizonte do céu, a neblina e o cenário distante tenham exatamente a
 * mesma cor em todas as qualidades.
 */
const TONE_GLSL = /* glsl */ `
// DR_TONEMAP — David Runner
const vec3 DR_LUMA = vec3( 0.2126, 0.7152, 0.0722 );
vec3 drAgXPunchy( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;
	const float AgxMaxEv = 4.026069;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );
	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	// look "Punchy": mais contraste e saturação
	color = pow( max( color, vec3( 0.0 ) ), vec3( DR_AGX_POWER ) );
	float l = dot( color, DR_LUMA );
	color = l + DR_AGX_SAT * ( color - l );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	return clamp( color, 0.0, 1.0 );
}
vec3 CustomToneMapping( vec3 color ) {
	color *= DR_WHITE_BALANCE;
	#if DR_TM_MODE == 1
		// ACES filmic (com a exposição do renderizador)
		color = ACESFilmicToneMapping( color );
	#else
		color = drAgXPunchy( color * toneMappingExposure );
	#endif
	// sombras levemente frias, luzes quentes
	float l = dot( color, DR_LUMA );
	color += DR_SHADOW_TINT * ( 1.0 - smoothstep( 0.0, 0.45, l ) ) * 0.06;
	// saturação final
	l = dot( color, DR_LUMA );
	color = max( vec3( 0.0 ), l + DR_SATURATION * ( color - l ) );
	// contraste suave em espaço perceptual
	vec3 g = sqrt( color );
	g = mix( g, g * g * ( 3.0 - 2.0 * g ), DR_CONTRAST );
	return clamp( g * g, 0.0, 1.0 );
}
`;

/** Parâmetros da gradação de cor (constantes nos shaders). */
export interface GradeParams {
  /** 0 = AgX Punchy, 1 = ACES filmic. */
  mode: 0 | 1;
  agxPower: number;
  agxSat: number;
  whiteBalance: [number, number, number];
  shadowTint: [number, number, number];
  saturation: number;
  contrast: number;
}

export const GRADE: GradeParams = {
  mode: 0,
  agxPower: 1.38,
  agxSat: 1.7,
  whiteBalance: [1.05, 1.0, 0.93],
  shadowTint: [-0.25, 0.05, 0.5],
  saturation: 1.12,
  contrast: 0.22,
};

const f = (n: number) => n.toFixed(4);
const v3 = (a: [number, number, number]) => `vec3( ${f(a[0])}, ${f(a[1])}, ${f(a[2])} )`;
function toneDefines(g: GradeParams): string {
  return `
#define DR_TM_MODE ${g.mode}
#define DR_AGX_POWER ${f(g.agxPower)}
#define DR_AGX_SAT ${f(g.agxSat)}
#define DR_WHITE_BALANCE ${v3(g.whiteBalance)}
#define DR_SHADOW_TINT ${v3(g.shadowTint)}
#define DR_SATURATION ${f(g.saturation)}
#define DR_CONTRAST ${f(g.contrast)}
`;
}

/** Neblina em espaço linear, antes do tone mapping (ver comentário acima). */
const FOG_GLSL = /* glsl */ `
#ifdef USE_FOG
	vec3 drFogColor = fogColor;
	#ifdef TONE_MAPPING
		// na renderização direta o three entrega a cor da neblina já em sRGB
		drFogColor = sRGBTransferEOTF( vec4( fogColor, 1.0 ) ).rgb;
	#endif
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, drFogColor, fogFactor );
#endif
`;

let original: { pars: string; frag: string; fog: string } | null = null;
let ready = false;
/** Verdadeiro quando a curva própria foi instalada (senão o motor usa o AgX padrão). */
export function colorPipelineReady(): boolean {
  return ready;
}
/**
 * Instala a curva de cor e a neblina linear nos shaders do three. Roda ao importar
 * este módulo (antes de qualquer compilação); chamar de novo com outros parâmetros
 * reinstala (os materiais precisam de `needsUpdate` para recompilar).
 */
export function installColorPipeline(params: Partial<GradeParams> = {}): void {
  Object.assign(GRADE, params);
  const chunk = THREE.ShaderChunk as unknown as Record<string, string>;
  if (!original) original = { pars: chunk.tonemapping_pars_fragment, frag: chunk.tonemapping_fragment, fog: chunk.fog_fragment };
  const empty = 'vec3 CustomToneMapping( vec3 color ) { return color; }';
  if (!original.pars.includes(empty)) {
    console.warn('PostFX: trecho de tone mapping do three mudou; usando AgX padrão.');
    return;
  }
  chunk.tonemapping_pars_fragment = original.pars.replace(empty, toneDefines(GRADE) + TONE_GLSL);
  chunk.tonemapping_fragment = FOG_GLSL + original.frag;
  chunk.fog_fragment = '';
  ready = true;
}
installColorPipeline();

// ------------------------------------------------------------------ shaders
const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = vec4( position.xy, 0.0, 1.0 );
}`;

/** Filtro de brilho + redução 4x (média de Karis contra "vaga-lumes"). */
const PREFILTER_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uKnee;
varying vec2 vUv;
vec4 pick( vec2 o ) {
	vec3 c = texture2D( tDiffuse, vUv + o * uTexel ).rgb;
	float br = max( c.r, max( c.g, c.b ) );
	float soft = clamp( br - uThreshold + uKnee, 0.0, 2.0 * uKnee );
	soft = soft * soft / ( 4.0 * uKnee + 1e-4 );
	float w = max( soft, br - uThreshold ) / max( br, 1e-4 );
	float k = 1.0 / ( 1.0 + br ); // peso de Karis
	return vec4( c * w * k, k );
}
void main() {
	vec4 c = pick( vec2( -1.0, -1.0 ) ) + pick( vec2( 1.0, -1.0 ) ) + pick( vec2( -1.0, 1.0 ) ) + pick( vec2( 1.0, 1.0 ) );
	gl_FragColor = vec4( min( c.rgb / c.a, vec3( 8.0 ) ), 1.0 );
}`;

/** Desfoque gaussiano separável de 9 amostras com 5 leituras bilineares. */
const BLUR_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
	vec3 c = texture2D( tDiffuse, vUv ).rgb * 0.2270270270;
	vec2 o1 = uDir * 1.3846153846;
	vec2 o2 = uDir * 3.2307692308;
	c += ( texture2D( tDiffuse, vUv + o1 ).rgb + texture2D( tDiffuse, vUv - o1 ).rgb ) * 0.3162162162;
	c += ( texture2D( tDiffuse, vUv + o2 ).rgb + texture2D( tDiffuse, vUv - o2 ).rgb ) * 0.0702702703;
	gl_FragColor = vec4( c, 1.0 );
}`;

const DOWN_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
	vec3 c = texture2D( tDiffuse, vUv + vec2( -1.0, -1.0 ) * uTexel ).rgb;
	c += texture2D( tDiffuse, vUv + vec2( 1.0, -1.0 ) * uTexel ).rgb;
	c += texture2D( tDiffuse, vUv + vec2( -1.0, 1.0 ) * uTexel ).rgb;
	c += texture2D( tDiffuse, vUv + vec2( 1.0, 1.0 ) * uTexel ).rgb;
	gl_FragColor = vec4( c * 0.25, 1.0 );
}`;

/** Vinheta comum aos dois caminhos (passe final e sobreposição da qualidade média). */
const VIGNETTE_GLSL = /* glsl */ `
uniform vec2 uVignette; // x = força, y = proporção da tela (largura/altura)
float drVignette( vec2 uv ) {
	vec2 p = uv - 0.5;
	p.x *= mix( 1.0, uVignette.y, 0.5 );
	float r = length( p ) * 1.45;
	return 1.0 - uVignette.x * smoothstep( 0.42, 1.08, r );
}`;

const FINAL_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tBloom0;
uniform sampler2D tBloom1;
uniform float uBloom;
varying vec2 vUv;
#include <tonemapping_pars_fragment>
${VIGNETTE_GLSL}
vec3 drSRGB( vec3 c ) {
	return mix( c * 12.92, 1.055 * pow( c, vec3( 0.41666 ) ) - 0.055, step( vec3( 0.0031308 ), c ) );
}
void main() {
	vec3 c = texture2D( tDiffuse, vUv ).rgb;
	#ifdef DR_BLOOM
		c += ( texture2D( tBloom0, vUv ).rgb * 0.55 + texture2D( tBloom1, vUv ).rgb * 0.9 ) * uBloom;
	#endif
	c = CustomToneMapping( c ) * drVignette( vUv );
	gl_FragColor = vec4( drSRGB( c ), 1.0 );
}`;

const VIGNETTE_FRAG = /* glsl */ `
varying vec2 vUv;
${VIGNETTE_GLSL}
void main() {
	gl_FragColor = vec4( vec3( drVignette( vUv ) ), 1.0 );
}`;

function fsMaterial(frag: string, uniforms: Record<string, THREE.IUniform>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: FS_VERT,
    fragmentShader: frag,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

/**
 * Bloom leve feito para celular: brilho filtrado a 1/4 da resolução, desfocado
 * em dois níveis (1/4 e 1/8). São 6 desenhos de tela cheia em texturas pequenas;
 * a composição acontece no passe final (sem passe extra).
 */
class SoftBloomPass extends Pass {
  readonly levels: THREE.WebGLRenderTarget[][];
  private quad = new FullScreenQuad();
  private prefilter = fsMaterial(PREFILTER_FRAG, {
    tDiffuse: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uThreshold: { value: 1.0 },
    uKnee: { value: 0.35 },
  });
  private blur = fsMaterial(BLUR_FRAG, { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } });
  private down = fsMaterial(DOWN_FRAG, { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() } });
  private sizes = [new THREE.Vector2(1, 1), new THREE.Vector2(1, 1)];
  /** Abertura do desfoque em cada nível (texels). */
  spread = [1.25, 1.8];

  constructor() {
    super();
    this.needsSwap = false;
    const mk = () =>
      new THREE.WebGLRenderTarget(1, 1, {
        type: THREE.HalfFloatType,
        depthBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });
    this.levels = [
      [mk(), mk()],
      [mk(), mk()],
    ];
  }

  set threshold(v: number) {
    this.prefilter.uniforms.uThreshold.value = v;
  }

  setSize(width: number, height: number): void {
    for (let i = 0; i < 2; i++) {
      const div = i === 0 ? 4 : 8;
      const w = Math.max(1, Math.round(width / div));
      const h = Math.max(1, Math.round(height / div));
      this.sizes[i].set(w, h);
      for (const rt of this.levels[i]) rt.setSize(w, h);
    }
    this.prefilter.uniforms.uTexel.value.set(1 / width, 1 / height);
  }

  private draw(renderer: THREE.WebGLRenderer, mat: THREE.ShaderMaterial, src: THREE.Texture, dst: THREE.WebGLRenderTarget): void {
    mat.uniforms.tDiffuse.value = src;
    this.quad.material = mat;
    renderer.setRenderTarget(dst);
    this.quad.render(renderer);
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    const [a0, b0] = this.levels[0];
    const [a1, b1] = this.levels[1];
    const dir = this.blur.uniforms.uDir.value as THREE.Vector2;
    this.draw(renderer, this.prefilter, readBuffer.texture, a0);
    dir.set(this.spread[0] / this.sizes[0].x, 0);
    this.draw(renderer, this.blur, a0.texture, b0);
    dir.set(0, this.spread[0] / this.sizes[0].y);
    this.draw(renderer, this.blur, b0.texture, a0);
    this.down.uniforms.uTexel.value.set(1 / this.sizes[0].x, 1 / this.sizes[0].y);
    this.draw(renderer, this.down, a0.texture, a1);
    dir.set(this.spread[1] / this.sizes[1].x, 0);
    this.draw(renderer, this.blur, a1.texture, b1);
    dir.set(0, this.spread[1] / this.sizes[1].y);
    this.draw(renderer, this.blur, b1.texture, a1);
  }

  dispose(): void {
    for (const lv of this.levels) for (const rt of lv) rt.dispose();
    this.prefilter.dispose();
    this.blur.dispose();
    this.down.dispose();
    this.quad.dispose();
  }
}

/**
 * Pós-processamento por qualidade:
 * - alta: EffectComposer (cena HDR → bloom leve → gradação + vinheta → FXAA);
 * - media: renderização direta (MSAA nativo) + vinheta multiplicativa barata;
 * - baixa: renderização direta, sem passes extras.
 * A gradação de cor está na curva de tone mapping e vale para as três.
 */
export class PostFX {
  /** Força do bloom (só 'alta'). */
  bloomStrength = 0.7;
  /** Limiar de brilho linear do bloom: só sol, moedas e brilhos passam. */
  bloomThreshold = 1.2;
  /** Força da vinheta (0 = sem vinheta). */
  vignette = 0.36;

  private quality: PostQuality = 'alta';
  private gradeVersion = 0;
  private composer: EffectComposer | null = null;
  private bloom: SoftBloomPass | null = null;
  private finalPass: ShaderPass | null = null;
  private fxaa: FXAAPass | null = null;
  private readonly floatOk: boolean;
  private width = 1;
  private height = 1;
  private vigScene = new THREE.Scene();
  private vigCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private vigMat: THREE.ShaderMaterial;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
  ) {
    const ext = renderer.extensions;
    this.floatOk = ext.has('EXT_color_buffer_half_float') || ext.has('EXT_color_buffer_float');
    this.vigMat = fsMaterial(VIGNETTE_FRAG, { uVignette: { value: new THREE.Vector2(this.vignette, 1) } });
    this.vigMat.blending = THREE.CustomBlending;
    this.vigMat.blendEquation = THREE.AddEquation;
    this.vigMat.blendSrc = THREE.DstColorFactor;
    this.vigMat.blendDst = THREE.ZeroFactor;
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    const vig = new THREE.Mesh(tri, this.vigMat);
    vig.frustumCulled = false;
    this.vigScene.add(vig);
  }

  /** Ajuste fino da gradação em tempo real (ferramenta de desenvolvimento). */
  regrade(params: Partial<GradeParams>): void {
    installColorPipeline(params);
    // o cache de programas do three usa o código antes dos #include: um define novo força recompilar
    const v = String(++this.gradeVersion);
    const bump = (m: THREE.Material) => {
      m.defines = { ...(m.defines ?? {}), DR_GRADE_V: v };
      m.needsUpdate = true;
    };
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach(bump);
      else if (m) bump(m);
    });
    if (this.finalPass) bump(this.finalPass.material);
  }

  /** Indica se o caminho completo (HDR + bloom) está ativo. */
  get usingComposer(): boolean {
    return this.composer !== null;
  }

  setQuality(q: PostQuality): void {
    this.quality = q;
    if (q === 'alta' && this.floatOk) this.ensureComposer();
    else this.disposeComposer();
    this.setSize(this.width, this.height);
  }

  setSize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    const aspect = w / Math.max(1, h);
    (this.vigMat.uniforms.uVignette.value as THREE.Vector2).set(this.vignette, aspect);
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
      (this.finalPass!.uniforms.uVignette.value as THREE.Vector2).set(this.vignette, aspect);
    }
  }

  render(dt: number): void {
    if (this.composer) {
      const u = this.finalPass!.uniforms;
      u.toneMappingExposure.value = this.renderer.toneMappingExposure;
      u.uBloom.value = this.bloomStrength;
      this.bloom!.threshold = this.bloomThreshold;
      this.composer.render(dt);
      return;
    }
    this.renderer.render(this.scene, this.camera);
    if (this.quality === 'media' && this.vignette > 0) {
      const auto = this.renderer.autoClear;
      this.renderer.autoClear = false;
      this.renderer.render(this.vigScene, this.vigCam);
      this.renderer.autoClear = auto;
    }
  }

  private ensureComposer(): void {
    if (this.composer) return;
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true });
    rt.texture.name = 'DavidRunner.cena';
    const composer = new EffectComposer(this.renderer, rt);
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new SoftBloomPass();
    composer.addPass(this.bloom);
    this.finalPass = new ShaderPass({
      name: 'DavidRunnerFinal',
      uniforms: {
        tDiffuse: { value: null },
        tBloom0: { value: null },
        tBloom1: { value: null },
        uBloom: { value: this.bloomStrength },
        uVignette: { value: new THREE.Vector2(this.vignette, 1) },
        toneMappingExposure: { value: 1 },
      },
      defines: { DR_BLOOM: '' },
      vertexShader: FS_VERT,
      fragmentShader: FINAL_FRAG,
    });
    this.finalPass.material.toneMapped = false;
    // ShaderPass clona os uniformes: as texturas do bloom são ligadas depois.
    this.finalPass.uniforms.tBloom0.value = this.bloom.levels[0][0].texture;
    this.finalPass.uniforms.tBloom1.value = this.bloom.levels[1][0].texture;
    composer.addPass(this.finalPass);
    this.fxaa = new FXAAPass();
    composer.addPass(this.fxaa);
    this.composer = composer;
  }

  private disposeComposer(): void {
    if (!this.composer) return;
    this.bloom?.dispose();
    this.finalPass?.dispose();
    this.fxaa?.dispose();
    this.composer.dispose();
    this.composer = null;
    this.bloom = null;
    this.finalPass = null;
    this.fxaa = null;
  }

  dispose(): void {
    this.disposeComposer();
    this.vigMat.dispose();
    for (const c of this.vigScene.children) (c as THREE.Mesh).geometry.dispose();
  }
}
