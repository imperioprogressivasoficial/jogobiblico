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
    try {
      engine = new GameEngine(canvas.current, wrap.current);
      UIManager.setEngine(engine);
      (window as unknown as { __davidRunner: unknown }).__davidRunner = { engine, ui: UIManager, progression };
    } catch (e) {
      console.error(e);
      setError('Não foi possível iniciar os gráficos 3D (WebGL). Tente atualizar o navegador.');
    }
    return () => engine?.dispose();
  }, []);

  return (
    <div ref={wrap} className="game-canvas">
      <canvas ref={canvas} />
      {error && <div className="webgl-error">{error}</div>}
    </div>
  );
}
