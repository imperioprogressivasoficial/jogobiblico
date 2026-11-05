export type GameAction = 'left' | 'right' | 'jump' | 'slide' | 'pause';

/**
 * Teclado (setas, WASD, espaço) e gestos de deslizar no celular.
 * O gesto é reconhecido durante o movimento do dedo (não espera soltar),
 * para a resposta ser imediata.
 */
export class InputManager {
  private startX = 0;
  private startY = 0;
  private tracking = false;
  private consumed = false;
  private pointerId = -1;
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
  };

  private onMove = (e: PointerEvent) => {
    if (!this.tracking || this.consumed || e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (Math.max(adx, ady) < this.threshold) return;
    this.consumed = true;
    if (adx > ady) this.onAction(dx < 0 ? 'left' : 'right');
    else this.onAction(dy < 0 ? 'jump' : 'slide');
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId === this.pointerId) this.tracking = false;
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
