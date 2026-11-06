import { audio } from '../../game/AudioManager';
import { MODES, type GameMode } from '../../data/modes';
import { progression } from '../../state/ProgressionManager';
import { TopBar } from '../components/common';
import { UIManager, fmt, useProgress } from '../UIManager';

export function playMode(m: GameMode): void {
  audio.play('buy');
  UIManager.selectedMode = m.id;
  if (m.screen === 'run') UIManager.startRun();
  else UIManager.go(m.screen);
}

/** Escolha do modo de jogo: cartões grandes e coloridos, com o recorde de cada um. */
export function ModesScreen() {
  useProgress();
  const best = progression.data.modeBest;
  return (
    <div className="screen list-screen" data-testid="modes-screen">
      <TopBar title="Modos de jogo" />
      <div className="scroll-area">
        <div className="modes-grid">
          {MODES.map((m, i) => {
            const rec = m.id === 'corrida' ? progression.data.stats.bestScore : best[m.id] ?? 0;
            return (
              <button
                key={m.id}
                type="button"
                className={`mode-card ${i === 0 ? 'mode-card-main' : ''} ${UIManager.selectedMode === m.id ? 'selected' : ''}`}
                style={{ background: `linear-gradient(160deg, ${m.colors[0]}, ${m.colors[1]})` }}
                data-testid={`mode-${m.id}`}
                onClick={() => playMode(m)}
              >
                <span className="mode-icon">{m.icon}</span>
                <span className="mode-text">
                  <strong>{m.name}</strong>
                  <small>{m.tagline}</small>
                </span>
                <span className="mode-best">{rec > 0 ? `🏆 ${fmt(rec)}` : 'NOVO'}</span>
                <span className="mode-play">▶</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
