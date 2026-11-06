import { useMemo, useState } from 'react';
import { audio } from '../../../game/AudioManager';
import { STORY } from '../../../data/story';
import { speak } from '../../narrator';
import { Btn } from '../../components/common';
import { ModeFinish, ModeHeader } from './ModeFinish';

const ROUNDS = 5;
/** No máximo este número de pedaços por versículo (palavras agrupadas para crianças pequenas). */
const MAX_PIECES = 6;

function parseVerse(v: string): { text: string; ref: string } {
  const m = v.match(/^(.*)\s*\(([^)]+)\)\s*$/);
  return m ? { text: m[1].trim(), ref: m[2] } : { text: v, ref: '' };
}

function pieces(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const size = Math.ceil(words.length / MAX_PIECES);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size).join(' '));
  return out;
}

/** Monte o Versículo: toque nos pedaços na ordem certa para montar o versículo da história. */
export function VerseMode() {
  const [game, setGame] = useState(0);
  const verses = useMemo(
    () =>
      [...STORY]
        .map((s) => ({ title: s.title, ...parseVerse(s.verse) }))
        .filter((v) => v.text.split(/\s+/).length <= 26)
        .sort(() => Math.random() - 0.5)
        .slice(0, ROUNDS),
    [game],
  );
  const [i, setI] = useState(0);
  const v = verses[i];
  const parts = useMemo(() => pieces(v.text), [v]);
  const shuffled = useMemo(() => parts.map((p, k) => ({ p, k })).sort(() => Math.random() - 0.5), [parts]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [shake, setShake] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const complete = placed.length === parts.length;

  function tap(k: number) {
    if (complete || placed.includes(k)) return;
    if (k === placed.length) {
      audio.play('coin');
      const np = [...placed, k];
      setPlaced(np);
      if (np.length === parts.length) {
        setScore((s) => s + Math.max(30, 120 - errors * 15));
        audio.play('victory');
        speak(`${v.text}. ${v.ref}`);
      }
    } else {
      audio.play('oops');
      setErrors((e) => e + 1);
      setShake(k);
      window.setTimeout(() => setShake(null), 400);
    }
  }

  function nextVerse() {
    if (i + 1 >= ROUNDS) return setOver(true);
    setI(i + 1);
    setPlaced([]);
    setErrors(0);
  }

  function again() {
    setGame((g) => g + 1);
    setI(0);
    setPlaced([]);
    setErrors(0);
    setScore(0);
    setOver(false);
  }

  return (
    <div className="screen mode-screen mode-verse" data-testid="mode-verse">
      <ModeHeader title="📜 Monte o Versículo" right={<span className="mode-pill">{score} pts</span>} />
      <p className="mv-sub">
        Versículo {i + 1}/{ROUNDS} · {v.title}
      </p>
      <div className={`mv-scroll ${complete ? 'done' : ''}`} data-testid="mv-scroll">
        {placed.length === 0 && <span className="mv-hint">Toque nos pedaços na ordem certa 👇</span>}
        {placed.map((k) => (
          <span key={k} className="mv-word">
            {parts[k]}
          </span>
        ))}
        {complete && <div className="mv-ref">📖 {v.ref}</div>}
      </div>
      <div className="mv-pool">
        {shuffled.map(({ p, k }) => (
          <button key={k} type="button" className={`mv-piece ${placed.includes(k) ? 'used' : ''} ${shake === k ? 'shake' : ''}`} data-testid={`mv-piece-${k}`} onClick={() => tap(k)}>
            {p}
          </button>
        ))}
      </div>
      {complete && (
        <Btn variant="green" size="lg" className="mv-next" testId="mv-next" onClick={nextVerse}>
          {i + 1 >= ROUNDS ? 'Terminar ✔' : 'Próximo versículo ▶'}
        </Btn>
      )}
      {over && <ModeFinish mode="versiculo" score={score} coins={Math.round(score / 6)} line="Você guardou 5 versículos no coração!" onAgain={again} />}
    </div>
  );
}
