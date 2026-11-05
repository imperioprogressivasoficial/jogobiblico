import * as THREE from 'three';
import type { MapTheme } from '../data/maps';
import { Materials } from './models/materials';
import { BACKDROP_FACTORIES, cloudGeometry } from './models/scenery';
import { Rng } from './rng';

/**
 * Atmosfera: céu, sol, luzes, neblina, nuvens e horizonte distante.
 * (O chão e as construções ficam no EnvironmentManager.)
 */
export class Atmosphere {
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  private sky: THREE.Mesh;
  private backdrop: THREE.Mesh | null = null;
  private clouds: THREE.Mesh[] = [];
  private cloudGeo = cloudGeometry();
  private rng = new Rng(77);

  constructor(private scene: THREE.Scene) {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.6);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.4);
    this.sun.position.set(-7, 16, 9);
    this.sun.target.position.set(0, 0, -10);
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -11;
    sc.right = 11;
    sc.top = 26;
    sc.bottom = -12;
    sc.near = 1;
    sc.far = 60;
    this.sun.shadow.bias = -0.0015;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun, this.sun.target);

    const skyGeo = new THREE.SphereGeometry(420, 24, 12);
    skyGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(skyGeo.getAttribute('position').count * 3), 3));
    this.sky = new THREE.Mesh(
      skyGeo,
      new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }),
    );
    this.sky.renderOrder = -10;
    scene.add(this.sky);

    for (let i = 0; i < 7; i++) {
      const c = new THREE.Mesh(this.cloudGeo, Materials.cloud);
      c.position.set(this.rng.range(-220, 220), this.rng.range(38, 70), this.rng.range(-150, -300));
      c.scale.setScalar(this.rng.range(1.2, 2.4));
      this.clouds.push(c);
      scene.add(c);
    }
  }

  setTheme(theme: MapTheme): void {
    const scene = this.scene;
    scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
    scene.background = new THREE.Color(theme.skyBottom);
    this.hemi.color.set(theme.hemiSky);
    this.hemi.groundColor.set(theme.hemiGround);
    this.sun.color.set(theme.sun);
    this.sun.intensity = theme.sunIntensity;

    // céu em degradê
    const pos = this.sky.geometry.getAttribute('position');
    const col = this.sky.geometry.getAttribute('color') as THREE.BufferAttribute;
    const top = new THREE.Color(theme.skyTop);
    const bottom = new THREE.Color(theme.skyBottom);
    const fog = new THREE.Color(theme.fog);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 420;
      if (y < 0.02) tmp.copy(fog);
      else tmp.copy(bottom).lerp(top, Math.min(1, Math.pow(y, 0.6) * 1.1));
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    col.needsUpdate = true;

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
  }

  update(dt: number): void {
    for (const c of this.clouds) {
      c.position.x += dt * 1.5;
      if (c.position.x > 260) c.position.x = -260;
    }
  }

  setShadows(enabled: boolean): void {
    this.sun.castShadow = enabled;
  }
}
