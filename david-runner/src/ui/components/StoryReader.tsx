import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../../game/AudioManager';
import type { StoryEpisode } from '../../data/story';
import { progression } from '../../state/ProgressionManager';
import { speak, speechSupported, stopSpeaking } from '../narrator';
import { UIManager } from '../UIManager';
import { Btn, CoinIcon } from './common';
import { Confetti } from './Confetti';
import { StoryScene, eraInfo } from './StoryScene';

type Step = { kind: 'page'; index: number } | { kind: 'lesson' } | { kind: 'quiz' };

/**
 * Leitor de história em tela cheia, no estilo de um livro ilustrado de pergaminho:
 * páginas com texto grande, narração em voz alta, "O que aprendemos" e um quiz.
 */
export function StoryReader({ story, onClose, onPlay }: { story: StoryEpisode; onClose: () => void; onPlay?: (s: StoryEpisode) => void }) {
  const era = eraInfo(story.era);
  const steps = useMemo<Step[]>(
    () => [...story.pages.map((_, index) => ({ kind: 'page' as const, index })), { kind: 'lesson' }, { kind: 'quiz' }],
    [story],
  );
  const [step, setStep] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState<{ reward: number } | null>(null);
  const [tries, setTries] = useState(0);
  const canSpeak = useMemo(() => speechSupported(), []);
  const cur = steps[step];
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const close = useCallback(() => {
    stopSpeaking();
    audio.play('uiBack');
    onCloseRef.current();
  }, []);

  const go = useCallback(
    (to: number) => {
      const t = Math.max(0, Math.min(steps.length - 1, to));
      if (t === step) return;
      audio.play('page');
      setStep(t);
    },
    [steps.length, step],
  );

  // a narração para ao trocar de página ou fechar
  useEffect(() => {
    setSpeaking(false);
    return () => stopSpeaking();
  }, [step]);

  // chegou ao fim das páginas: história lida
  useEffect(() => {
    if (cur.kind !== 'page') progression.markStoryRead(story.id);
  }, [cur.kind, story.id]);

  // botão "voltar" do Android fecha o leitor
  useEffect(() => UIManager.pushBackHandler(close), [close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight') go(step + 1);
      else if (e.code === 'ArrowLeft') go(step - 1);
      else if (e.code === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, go, close]);

  function narrate() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    let text: string;
    if (cur.kind === 'page') text = (cur.index === 0 ? `${story.title}. ` : '') + story.pages[cur.index];
    else if (cur.kind === 'lesson') text = `O que aprendemos. ${story.lesson} Versículo: ${story.verse} Você sabia? ${story.fact}`;
    else text = `${story.quiz.question} ${story.quiz.options.map((o, i) => `${'ABC'[i] ?? i + 1}: ${o}.`).join(' ')}`;
    if (speak(text, () => setSpeaking(false))) setSpeaking(true);
  }

  function answer(i: number) {
    if (solved) return;
    stopSpeaking();
    setSpeaking(false);
    if (i === story.quiz.answer) {
      const reward = progression.completeStoryQuiz(story.id);
      setSolved({ reward });
      audio.play('victory');
    } else {
      setWrong((w) => (w.includes(i) ? w : [...w, i]));
      setTries((t) => t + 1);
      audio.play('oops');
    }
  }

  const quizDoneBefore = progression.data.storyQuizzes.includes(story.id);
  const last = step === steps.length - 1;

  return (
    <div className="reader" data-testid="story-reader" role="dialog" aria-label={story.title} style={{ ['--era' as string]: era.color }}>
      <div className="reader-book">
        <header className="reader-head">
          <span className="reader-era" style={{ background: era.color }}>
            {era.emoji} {era.id} · História {story.number}
          </span>
          <button type="button" className="reader-close" onClick={close} aria-label="Fechar" data-testid="reader-close">
            ✕
          </button>
        </header>

        <div className="reader-body" key={step} data-testid={`reader-step-${cur.kind}`}>
          {cur.kind === 'page' && (
            <>
              <StoryScene story={story} shift={cur.index} />
              <div className="reader-titles">
                <h2 className="reader-title">{story.title}</h2>
                <div className="reader-ref">📖 {story.reference}</div>
              </div>
              <p className="reader-text" data-testid="reader-text">
                {story.pages[cur.index]}
              </p>
              {cur.index === 0 && UIManager.engine && (
                <Btn
                  variant="gold"
                  size="lg"
                  className="reader-live"
                  testId="reader-live"
                  onClick={() => {
                    stopSpeaking();
                    if (onPlay) onPlay(story);
                    else {
                      onClose();
                      UIManager.startStoryRun(story);
                    }
                  }}
                >
                  🏃 Viver esta história
                </Btn>
              )}
            </>
          )}

          {cur.kind === 'lesson' && (
            <div className="reader-lesson">
              <div className="lesson-card lesson-learn">
                <h3>💡 O que aprendemos</h3>
                <p>{story.lesson}</p>
              </div>
              <div className="lesson-card lesson-verse">
                <h3>📖 Versículo</h3>
                <p className="verse">{story.verse}</p>
              </div>
              <div className="lesson-card lesson-fact">
                <h3>✨ Você sabia?</h3>
                <p>{story.fact}</p>
              </div>
            </div>
          )}

          {cur.kind === 'quiz' && (
            <div className="reader-quiz">
              <div className="quiz-badge">❓ Hora do quiz!</div>
              <h2 className="quiz-question" data-testid="quiz-question">
                {story.quiz.question}
              </h2>
              <div className="quiz-options">
                {story.quiz.options.map((o, i) => {
                  const isWrong = wrong.includes(i);
                  const isRight = !!solved && i === story.quiz.answer;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`quiz-opt ${isWrong ? 'wrong' : ''} ${isRight ? 'right' : ''}`}
                      data-testid={`quiz-opt-${i}`}
                      disabled={!!solved || isWrong}
                      onClick={() => answer(i)}
                    >
                      <span className="quiz-letter">{isRight ? '✔' : isWrong ? '✖' : ('ABC'[i] ?? i + 1)}</span>
                      <span>{o}</span>
                    </button>
                  );
                })}
              </div>
              {!solved && wrong.length > 0 && (
                <div className="quiz-msg quiz-try" key={tries} data-testid="quiz-try">
                  💛 Quase! Tente de novo — você consegue!
                </div>
              )}
              {solved && (
                <div className="quiz-msg quiz-win" data-testid="quiz-win">
                  🎉 Muito bem!{' '}
                  {solved.reward > 0 ? (
                    <span className="quiz-reward">
                      +{solved.reward} <CoinIcon size={22} />
                    </span>
                  ) : (
                    'Você já sabia essa!'
                  )}
                </div>
              )}
              {!solved && quizDoneBefore && <div className="quiz-note">✔ Você já acertou este quiz antes.</div>}
            </div>
          )}
        </div>

        <div className="reader-dots" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={i} className={`rdot ${i === step ? 'on' : ''} ${s.kind !== 'page' ? 'special' : ''}`} />
          ))}
        </div>

        <footer className="reader-nav">
          <Btn variant="wood" onClick={() => go(step - 1)} disabled={step === 0} sfx={null} testId="reader-prev" className="reader-nav-side">
            ◀ Anterior
          </Btn>
          {canSpeak ? (
            <Btn variant="blue" onClick={narrate} sfx={null} testId="reader-listen" className="reader-listen">
              {speaking ? '⏹ Parar' : '🔊 Ouvir'}
            </Btn>
          ) : (
            <span />
          )}
          {last ? (
            <Btn variant="green" onClick={close} sfx={null} disabled={!solved} testId="reader-done" className="reader-nav-side">
              Concluir ✔
            </Btn>
          ) : (
            <Btn variant="green" onClick={() => go(step + 1)} sfx={null} testId="reader-next" className="reader-nav-side">
              {cur.kind === 'lesson' ? 'Quiz ▶' : 'Próxima ▶'}
            </Btn>
          )}
        </footer>
      </div>
      {solved && <Confetti />}
    </div>
  );
}
