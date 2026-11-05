import { ACHIEVEMENTS } from '../../data/progression';
import { progression } from '../../state/ProgressionManager';
import { CoinIcon, Progress, TopBar } from '../components/common';
import { fmt, useProgress } from '../UIManager';

export function AchievementsScreen() {
  useProgress();
  const d = progression.data;
  const done = ACHIEVEMENTS.filter((a) => d.achievements[a.id]).length;
  return (
    <div className="screen list-screen" data-testid="achievements-screen">
      <TopBar title="Conquistas" />
      <div className="scroll-area">
        <p className="center summary-line">
          {done} de {ACHIEVEMENTS.length} conquistas
        </p>
        <div className="achievement-list">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = d.achievements[a.id];
            const value = progression.statValue(a.stat);
            return (
              <div key={a.id} className={`achievement ${unlocked ? 'done' : ''}`}>
                <div className="ach-icon">{unlocked ? a.icon : '🔒'}</div>
                <div className="ach-info">
                  <strong>{a.name}</strong>
                  <small>{a.description}</small>
                  {unlocked ? (
                    <small className="ach-date">Conquistada em {new Date(unlocked).toLocaleDateString('pt-BR')}</small>
                  ) : (
                    <Progress value={value / a.goal} label={`${fmt(Math.min(value, a.goal))} / ${fmt(a.goal)}`} />
                  )}
                </div>
                <div className="ach-reward">
                  <CoinIcon size={16} /> {fmt(a.reward)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
