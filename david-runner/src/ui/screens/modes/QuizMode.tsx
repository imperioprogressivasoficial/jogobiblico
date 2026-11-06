import { useEffect, useMemo, useState } from 'react';
import { audio } from '../../../game/AudioManager';
import { STORY } from '../../../data/story';
import { speak, stopSpeaking } from '../../narrator';
import { ModeFinish, ModeHeader } from './ModeFinish';

const ROUNDS = 10;
const TIME = 20;

/** Show da Fé: 10 perguntas sorteadas das histórias da Bíblia, com tempo e sequência de acertos. */
export function QuizMode() {
  const [game, setGame] = useState(0);
  const qs = useMemo(() => [...STORY].sort(() => Math.random() - 0.5).slice(0, ROUNDS), [game]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(TIME);
  const [score, setScore] = useState(0);
  const [right, setRight] = useState(0);
  const [streak, setStreak] = useState(0);
  const [over, setOver] = useState(false);
  const q = qs[i];

  useEffect(() => {
    if (over || picked !== null) return;
    if (left <= 0) {
      choose(-1);
      return;
    }
    const h = window.setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, picked, over]);

  useEffect(() => () => stopSpeaking(), []);

  function choose(k: number) {
    if (picked !== null) return;
    setPicked(k);
    const ok = k === q.quiz.answer;
    if (ok) {
      const st = streak + 1;
      setStreak(st);
      setRight((r) => r + 1);
      setScore((s) => s + 100 + left * 5 + (st >= 3 ? 50 : 0));
      audio.play('powerup');
    } else {
      setStreak(0);
      audio.play('oops');
    }
    window.setTimeout(() => {
      if (i + 1 >= ROUNDS) setOver(true);
      else {
        setI(i + 1);
        setPicked(null);
        setLeft(TIME);
      }
    }, 2200);
  }

  function again() {
    setGame((g) => g + 1);
    setI(0);
    setPicked(null);
    setLeft(TIME);
    setScore(0);
    setRight(0);
    setStreak(0);
    setOver(false);
  }

  return (
    <div className="screen mode-screen mode-quiz" data-testid="mode-quiz">
      <ModeHeader title="❓ Show da Fé" right={<span className="mode-pill">{score} pts</span>} />
      <div className="mq-top">
        <span>
          Pergunta {i + 1}/{ROUNDS}
        </span>
        {streak >= 2 && <span className="mq-streak">🔥 {streak} seguidas!</span>}
        <span className={`mq-time ${left <= 5 ? 'low' : ''}`}>⏱️ {left}s</span>
      </div>
      <div className="mq-bar">
        <div style={{ width: `${(left / TIME) * 100}%` }} />
      </div>
      <div className="mq-card" key={i}>
        <small className="mq-ref">
          {q.title} · {q.reference}
        </small>
        <h2 className="mq-q" data-testid="mq-question">
          {q.quiz.question}
        </h2>
        <button type="button" className="mq-listen" onClick={() => speak(`${q.quiz.question} ${q.quiz.options.map((o, k) => `${'ABC'[k]}: ${o}.`).join(' ')}`)}>
          🔊
        </button>
      </div>
      <div className="mq-opts">
        {q.quiz.options.map((o, k) => {
          const isRight = picked !== null && k === q.quiz.answer;
          const isWrong = picked === k && k !== q.quiz.answer;
          return (
            <button key={k} type="button" className={`mq-opt mq-opt-${k} ${isRight ? 'right' : ''} ${isWrong ? 'wrong' : ''}`} data-testid={`mq-opt-${k}`} disabled={picked !== null} onClick={() => choose(k)}>
              <span className="mq-letter">{isRight ? '✔' : isWrong ? '✖' : 'ABC'[k]}</span>
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && <div className={`mq-feedback ${picked === q.quiz.answer ? 'ok' : 'no'}`}>{picked === q.quiz.answer ? '🎉 Acertou!' : `💡 ${q.lesson}`}</div>}
      {over && <ModeFinish mode="quiz" score={score} coins={right * 15 + (right === ROUNDS ? 100 : 0)} line={`Você acertou ${right} de ${ROUNDS} perguntas!`} onAgain={again} />}
    </div>
  );
}
