import { useEffect, useRef, useState } from 'react';
import { audio } from '../../game/AudioManager';
import type { GameEngine } from '../../game/GameEngine';
import type { StoryEpisode } from '../../data/story';
import { progression } from '../../state/ProgressionManager';
import { speak, stopSpeaking } from '../narrator';
import { CoinIcon } from './common';

/**
 * Modo "Viver a história": durante a corrida no cenário da história,
 * o narrador conta página por página, as figuras da história surgem à beira da pista
 * e, no fim, o jogo para um instante para o quiz. Depois a corrida continua.
 */
type Card =
  | { kind: 'intro' }
  | { kind: 'page'; index: number }
  | { kind: 'lesson' }
  | { kind: 'quiz' }
  | { kind: 'done'; reward: number };

/** Tempo mínimo (s) de cada cartão, mesmo sem voz; e máximo, caso a voz não avise o fim. */
const MIN_TIME = 6;
const MAX_TIME = 22;

export function StoryRunOverlay({
  engine,
  story,
  playing,
  holdRef,
  onResume,
}: {
  engine: GameEngine;
  story: StoryEpisode;
  /** A corrida está andando (não pausada, sem contagem, sem tela de reviver). */
  playing: boolean;
  /** Marcado enquanto o quiz segura o jogo, para a tela de jogo não abrir a pausa. */
  holdRef: React.MutableRefObject<boolean>;
  /** Volta a correr (contagem 3-2-1). */
  onResume: () => void;
}) {
  const [card, setCard] = useState<Card>({ kind: 'intro' });
  const [wrong, setWrong] = useState<number[]>([]);
  const [hidden, setHidden] = useState(false);
  const elapsed = useRef(0);
  const spoken = useRef(false);
  const answered = useRef(false);
  const timers = useRef<number[]>([]);
  const emojis = splitEmojis(story.scene);

  const textOf = (c: Card): string => {
    if (c.kind === 'intro') return `Você entrou na história: ${story.title}. ${story.reference}. Corra e escute!`;
    if (c.kind === 'page') return story.pages[c.index];
    if (c.kind === 'lesson') return `O que aprendemos: ${story.lesson}`;
    if (c.kind === 'quiz') return `Hora do quiz! ${story.quiz.question} ${story.quiz.options.map((o, i) => `${'ABC'[i]}: ${o}.`).join(' ')}`;
    return 'História vivida! Continue correndo.';
  };

  // fala o cartão atual e mostra as figuras da história ao lado da pista
  useEffect(() => {
    elapsed.current = 0;
    spoken.current = false;
    if (card.kind === 'intro' || card.kind === 'page') {
      const k = card.kind === 'page' ? card.index + 1 : 0;
      const rotated = [...emojis.slice(k % emojis.length), ...emojis.slice(0, k % emojis.length)];
      engine.spawnStoryProps(rotated, card.kind === 'intro' ? 8 : 6);
    }
    if (card.kind === 'quiz') {
      holdRef.current = true;
      engine.pause();
    }
    if (!playing && card.kind !== 'quiz') return;
    audio.setDucked(true);
    const ok = speak(textOf(card), () => {
      spoken.current = true;
      audio.setDucked(false);
    });
    if (!ok) spoken.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card]);

  // pausou: cala o narrador; voltou a correr: repete o cartão atual
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (card.kind === 'quiz' || card.kind === 'done') return;
    if (!playing) {
      stopSpeaking();
      audio.setDucked(false);
      return;
    }
    elapsed.current = Math.min(elapsed.current, 1);
    spoken.current = false;
    audio.setDucked(true);
    if (!speak(textOf(card), () => ((spoken.current = true), audio.setDucked(false)))) spoken.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // avança os cartões com o tempo de corrida (só conta enquanto corre)
  useEffect(() => {
    const h = window.setInterval(() => {
      if (!playing || engine.mode !== 'playing') return;
      elapsed.current += 0.25;
      // testes automáticos aceleram os cartões
      const t = elapsed.current * ((window as unknown as { __storyFast?: number }).__storyFast ?? 1);
      if (!((spoken.current && t >= MIN_TIME) || t >= MAX_TIME)) return;
      setCard((c) => {
        if (c.kind === 'intro') return story.pages.length ? { kind: 'page', index: 0 } : { kind: 'lesson' };
        if (c.kind === 'page') return c.index + 1 < story.pages.length ? { kind: 'page', index: c.index + 1 } : { kind: 'lesson' };
        if (c.kind === 'lesson') return { kind: 'quiz' };
        return c;
      });
    }, 250);
    return () => clearInterval(h);
  }, [playing, engine, story]);

  // ao sair da corrida: cala o narrador e devolve a música
  useEffect(
    () => () => {
      stopSpeaking();
      audio.setDucked(false);
      holdRef.current = false;
      // sair da corrida antes dos temporizadores do quiz não pode religar a contagem no menu
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
    [holdRef],
  );

  function answer(i: number) {
    if (card.kind !== 'quiz' || answered.current) return;
    if (i !== story.quiz.answer) {
      setWrong((w) => (w.includes(i) ? w : [...w, i]));
      audio.play('oops');
      audio.setDucked(false); // a fala do quiz foi interrompida: devolve a música
      speak('Quase! Tente de novo.');
      return;
    }
    answered.current = true;
    stopSpeaking();
    audio.setDucked(false);
    const reward = progression.completeStoryQuiz(story.id);
    progression.markStoryRead(story.id);
    audio.play('victory');
    setCard({ kind: 'done', reward });
    speak(reward > 0 ? `Muito bem! Você ganhou ${reward} denários. Continue correndo!` : 'Muito bem! Continue correndo!');
    timers.current.push(
      window.setTimeout(() => {
        holdRef.current = false;
        onResume();
      }, 1800),
      window.setTimeout(() => setHidden(true), 7000),
    );
  }

  if (card.kind === 'quiz') {
    return (
      <div className="overlay" data-testid="story-run-quiz">
        <div className="panel story-run-quiz">
          <div className="quiz-badge">❓ Hora do quiz!</div>
          <h2 className="quiz-question">{story.quiz.question}</h2>
          <div className="quiz-options">
            {story.quiz.options.map((o, i) => (
              <button
                key={i}
                type="button"
                className={`quiz-opt ${wrong.includes(i) ? 'wrong' : ''}`}
                data-testid={`story-run-opt-${i}`}
                onClick={() => answer(i)}
              >
                <span className="quiz-letter">{wrong.includes(i) ? '✖' : 'ABC'[i]}</span>
                {o}
              </button>
            ))}
          </div>
          {wrong.length > 0 && <div className="quiz-msg quiz-try">Quase! Tente outra resposta 💪</div>}
        </div>
      </div>
    );
  }

  if (hidden) return null;
  const pageNo = card.kind === 'page' ? card.index + 1 : 0;
  return (
    <div className={`story-caption story-caption-${card.kind}`} data-testid="story-caption" key={card.kind + pageNo}>
      <div className="story-caption-scene">{card.kind === 'done' ? '🏆' : card.kind === 'lesson' ? '💡' : emojis[0] ?? '📖'}</div>
      <div className="story-caption-body">
        <small>
          {card.kind === 'intro' && `📖 ${story.reference}`}
          {card.kind === 'page' && `${story.title} · ${pageNo}/${story.pages.length}`}
          {card.kind === 'lesson' && 'O que aprendemos'}
          {card.kind === 'done' && 'História vivida!'}
        </small>
        <p>
          {card.kind === 'intro' && <strong>Você entrou na história: {story.title}</strong>}
          {card.kind === 'page' && story.pages[card.index]}
          {card.kind === 'lesson' && story.lesson}
          {card.kind === 'done' && (
            <>
              Muito bem!{' '}
              {card.reward > 0 && (
                <>
                  +{card.reward} <CoinIcon size={16} />
                </>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/** Separa as figuras da cena (emojis colados ou com espaço). */
function splitEmojis(scene: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  const parts = Seg ? Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(scene), (x) => x.segment) : Array.from(scene);
  return parts.filter((p) => p.trim() && p !== '\uFE0F');
}
