import * as THREE from 'three';

/** Materiais compartilhados (poucos materiais = menos trocas de estado na GPU). */
export const Materials = {
  prop: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  character: new THREE.MeshLambertMaterial({ vertexColors: true }),
  backdrop: new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
  cloud: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: false }),
  coin: new THREE.MeshPhongMaterial({
    vertexColors: true,
    emissive: 0x5a3200,
    specular: 0xfff2b0,
    shininess: 80,
    flatShading: true,
  }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }),
  shadowBlob: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
};
