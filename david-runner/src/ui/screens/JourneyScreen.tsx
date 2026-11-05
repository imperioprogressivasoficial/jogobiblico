import { useEffect, useRef, useState } from 'react';
import { audio } from '../../game/AudioManager';
import { ERAS, STORY, type StoryEpisode } from '../../data/story';
import { progression } from '../../state/ProgressionManager';
import { Progress, TopBar } from '../components/common';
import { StoryReader } from '../components/StoryReader';
import { StoryScene } from '../components/StoryScene';
import { useProgress } from '../UIManager';

/**
 * Jornada Bíblica: a linha do tempo da Bíblia, era por era (Criação → Igreja).
 * Cada história é uma parada no caminho; os pergaminhos das corridas revelam a próxima.
 */
export function JourneyScreen() {
  useProgress();
  const d = progression.data;
  const [reading, setReading] = useState<StoryEpisode | null>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const unlocked = d.scrolls.length;
  const total = STORY.length;
  const next = progression.nextLockedStory();
  const eras = ERAS.map((era) => ({ era, stories: STORY.filter((s) => s.era === era.id) }));
  const comingSoon = eras.filter((e) => e.stories.length === 0);

  // abre a trilha perto da última história revelada
  useEffect(() => {
    const el = nextRef.current;
    if (el) el.scrollIntoView({ block: 'center' });
  }, []);

  const lastUnlocked = [...STORY].reverse().find((s) => d.scrolls.includes(s.id));
  const focusId = next?.id ?? lastUnlocked?.id;

  return (
    <div className="screen list-screen journey" data-testid="journey-screen">
      <TopBar title="Jornada Bíblica" />
      <div className="scroll-area">
        <div className="journey-head">
          <div className="journey-count" data-testid="journey-count">
            <span className="journey-big">📖 {unlocked}</span>
            <span>
              de {total} histórias
              <br />
              reveladas
            </span>
          </div>
          <Progress value={total ? unlocked / total : 0} />
          <p>
            {next ? (
              <>
                Pegue <strong>📜 pergaminhos</strong> nas corridas para revelar a próxima história!
              </>
            ) : (
              <>🎉 Você revelou todas as histórias! Releia e acerte todos os quizzes.</>
            )}
          </p>
        </div>

        <div className="trail">
          {eras
            .filter((e) => e.stories.length > 0)
            .map(({ era, stories }) => {
              const got = stories.filter((s) => d.scrolls.includes(s.id)).length;
              return (
                <section key={era.id} className="trail-era" data-testid={`era-${era.id}`}>
                  <div className="era-banner" style={{ background: era.gradient }}>
                    <span className="era-emoji">{era.emoji}</span>
                    <div>
                      <strong>{era.id}</strong>
                      <small>{era.subtitle}</small>
                    </div>
                    <span className="era-count">
                      {got}/{stories.length}
                    </span>
                  </div>
                  <div className="trail-stops">
                    {stories.map((s, i) => {
                      const open = d.scrolls.includes(s.id);
                      const read = d.storiesRead.includes(s.id);
                      const quiz = d.storyQuizzes.includes(s.id);
                      const isNext = next?.id === s.id;
                      return (
                        <div
                          key={s.id}
                          ref={s.id === focusId ? nextRef : undefined}
                          className={`stop ${i % 2 ? 'stop-right' : 'stop-left'} ${open ? 'open' : 'locked'} ${isNext ? 'next' : ''}`}
                        >
                          <div className="stop-node" style={{ borderColor: open ? era.color : undefined }}>
                            {open ? s.number : '?'}
                          </div>
                          {open ? (
                            <button
                              type="button"
                              className="stop-card"
                              data-testid={`story-${s.id}`}
                              onClick={() => {
                                audio.play('ui');
                                setReading(s);
                              }}
                            >
                              <StoryScene story={s} size="card" />
                              <div className="stop-info">
                                <strong>{s.title}</strong>
                                <small>{s.reference}</small>
                                <div className="stop-badges">
                                  <span className={`seal ${read ? 'on' : ''}`}>{read ? '📖 Lida ✔' : '📖 Ler agora'}</span>
                                  <span className={`seal ${quiz ? 'on' : ''}`}>{quiz ? '❓ Quiz ✔' : '❓ Quiz'}</span>
                                </div>
                              </div>
                            </button>
                          ) : (
                            <div className="stop-card locked" data-testid={`story-locked-${s.id}`}>
                              <StoryScene story={s} size="card" locked />
                              <div className="stop-info">
                                <strong>História {s.number}</strong>
                                <small>{isNext ? '📜 O próximo pergaminho revela esta!' : 'Colete pergaminhos para revelar'}</small>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}

          {comingSoon.length > 0 && (
            <section className="trail-era coming-soon">
              <div className="era-banner soon">
                <span className="era-emoji">🚧</span>
                <div>
                  <strong>Em breve, mais histórias!</strong>
                  <small>{comingSoon.map((e) => `${e.era.emoji} ${e.era.id}`).join(' · ')}</small>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
      {reading && <StoryReader story={reading} onClose={() => setReading(null)} />}
    </div>
  );
}
