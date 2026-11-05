import { CHARIOT } from '../data/chariot';

/**
 * Estado da Carruagem de Fogo durante a corrida (lógica pura, sem Three.js).
 * Ativa: velocidade ×1,5 e invencível. Ao acabar, mais `tailProtection` segundos
 * de proteção enquanto a velocidade volta suavemente ao normal.
 */
export class ChariotPower {
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

  configure(charges: number, duration: number): void {
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

  /** Invencível: durante o poder e na proteção final. */
  get shielding(): boolean {
    return this.remaining > 0 || this.tail > 0;
  }

  /** Intensidade dos efeitos visuais (0..1). */
  get intensity(): number {
    if (this.remaining > 0) return Math.min(1, this.age / 0.25);
    return this.tail > 0 ? this.tail / CHARIOT.tailProtection : 0;
  }

  canActivate(): boolean {
    return this.charges > 0 && this.remaining <= 0;
  }

  activate(): boolean {
    if (!this.canActivate()) return false;
    this.charges--;
    this.remaining = this.duration;
    this.tail = 0;
    this.age = 0;
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
        this.tail = CHARIOT.tailProtection;
        ev = 'ended';
      }
    } else if (this.tail > 0) {
      this.tail = Math.max(0, this.tail - dt);
    }
    const target = this.remaining > 0 ? CHARIOT.speedMultiplier : 1;
    // acelera rápido e desacelera devagar
    const rate = target > this.speedMul ? 3.2 : 1.3;
    this.speedMul += (target - this.speedMul) * Math.min(1, dt * rate);
    if (Math.abs(this.speedMul - target) < 0.002) this.speedMul = target;
    return ev;
  }
}
