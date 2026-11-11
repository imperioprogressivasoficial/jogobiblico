import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import { UIManager } from './UIManager';
import { progression } from '../state/ProgressionManager';

/** Canvas 3D persistente: o mesmo motor serve menu, vitrines e a corrida. */
export function GameCanvas() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvas.current || !wrap.current) return;
    let engine: GameEngine | null = null;
    const cv = canvas.current;
    // se o sistema suspender a tela 3D (comum no iPhone), avisa em vez de ficar cinza
    let lostTimer = 0;
    const onLost = () => {
      window.clearTimeout(lostTimer);
      lostTimer = window.setTimeout(() => setError('A tela 3D foi pausada pelo celular. Toque aqui para recarregar o jogo.'), 2500);
    };
    const onRestored = () => {
      window.clearTimeout(lostTimer);
      setError(null);
    };
    cv.addEventListener('webglcontextlost', onLost);
    cv.addEventListener('webglcontextrestored', onRestored);
    try {
      engine = new GameEngine(canvas.current, wrap.current);
      UIManager.setEngine(engine);
      (window as unknown as { __davidRunner: unknown }).__davidRunner = { engine, ui: UIManager, progression };
    } catch (e) {
      console.error(e);
      setError('Não foi possível iniciar os gráficos 3D (WebGL). Tente atualizar o navegador.');
    }
    return () => {
      window.clearTimeout(lostTimer);
      cv.removeEventListener('webglcontextlost', onLost);
      cv.removeEventListener('webglcontextrestored', onRestored);
      engine?.dispose();
    };
  }, []);

  return (
    <div ref={wrap} className="game-canvas">
      <canvas ref={canvas} />
      {error && (
        <button type="button" className="webgl-error" onClick={() => location.reload()}>
          {error}
        </button>
      )}
    </div>
  );
}
