import { useEffect, useState } from 'react';
import { audio } from '../../game/AudioManager';
import { Logo } from '../components/common';
import { progression } from '../../state/ProgressionManager';
import { UIManager } from '../UIManager';

export function SplashScreen() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const start = performance.now();
    const tick = () => {
      if (!alive) return;
      const t = Math.min(1, (performance.now() - start) / 1600);
      setProgress(UIManager.engine ? t : Math.min(t, 0.85));
      if (t >= 1 && UIManager.engine) setReady(true);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      alive = false;
    };
  }, []);

  const enter = () => {
    if (!ready) return;
    audio.unlock();
    audio.play('ui');
    UIManager.showMenuScene();
    // primeira abertura: cadastro da conta
    UIManager.go(progression.data.profile ? 'menu' : 'onboarding', true);
  };

  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') enter();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="screen splash" onClick={enter} data-testid="splash">
      <div className="splash-sun" />
      <Logo />
      <div className="splash-bottom">
        {!ready ? (
          <>
            <div className="loading-bar">
              <div className="loading-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="loading-text">Preparando a jornada…</p>
          </>
        ) : (
          <p className="tap-to-start" data-testid="tap-to-start">
            Toque para começar
          </p>
        )}
        <p className="splash-credit">Império Progressivas · v1.0</p>
      </div>
    </div>
  );
}
