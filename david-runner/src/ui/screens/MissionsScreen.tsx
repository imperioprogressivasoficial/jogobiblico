import { useEffect, useState } from 'react';
import { audio } from '../../game/AudioManager';
import { MISSION_POOL } from '../../data/progression';
import { progression } from '../../state/ProgressionManager';
import { Btn, CoinIcon, Progress, RelicIcon, TopBar } from '../components/common';
import { fmt, useProgress } from '../UIManager';

function timeToMidnight(): string {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

export function MissionsScreen() {
  useProgress();
  const [, force] = useState(0);
  useEffect(() => {
    progression.ensureDailyMissions();
    const h = setInterval(() => force((x) => x + 1), 30000);
    return () => clearInterval(h);
  }, []);
  const m = progression.data.missions;
  const allClaimed = m.list.every((x) => x.claimed);
  return (
    <div className="screen list-screen" data-testid="missions-screen">
      <TopBar title="Missões Diárias" />
      <div className="scroll-area">
        <div className="mult-card">
          <div className="mult-big">x{progression.baseMultiplier}</div>
          <div>
            <strong>Multiplicador de pontuação</strong>
            <p>
              Complete e resgate as 3 missões do dia para aumentar o multiplicador em +1 e ganhar 1 <RelicIcon size={14} /> relíquia.
            </p>
            <small className="muted">Novas missões em {timeToMidnight()}</small>
          </div>
        </div>
        <div className="mission-list">
          {m.list.map((ms, i) => {
            const t = MISSION_POOL.find((x) => x.id === ms.templateId)!;
            const complete = ms.progress >= ms.target;
            return (
              <div key={ms.templateId} className={`mission ${ms.claimed ? 'claimed' : complete ? 'complete' : ''}`} data-testid={`mission-${i}`}>
                <div className="mission-num">{i + 1}</div>
                <div className="mission-info">
                  <strong>{t.text(ms.target)}</strong>
                  <Progress value={ms.progress / ms.target} label={`${fmt(ms.progress)} / ${fmt(ms.target)}`} />
                </div>
                {ms.claimed ? (
                  <span className="owned">✔</span>
                ) : (
                  <Btn
                    variant={complete ? 'green' : 'ghost'}
                    size="sm"
                    disabled={!complete}
                    sfx={null}
                    testId={`claim-${i}`}
                    onClick={() => {
                      if (progression.claimMission(i)) audio.play('buy');
                    }}
                  >
                    <CoinIcon size={16} /> {t.reward}
                  </Btn>
                )}
              </div>
            );
          })}
        </div>
        {allClaimed && <p className="center done-line">🎉 Todas as missões de hoje foram concluídas! Volte amanhã.</p>}
      </div>
    </div>
  );
}
