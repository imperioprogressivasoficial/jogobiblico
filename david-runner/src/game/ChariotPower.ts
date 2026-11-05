import { CHARIOT } from '../data/chariot';
import { POWERS, type PowerDef } from '../data/powers';

/**
 * Estado do poder equipado durante a corrida (lógica pura, sem Three.js).
 * Poderes "timed" duram alguns segundos; o "instant" (Funda) gasta 1 carga por uso.
 * Ao acabar, mais `tailProtection` segundos de proteção enquanto a velocidade volta ao normal.
 */
export class ChariotPower {
  /** Poder equipado. */
  def: PowerDef = POWERS[0];
  /** Cargas disponíveis nesta corrida. */
  charges = 0;
  /** Duração (s) de cada ativação. */
  duration: number = CHARIOT.baseDuration;
  /** Tempo restante do poder (s). */
  remaining = 0;
  /** Proteção extra restante depois do fim (s). */
  tail = 0;
  /** Multiplicador de velocidade atual (sobe e desce suavemente). */
  speedMul = 1;
  /** Tempo desde a ativação (s), usado nos efeitos visuais. */
  age = 0;

  configure(charges: number, duration: number, def: PowerDef = POWERS[0]): void {
    this.def = def;
    this.charges = Math.max(0, Math.floor(charges));
    this.duration = duration;
    this.stop();
  }

  stop(): void {
    this.remaining = 0;
    this.tail = 0;
    this.speedMul = 1;
    this.age = 0;
  }

  get active(): boolean {
    return this.remaining > 0;
  }

  /** Invencível: durante o poder e na proteção final (só para poderes que protegem). */
  get shielding(): boolean {
    return (this.def.effects.invincible || this.def.effects.part) && (this.remaining > 0 || this.tail > 0);
  }

  /** Intensidade dos efeitos visuais (0..1). */
  get intensity(): number {
    if (this.remaining > 0) return Math.min(1, this.age / 0.25);
    return this.tail > 0 ? this.tail / CHARIOT.tailProtection : 0;
  }

  canActivate(): boolean {
    if (this.charges <= 0) return false;
    return this.def.kind === 'instant' ? true : this.remaining <= 0;
  }

  /** Gasta uma carga. Para poderes "timed" inicia a contagem; para "instant" só consome. */
  activate(): boolean {
    if (!this.canActivate()) return false;
    this.charges--;
    if (this.def.kind === 'timed') {
      this.remaining = this.duration;
      this.tail = 0;
      this.age = 0;
    }
    return true;
  }

  /** Avança o tempo; retorna 'ended' no passo em que o poder acaba. */
  update(dt: number): 'ended' | null {
    let ev: 'ended' | null = null;
    if (this.remaining > 0) {
      this.age += dt;
      this.remaining -= dt;
      if (this.remaining <= 0) {
        this.remaining = 0;
        this.tail = this.def.effects.invincible || this.def.effects.part ? CHARIOT.tailProtection : 0;
        ev = 'ended';
      }
    } else if (this.tail > 0) {
      this.tail = Math.max(0, this.tail - dt);
    }
    const target = this.remaining > 0 ? this.def.effects.speedMul : 1;
    // acelera rápido e desacelera devagar
    const rate = target > this.speedMul ? 3.2 : 1.3;
    this.speedMul += (target - this.speedMul) * Math.min(1, dt * rate);
    if (Math.abs(this.speedMul - target) < 0.002) this.speedMul = target;
    return ev;
  }
}
