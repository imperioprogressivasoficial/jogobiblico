import * as THREE from 'three';

/*
 * Materiais compartilhados (poucos materiais = menos trocas de estado na GPU).
 *
 * Props e personagens usam MeshStandardMaterial (rugosidade alta, cores por
 * vértice) iluminados pelo sol + mapa de ambiente PMREM do céu (scene.environment).
 * Dois toques baratos feitos no shader:
 * - "oclusão de contato": a cor escurece suavemente perto do chão (y do mundo),
 *   o que "assenta" casas, vasos e obstáculos na rua;
 * - luz de contorno (rim) quente nos personagens, como nos filmes de animação,
 *   destacando o herói do cenário.
 */

/** Varying com o y do mundo (funciona com e sem instanciamento). */
const WORLD_Y_VERT = /* glsl */ `
#include <project_vertex>
{
	vec4 drWp = vec4( transformed, 1.0 );
	#ifdef USE_INSTANCING
		drWp = instanceMatrix * drWp;
	#endif
	vDrWorldY = ( modelMatrix * drWp ).y;
}`;

interface ShadeOpts {
  /** 1 = cores originais; menor = menos saturado (tons mais suaves, de desenho impresso). */
  saturation?: number;
  /** Fator de cor no chão (1 = sem oclusão). */
  aoMin: number;
  /** Altura (m) até onde a oclusão de contato atua. */
  aoHeight: number;
  /** Intensidade da luz de contorno (0 = sem). */
  rim: number;
}

/** Uniformes de luz de contorno compartilhados (cor atualizada pela Atmosfera a cada mapa). */
export const RimUniforms = {
  drRimColor: { value: new THREE.Color(1.0, 0.82, 0.6) },
};

function stylize<T extends THREE.MeshStandardMaterial>(mat: T, key: string, o: ShadeOpts): T {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.drRimColor = RimUniforms.drRimColor;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vDrWorldY;')
      .replace('#include <project_vertex>', WORLD_Y_VERT);
    let frag = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vDrWorldY;\nuniform vec3 drRimColor;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
	diffuseColor.rgb *= mix( ${o.aoMin.toFixed(3)}, 1.0, smoothstep( 0.0, ${o.aoHeight.toFixed(3)}, vDrWorldY ) );
	diffuseColor.rgb = mix( vec3( dot( diffuseColor.rgb, vec3( 0.3, 0.59, 0.11 ) ) ), diffuseColor.rgb, ${(o.saturation ?? 1).toFixed(3)} );`,
      );
    if (o.rim > 0) {
      frag = frag.replace(
        '#include <opaque_fragment>',
        `{
		float drFres = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );
		float drUp = saturate( normal.y * 0.5 + 0.6 );
		outgoingLight += drRimColor * diffuseColor.rgb * ( pow( drFres, 3.0 ) * ${o.rim.toFixed(3)} * drUp );
	}
	#include <opaque_fragment>`,
      );
    }
    shader.fragmentShader = frag;
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

/**
 * Ouro: as cores por vértice das moedas são amarelo-alaranjadas (boas para
 * Lambert); como cor especular de metal elas ficam "laranja". Aqui a cor vira um
 * F0 de ouro real (mais claro e amarelo), mantendo o desenho do relevo.
 */
function goldify(mat: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
	// denário de prata: tons do desenho original convertidos em prata clara (levemente azulada)
	// cores do desenho mantidas (prata clara/escura e louro verde), só um leve toque frio
	diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.95, 0.98, 1.05 ), 0.6 );`,
      )
      .replace(
        '#include <opaque_fragment>',
        `{
		// brilho ao girar: a face "acende" quando encara o jogador; bordas douradas claras
		float drNV = saturate( dot( normal, normalize( vViewPosition ) ) );
		float drGlint = pow( drNV, 28.0 );
		float drEdge = pow( 1.0 - drNV, 2.5 );
		outgoingLight += diffuseColor.rgb * ( drGlint * 0.9 ) + vec3( 0.04 ) * drEdge;
	}
	#include <opaque_fragment>`,
      );
  };
  mat.customProgramCacheKey = () => 'dr-gold';
  return mat;
}

const CLOUD_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vColor;
attribute vec3 color;
void main() {
	vec4 wp = vec4( position, 1.0 );
	vec3 n = normal;
	#ifdef USE_INSTANCING
		wp = instanceMatrix * wp;
		n = mat3( instanceMatrix ) * n;
	#endif
	wp = modelMatrix * wp;
	vNormalW = normalize( mat3( modelMatrix ) * n );
	vPosW = wp.xyz;
	vColor = color;
	gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const CLOUD_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 uHorizon;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vColor;
void main() {
	vec3 n = normalize( vNormalW );
	vec3 v = normalize( cameraPosition - vPosW );
	float ndl = dot( n, uSunDir );
	float wrap = clamp( ( ndl + 0.55 ) / 1.55, 0.0, 1.0 );
	float up = clamp( n.y * 0.5 + 0.5, 0.0, 1.0 );
	vec3 col = mix( uShade, uLit, wrap * 0.7 + up * 0.3 ) * vColor;
	// borda prateada (luz atravessando a borda da nuvem)
	float rim = pow( 1.0 - max( dot( n, v ), 0.0 ), 2.0 );
	col += uLit * rim * 0.28;
	// perspectiva aérea: nuvens baixas somem no horizonte
	col = mix( uHorizon, col, 0.35 + 0.65 * smoothstep( 18.0, 70.0, vPosW.y ) );
	gl_FragColor = vec4( col, 1.0 );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`;

export const Materials = {
  prop: stylize(
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.86, metalness: 0 }),
    'dr-prop',
    { aoMin: 0.62, aoHeight: 0.55, rim: 0, saturation: 0.88 },
  ),
  character: stylize(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.64, metalness: 0 }),
    'dr-character',
    { aoMin: 0.82, aoHeight: 0.28, rim: 0.55, saturation: 0.72 },
  ),
  backdrop: new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
  /** Nuvens fofas: iluminação "embrulhada", borda prateada e névoa no horizonte. */
  cloud: new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: new THREE.Vector3(-0.45, 0.55, 0.7).normalize() },
      uLit: { value: new THREE.Color(1.15, 1.1, 1.0) },
      uShade: { value: new THREE.Color(0.55, 0.6, 0.78) },
      uHorizon: { value: new THREE.Color(0.9, 0.8, 0.6) },
    },
    vertexShader: CLOUD_VERT,
    fragmentShader: CLOUD_FRAG,
    fog: false,
  }),
  /** Prata metálica (denário romano): reflete o céu (envMap ligado pela Atmosfera). */
  coin: goldify(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.35,
      roughness: 0.42,
      emissive: new THREE.Color(0x2a3140),
      envMapIntensity: 0.6,
    }),
  ),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }),
  shadowBlob: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  /** Variante lisa (sem flatShading) para peças orgânicas — opcional para outros módulos. */
  propSmooth: stylize(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 }),
    'dr-prop-smooth',
    { aoMin: 0.66, aoHeight: 0.5, rim: 0 },
  ),
  /** Metal/ouro para detalhes com cor por vértice (coroas, adornos). */
  metal: stylize(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.9 }),
    'dr-metal',
    { aoMin: 0.8, aoHeight: 0.3, rim: 0 },
  ),
};
