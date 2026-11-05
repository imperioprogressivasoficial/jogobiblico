export type GameAction = 'left' | 'right' | 'jump' | 'slide' | 'pause' | 'boost';

/** Toque duplo: tempo máximo entre os toques (ms), duração e movimento máximos de cada toque. */
const DOUBLE_TAP_GAP = 300;
const TAP_MAX_DURATION = 280;
const TAP_MAX_MOVE = 14;
const DOUBLE_TAP_MAX_DISTANCE = 90;

/**
 * Teclado (setas, WASD, espaço) e gestos de deslizar no celular.
 * O gesto é reconhecido durante o movimento do dedo (não espera soltar),
 * para a resposta ser imediata. Dois toques rápidos com o dedo quase parado
 * (ou a tecla E / Shift) chamam a Carruagem de Fogo.
 */
export class InputManager {
  private startX = 0;
  private startY = 0;
  private tracking = false;
  private consumed = false;
  private pointerId = -1;
  private downTime = 0;
  private maxMove = 0;
  /** Último toque simples (sem deslizar): fim do toque e posição. */
  private lastTapEnd = -1e9;
  private lastTapX = 0;
  private lastTapY = 0;
  /** Distância mínima do gesto, em pixels. */
  threshold = 28;
  enabled = true;

  constructor(private target: HTMLElement, private onAction: (a: GameAction) => void) {
    window.addEventListener('keydown', this.onKey);
    target.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    target.addEventListener('touchmove', this.preventScroll, { passive: false });
  }

  private preventScroll = (e: TouchEvent) => {
    if (this.enabled) e.preventDefault();
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    let a: GameAction | null = null;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        a = 'left';
        break;
      case 'ArrowRight':
      case 'KeyD':
        a = 'right';
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        a = 'jump';
        break;
      case 'ArrowDown':
      case 'KeyS':
        a = 'slide';
        break;
      case 'Escape':
      case 'KeyP':
        a = 'pause';
        break;
      case 'KeyE':
      case 'ShiftLeft':
      case 'ShiftRight':
        a = 'boost';
        break;
    }
    if (a) {
      if (!this.enabled && a !== 'pause') return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'BUTTON') && a !== 'pause') el.blur();
      e.preventDefault();
      this.onAction(a);
    }
  };

  private onDown = (e: PointerEvent) => {
    if (!this.enabled) return;
    this.tracking = true;
    this.consumed = false;
    this.pointerId = e.pointerId;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.downTime = e.timeStamp || performance.now();
    this.maxMove = 0;
  };

  private onMove = (e: PointerEvent) => {
    if (!this.tracking || this.consumed || e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    this.maxMove = Math.max(this.maxMove, adx, ady);
    if (Math.max(adx, ady) < this.threshold) return;
    this.consumed = true;
    if (adx > ady) this.onAction(dx < 0 ? 'left' : 'right');
    else this.onAction(dy < 0 ? 'jump' : 'slide');
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId || !this.tracking) return;
    this.tracking = false;
    if (!this.enabled || e.type !== 'pointerup') return;
    // toque simples: curto e com o dedo quase parado (nunca um gesto de deslizar)
    const now = e.timeStamp || performance.now();
    const move = Math.max(this.maxMove, Math.abs(e.clientX - this.startX), Math.abs(e.clientY - this.startY));
    if (this.consumed || move > TAP_MAX_MOVE || now - this.downTime > TAP_MAX_DURATION) {
      this.lastTapEnd = -1e9;
      return;
    }
    const near = Math.hypot(e.clientX - this.lastTapX, e.clientY - this.lastTapY) < DOUBLE_TAP_MAX_DISTANCE;
    if (this.downTime - this.lastTapEnd <= DOUBLE_TAP_GAP && near) {
      this.lastTapEnd = -1e9;
      this.onAction('boost');
      return;
    }
    this.lastTapEnd = now;
    this.lastTapX = e.clientX;
    this.lastTapY = e.clientY;
  };

  dispose(): void {
    window.removeEventListener('keydown', this.onKey);
    this.target.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    this.target.removeEventListener('touchmove', this.preventScroll);
  }
}
