import { Spring } from './characterExtras';
import type { CharacterRig } from './characterModel';

export type AnimState = 'run' | 'jump' | 'slide' | 'crash' | 'idle' | 'celebrate' | 'stumble' | 'laneLeft' | 'laneRight';

interface Pose {
  pivotY: number;
  pivotRotX: number;
  pivotRotY: number;
  pivotRotZ: number;
  /** Estica (>1) / achata (<1) o corpo todo. */
  squash: number;
  torsoX: number;
  torsoY: number;
  torsoZ: number;
  headX: number;
  headY: number;
  headZ: number;
  armLX: number;
  armLZ: number;
  armRX: number;
  armRZ: number;
  foreLX: number;
  foreRX: number;
  legLX: number;
  legLZ: number;
  legRX: number;
  legRZ: number;
  shinLX: number;
  shinRX: number;
  /** Abertura dos olhos (0 fechado .. 1 aberto). */
  lid: number;
  /** Sobrancelhas (-1 franzidas .. 1 levantadas). */
  brow: number;
  /** Boca (0 fechada .. 1,3 gargalhada). */
  mouth: number;
  mouthW: number;
}

/** [multiplicador da rigidez, amortecimento] das partes com inércia; o resto segue direto. */
const SPRING: Partial<Record<keyof Pose, [number, number]>> = {
  pivotRotX: [1, 0.85],
  pivotRotY: [1, 0.8],
  pivotRotZ: [0.9, 0.7],
  torsoX: [0.95, 0.75],
  torsoY: [0.95, 0.72],
  torsoZ: [0.9, 0.7],
  headX: [0.8, 0.55],
  headY: [0.8, 0.55],
  headZ: [0.8, 0.55],
  armLX: [1, 0.6],
  armRX: [1, 0.6],
  armLZ: [0.9, 0.6],
  armRZ: [0.9, 0.6],
  foreLX: [0.85, 0.5],
  foreRX: [0.85, 0.5],
};

const KEYS: (keyof Pose)[] = [
  'pivotY', 'pivotRotX', 'pivotRotY', 'pivotRotZ', 'squash', 'torsoX', 'torsoY', 'torsoZ', 'headX', 'headY', 'headZ',
  'armLX', 'armLZ', 'armRX', 'armRZ', 'foreLX', 'foreRX', 'legLX', 'legLZ', 'legRX', 'legRZ', 'shinLX', 'shinRX',
  'lid', 'brow', 'mouth', 'mouthW',
];

function blankPose(): Pose {
  const p = {} as Pose;
  for (const k of KEYS) p[k] = 0;
  p.squash = 1;
  p.lid = 1;
  p.mouthW = 1;
  return p;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Animação procedural por poses: cada estado calcula uma pose-alvo e as
 * articulações interpolam suavemente até ela (transições sem "estalos").
 * Por cima disso: movimento secundário com molas (cabelo, tranças, bolsa,
 * saia, manto, pomba), piscar de olhos, expressões, esticar/achatar no pulo.
 * Nada é alocado por quadro.
 */
export class CharacterAnimator {
  private cur: Pose = blankPose();
  private tgt: Pose = blankPose();
  /** Velocidades das molas (braços, cabeça e tronco têm inércia e "sobra" de movimento). */
  private vel: Pose = blankPose();
  private tmp: Pose = blankPose();
  private time = 0;
  private runPhase = 0;
  private runAmt = 0;
  private landT = 9;
  private takeoffT = 9;
  private blinkT = 0;
  private nextBlink = 2.2;
  private blinkSeed = 7;
  private prevBodyY = 0;
  private bodyVy = 0;
  private hairSpring = new Spring(260, 9);
  private swingSpring = new Spring(70, 6.5);
  private bagX = new Spring(110, 5);
  private bagZ = new Spring(110, 5);
  private capeSpring = new Spring(50, 6);
  private petSpring = new Spring(240, 10);
  state: AnimState = 'idle';
  stateTime = 0;
  /** Inclinação lateral ao trocar de pista (-1..1). */
  lean = 0;
  /** Velocidade vertical (para a pose de pulo). */
  vy = 0;

  constructor(private rig: CharacterRig) {
    this.idlePose(this.cur, 0);
    this.apply(this.cur, 0);
  }

  setRig(rig: CharacterRig): void {
    this.rig = rig;
    this.vel = blankPose();
    this.hairSpring.reset();
    this.swingSpring.reset();
    this.bagX.reset();
    this.bagZ.reset();
    this.capeSpring.reset();
    this.petSpring.reset();
    this.apply(this.cur, 0);
  }

  setState(s: AnimState): void {
    if (s !== this.state) {
      if (this.state === 'jump' && (s === 'run' || s === 'slide')) this.landT = 0;
      if (s === 'jump') this.takeoffT = 0;
      this.state = s;
      this.stateTime = 0;
    }
  }

  update(dt: number, runSpeed: number): void {
    if (dt <= 0) return;
    this.time += dt;
    this.stateTime += dt;
    this.landT += dt;
    this.takeoffT += dt;
    this.runPhase += dt * (5.5 + runSpeed * 0.32);
    const running = this.state === 'run' || this.state === 'laneLeft' || this.state === 'laneRight' || this.state === 'stumble';
    this.runAmt += ((running ? 1 : 0) - this.runAmt) * (1 - Math.exp(-dt * 6));

    const target = this.targetPose();
    const sharp = this.state === 'crash' ? 12 : this.state === 'slide' || this.state === 'jump' ? 18 : this.state === 'idle' ? 8 : 15;
    const k = 1 - Math.exp(-dt * sharp);
    const c = this.cur;
    const v = this.vel;
    const h = Math.min(dt, 1 / 30);
    for (const key of KEYS) {
      const sp = SPRING[key];
      if (!sp) {
        // pernas, quadril e rosto seguem a pose de perto (sem pé "deslizando")
        c[key] += (target[key] - c[key]) * k;
        continue;
      }
      // mola subamortecida: o membro chega um pouco atrasado e passa do ponto antes de assentar
      const w = sharp * sp[0];
      v[key] += (w * w * (target[key] - c[key]) - 2 * sp[1] * w * v[key]) * h;
      c[key] += v[key] * h;
    }

    // piscar (independente da pose)
    this.blinkT += dt;
    if (this.blinkT > this.nextBlink) {
      this.blinkT = 0;
      this.blinkSeed = (this.blinkSeed * 9301 + 49297) % 233280;
      const r = this.blinkSeed / 233280;
      this.nextBlink = r < 0.18 ? 0.28 : 1.8 + r * 3.2; // às vezes pisca duas vezes
    }
    this.apply(c, dt);
  }

  private targetPose(): Pose {
    const t = this.tgt;
    switch (this.state) {
      case 'run':
      case 'laneLeft':
      case 'laneRight':
      case 'stumble':
        this.runPose(t);
        break;
      case 'jump':
        this.jumpPose(t);
        break;
      case 'slide':
        this.slidePose(t);
        break;
      case 'crash':
        this.crashPose(t);
        break;
      case 'celebrate':
        this.celebratePose(t);
        break;
      case 'idle':
      default:
        this.idlePose(t, this.time);
    }
    // aterrissagem: agacha rápido e volta
    if (this.landT < 0.3) {
      const e = Math.sin((this.landT / 0.3) * Math.PI) * (1 - this.landT / 0.3 * 0.4);
      t.squash -= 0.13 * e;
      t.pivotY -= 0.09 * e;
      t.shinLX -= 0.5 * e;
      t.shinRX -= 0.5 * e;
      t.legLX += 0.25 * e;
      t.legRX += 0.25 * e;
      t.torsoX -= 0.15 * e;
    }
    return t;
  }

  private runPose(p: Pose): void {
    const ph = this.runPhase;
    const s = Math.sin(ph);
    const c = Math.cos(ph);
    const as = Math.abs(s);
    const ex = this.rig.extras;
    // passada varia um pouquinho (ninguém corre igual a cada passo)
    const vary = 1 + 0.05 * Math.sin(this.time * 0.9) * Math.sin(this.time * 0.37 + 2);
    const stride = (ex?.longRobe ? 0.78 : 0.95) * vary;
    const sT = Math.sin(ph - 0.35); // tronco gira um pouco depois do quadril
    const sH = Math.sin(ph - 0.7); // cabeça compensa por último
    const sA = Math.sin(ph - 0.2); // braços acompanham com leve atraso
    const staff = ex?.holdsStaff ?? false;
    const lean = this.lean;
    // sobe logo depois do impulso e desce rápido no contato (curva assimétrica, não senoide pura)
    const up = Math.pow(Math.abs(Math.sin(ph + 0.35)), 0.6);
    p.pivotY = this.rig.hipHeight - 0.05 + 0.1 * up;
    p.pivotRotX = -0.07;
    p.pivotRotY = -0.11 * s;
    p.pivotRotZ = -lean * 0.26 + 0.035 * s;
    p.squash = 1 + 0.045 * (as - 0.5);
    p.torsoX = -0.2 - 0.04 * as;
    p.torsoY = 0.24 * sT;
    p.torsoZ = lean * 0.08;
    p.headX = 0.17 + 0.04 * as;
    p.headY = -0.13 * sH - lean * 0.28;
    p.headZ = lean * 0.12;
    p.legLX = stride * s + 0.06;
    p.legRX = -stride * s + 0.06;
    p.legLZ = -0.03;
    p.legRZ = 0.03;
    p.shinLX = -(0.28 + 1.45 * Math.pow(Math.max(0, c), 1.4));
    p.shinRX = -(0.28 + 1.45 * Math.pow(Math.max(0, -c), 1.4));
    // braços bombeando, cotovelos dobrados, punhos sobem na frente
    p.armLX = -0.95 * sA;
    p.armRX = (staff ? 0.55 : 0.95) * sA;
    p.armLZ = -0.14 - 0.06 * Math.max(0, -sA);
    p.armRZ = 0.14 + 0.06 * Math.max(0, sA);
    p.foreLX = 1.25 + 0.5 * Math.max(0, -sA);
    p.foreRX = staff ? 1.15 + 0.2 * Math.max(0, sA) : 1.25 + 0.5 * Math.max(0, sA);
    p.lid = 0.9;
    p.brow = -0.3;
    p.mouth = 0.65 + 0.1 * as;
    p.mouthW = 1;
    if (this.state === 'stumble' && this.stateTime < 0.45) {
      const w = 1 - this.stateTime / 0.45;
      p.pivotRotZ += Math.sin(this.stateTime * 24) * 0.28 * w;
      p.armLZ -= 1.1 * w;
      p.armRZ += 1.1 * w;
      p.headX -= 0.25 * w;
      p.lid = 1;
      p.brow = 1;
      p.mouth = 0.75;
      p.mouthW = 0.7;
    }
  }

  private jumpPose(p: Pose): void {
    // f = 1 subindo (encolhe as pernas), 0 caindo (prepara a aterrissagem)
    const f = clamp((this.vy + 3) / 12, 0, 1);
    const a = this.tmp;
    a.pivotY = this.rig.hipHeight;
    a.pivotRotX = lerp(0.06, -0.2, f);
    a.pivotRotY = 0;
    a.pivotRotZ = this.lean * -0.22;
    a.squash = 1;
    a.torsoX = lerp(-0.08, -0.28, f);
    a.torsoY = lerp(0.05, -0.1, f);
    a.torsoZ = this.lean * 0.06;
    a.headX = lerp(0.22, 0.12, f);
    a.headY = -this.lean * 0.2;
    a.headZ = 0;
    a.legLX = lerp(0.5, 1.4, f);
    a.shinLX = lerp(-0.6, -2.05, f);
    a.legRX = lerp(-0.12, 0.85, f);
    a.shinRX = lerp(-0.4, -1.75, f);
    a.legLZ = -0.05;
    a.legRZ = 0.05;
    a.armLX = lerp(-0.25, 0.5, f);
    a.armLZ = lerp(-1.05, -1.25, f);
    a.armRX = lerp(0.45, 2.3, f);
    a.armRZ = lerp(0.95, 0.35, f);
    a.foreLX = lerp(0.45, 0.7, f);
    a.foreRX = lerp(0.6, 0.55, f);
    a.lid = 1;
    a.brow = lerp(0.45, 0.75, f);
    a.mouth = lerp(0.65, 0.95, f);
    a.mouthW = lerp(0.95, 1.05, f);
    for (const k of KEYS) p[k] = a[k];
    // estica na decolagem
    if (this.takeoffT < 0.22) p.squash = 1 + 0.12 * Math.sin((this.takeoffT / 0.22) * Math.PI);
  }

  private slidePose(p: Pose): void {
    const t = this.stateTime;
    const shake = Math.sin(t * 40) * 0.015;
    p.pivotY = 0.36;
    p.pivotRotX = 1.08; // inclina para trás
    p.pivotRotY = 0.1;
    p.pivotRotZ = 0.06 + shake;
    p.squash = 1;
    p.torsoX = -0.42;
    p.torsoY = 0.12;
    p.torsoZ = 0;
    p.headX = -0.62;
    p.headY = -0.1;
    p.headZ = 0;
    p.armLX = -0.85;
    p.armLZ = -0.75;
    p.armRX = 1.0;
    p.armRZ = 0.55;
    p.foreLX = 0.35;
    p.foreRX = 1.1;
    p.legRX = 0.5;
    p.shinRX = -0.06;
    p.legLX = -0.15;
    p.shinLX = -1.55;
    p.legLZ = -0.08;
    p.legRZ = 0.04;
    p.lid = 0.9;
    p.brow = 0.55;
    p.mouth = 0.85;
    p.mouthW = 1.05;
  }

  private crashPose(p: Pose): void {
    const t = this.stateTime;
    const hip = this.rig.hipHeight;
    const fall = clamp((t - 0.12) / 0.4, 0, 1);
    const ease = fall * fall * (3 - 2 * fall);
    const bounce = t > 0.52 ? Math.abs(Math.sin((t - 0.52) * 11)) * Math.exp(-(t - 0.52) * 7) * 0.07 : 0;
    const recoil = clamp(1 - t / 0.25, 0, 1);
    p.pivotY = lerp(hip, 0.25, ease) + bounce;
    p.pivotRotX = lerp(0.35, 1.5, ease) + recoil * 0.1;
    p.pivotRotY = 0.15 * ease;
    p.pivotRotZ = 0.14;
    p.squash = 1 - recoil * 0.08 + bounce * 0.6;
    p.torsoX = -0.15 + 0.1 * recoil;
    p.torsoY = 0.2;
    p.torsoZ = 0;
    p.headX = 0.45 * recoil - 0.35 * ease;
    p.headY = 0.25 * ease;
    p.headZ = 0.15 * ease;
    p.armLX = lerp(0.9, -0.5, ease);
    p.armLZ = lerp(-2.1, -1.4, ease) + Math.sin(t * 30) * 0.2 * recoil;
    p.armRX = lerp(0.9, -0.4, ease);
    p.armRZ = lerp(2.1, 1.35, ease) - Math.sin(t * 30) * 0.2 * recoil;
    p.foreLX = 0.5;
    p.foreRX = 0.4;
    p.legLX = lerp(0.6, 0.65, ease);
    p.legRX = lerp(0.1, 0.25, ease);
    p.legLZ = -0.12;
    p.legRZ = 0.1;
    p.shinLX = lerp(-0.9, -0.55, ease);
    p.shinRX = lerp(-0.3, -0.2, ease);
    p.lid = 0;
    p.brow = 1;
    p.mouth = 1.0;
    p.mouthW = 0.62;
  }

  private celebratePose(p: Pose): void {
    const t = this.stateTime;
    const hop = Math.abs(Math.sin(t * 6));
    const hip = this.rig.hipHeight;
    p.pivotY = hip + hop * 0.2;
    p.pivotRotX = 0;
    p.pivotRotY = Math.sin(t * 3) * 0.12;
    p.pivotRotZ = Math.sin(t * 3) * 0.06;
    p.squash = 1 + 0.07 * (hop - 0.4);
    p.torsoX = 0.06;
    p.torsoY = Math.sin(t * 3) * 0.15;
    p.torsoZ = 0;
    p.headX = -0.22;
    p.headY = 0;
    p.headZ = Math.sin(t * 3) * 0.12;
    p.armLX = 0.15;
    p.armLZ = -2.65 - Math.sin(t * 12) * 0.22;
    p.armRX = 0.15;
    p.armRZ = 2.65 + Math.sin(t * 12 + 1) * 0.22;
    p.foreLX = 0.55 + Math.sin(t * 12) * 0.35;
    p.foreRX = 0.55 + Math.sin(t * 12 + 1) * 0.35;
    p.legLX = hop * 0.35;
    p.legRX = -hop * 0.1;
    p.legLZ = -0.06;
    p.legRZ = 0.06;
    p.shinLX = -hop * 0.75;
    p.shinRX = -hop * 0.35;
    p.lid = 0.55;
    p.brow = 0.85;
    p.mouth = 1.3;
    p.mouthW = 1.12;
  }

  private idlePose(p: Pose, t: number): void {
    const br = Math.sin(t * 2.1);
    const sway = Math.sin(t * 0.7);
    const look = Math.sin(t * 0.37) * Math.sin(t * 0.23 + 1);
    const staff = this.rig?.extras?.holdsStaff ?? false;
    p.pivotY = (this.rig ? this.rig.hipHeight : 0.8) - 0.012 + br * 0.007;
    p.pivotRotX = 0;
    p.pivotRotY = sway * 0.05;
    p.pivotRotZ = sway * 0.03;
    p.squash = 1 + br * 0.006;
    p.torsoX = 0.02 + br * 0.02;
    p.torsoY = Math.sin(t * 0.5) * 0.06;
    p.torsoZ = -sway * 0.025;
    p.headX = -0.04 + Math.sin(t * 0.9) * 0.03;
    p.headY = look * 0.35;
    p.headZ = sway * 0.05;
    p.armLX = 0.08;
    p.armLZ = -0.13 - br * 0.03;
    p.armRX = staff ? 0.22 : 0.05;
    p.armRZ = (staff ? 0.22 : 0.11) + br * 0.03;
    p.foreLX = 0.3;
    p.foreRX = staff ? 0.95 - 0.22 : 0.32;
    p.legLX = 0.02;
    p.legRX = -0.05;
    p.legLZ = -0.03 + sway * 0.015;
    p.legRZ = 0.07 + sway * 0.015;
    p.shinLX = -0.03;
    p.shinRX = -0.14;
    p.lid = 0.96;
    p.brow = 0.1 + Math.max(0, look) * 0.2;
    p.mouth = 0.6;
    p.mouthW = 1;
  }

  private apply(p: Pose, dt: number): void {
    const r = this.rig;
    r.pivot.position.y = p.pivotY;
    r.pivot.rotation.set(p.pivotRotX, p.pivotRotY, p.pivotRotZ);
    const sq = p.squash;
    const inv = 1 / Math.sqrt(sq);
    r.pivot.scale.set(inv, sq, inv);
    r.torso.rotation.set(p.torsoX, p.torsoY, p.torsoZ);
    r.head.rotation.set(p.headX, p.headY, p.headZ);
    r.armL.rotation.x = p.armLX;
    r.armL.rotation.z = p.armLZ;
    r.armR.rotation.x = p.armRX;
    r.armR.rotation.z = p.armRZ;
    r.foreL.rotation.x = p.foreLX;
    r.foreR.rotation.x = p.foreRX;
    r.legL.rotation.x = p.legLX;
    r.legL.rotation.z = p.legLZ;
    r.legR.rotation.x = p.legRX;
    r.legR.rotation.z = p.legRZ;
    r.shinL.rotation.x = p.shinLX;
    r.shinR.rotation.x = p.shinRX;

    const ex = r.extras;
    if (!ex) return;
    // ----- rosto
    if (ex.lids) {
      let blink = 0;
      if (this.blinkT < 0.16) blink = Math.sin((this.blinkT / 0.16) * Math.PI);
      const open = clamp(p.lid * (1 - blink), 0, 1);
      ex.lids.rotation.x = lerp(ex.lidClosed, ex.lidOpen, open);
    }
    if (ex.brows) ex.brows.rotation.x = 0.075 * p.brow;
    if (ex.mouth) ex.mouth.scale.set(p.mouthW, clamp(0.16 + p.mouth * 0.84, 0.12, 1.5), 1);

    // ----- movimento secundário
    const ph = this.runPhase;
    const run = this.runAmt;
    // velocidade vertical do corpo (pulo + quique da corrida)
    const bodyY = p.pivotY;
    if (dt > 0) {
      const v = (bodyY - this.prevBodyY) / dt + (this.state === 'jump' ? this.vy : 0);
      this.bodyVy += (v - this.bodyVy) * Math.min(1, dt * 30);
    }
    this.prevBodyY = bodyY;
    const vy = clamp(this.bodyVy, -18, 18);
    const step = dt > 0 ? Math.min(dt, 1 / 30) : 0;
    if (ex.hair) {
      const h = step ? this.hairSpring.step(-vy * 0.006, step) : this.hairSpring.x;
      const hv = clamp(h, -0.08, 0.08);
      ex.hair.scale.set(1 - hv * 0.4, 1 + hv * 1.1, 1 - hv * 0.3);
      ex.hair.rotation.x = -hv * 1.2 + run * 0.04;
    }
    let swingTarget = run * (0.32 + 0.12 * Math.sin(ph * 2 - 0.6)) - vy * 0.035;
    if (this.state === 'slide') swingTarget = 0.9;
    else if (this.state === 'crash') swingTarget = -0.3;
    else if (this.state === 'idle') swingTarget = Math.sin(this.time * 1.3) * 0.03;
    if (ex.hairBack) {
      const sw = step ? this.swingSpring.step(swingTarget, step) : this.swingSpring.x;
      ex.hairBack.rotation.x = clamp(sw, -0.6, 1.1);
      ex.hairBack.rotation.z = -this.lean * 0.25;
    }
    if (ex.cape) {
      const tgt = this.state === 'slide' ? 0.8 : run * (0.28 + 0.06 * Math.sin(ph * 2)) - vy * 0.02;
      const cs = step ? this.capeSpring.step(tgt, step) : this.capeSpring.x;
      ex.cape.rotation.x = clamp(cs, -0.4, 1.0);
      ex.cape.rotation.z = -this.lean * 0.15;
    }
    if (ex.bag) {
      const tx = run * (0.2 + 0.3 * Math.sin(ph * 2 - 0.9)) - vy * 0.02 + (this.state === 'slide' ? 0.7 : 0);
      const tz = -this.lean * 0.5 - run * 0.12 * Math.sin(ph) - (this.state === 'jump' ? 0.25 : 0);
      ex.bag.rotation.x = step ? this.bagX.step(tx, step) : this.bagX.x;
      ex.bag.rotation.z = step ? this.bagZ.step(tz, step) : this.bagZ.x;
    }
    if (ex.skirt) {
      // abre na frente/atrás conforme as pernas se afastam
      const spread = Math.abs(Math.sin(p.legLX - p.legRX));
      const flap = this.state === 'slide' ? 0.35 : this.state === 'jump' ? -0.12 * clamp(this.vy / 10, -1, 1) : 0;
      ex.skirt.scale.set(1, 1 - spread * 0.06, 1 + spread * (ex.longRobe ? 0.32 : 0.22));
      ex.skirt.rotation.x = (p.legLX + p.legRX) * 0.25 + run * 0.05 * Math.sin(ph * 2) + flap;
      ex.skirt.rotation.z = 0;
    }
    if (ex.pet) {
      const by = step ? this.petSpring.step(-vy * 0.004, step) : this.petSpring.x;
      ex.pet.position.y = (ex.pet.userData.baseY as number) + clamp(by, -0.05, 0.05);
      ex.pet.rotation.x = clamp(-by * 6, -0.5, 0.5) + (this.state === 'idle' ? Math.sin(this.time * 3.1) * 0.08 : 0);
      ex.pet.rotation.y = this.state === 'idle' ? Math.sin(this.time * 0.8) * 0.4 : 0;
    }
  }
}
