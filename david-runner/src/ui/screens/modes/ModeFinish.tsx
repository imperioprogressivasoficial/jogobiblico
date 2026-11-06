import { useEffect, useState } from 'react';
import { audio } from '../../../game/AudioManager';
import { progression } from '../../../state/ProgressionManager';
import { Btn, CoinIcon } from '../../components/common';
import { Confetti } from '../../components/Confetti';
import { UIManager, fmt } from '../../UIManager';

/** Fim de partida dos modos rápidos: pontos, recorde e denários ganhos. */
export function ModeFinish({ mode, score, coins, line, onAgain }: { mode: string; score: number; coins: number; line?: string; onAgain: () => void }) {
  const [record, setRecord] = useState(false);
  useEffect(() => {
    setRecord(progression.finishMode(mode, score, coins));
    audio.play('victory');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="overlay" data-testid="mode-finish">
      {record && <Confetti />}
      <div className="panel center mode-finish">
        <h2 className="sign-title">{record ? '🏆 Novo recorde!' : 'Muito bem!'}</h2>
        {line && <p>{line}</p>}
        <div className="mf-score">{fmt(score)} pts</div>
        <div className="mf-coins">
          +<CoinIcon size={22} /> {fmt(coins)}
        </div>
        <Btn variant="green" size="lg" onClick={onAgain} testId="mode-again">
          ↻ Jogar de novo
        </Btn>
        <Btn variant="wood" onClick={() => UIManager.back()} testId="mode-exit">
          Voltar aos modos
        </Btn>
      </div>
    </div>
  );
}

/** Cabeçalho comum dos modos rápidos. */
export function ModeHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="mode-head">
      <Btn variant="wood" size="sm" sfx={null} onClick={() => UIManager.back()} testId="back">
        ◀
      </Btn>
      <strong>{title}</strong>
      <span className="mode-head-right">{right}</span>
    </header>
  );
}
