import { ERAS, type EraInfo, type StoryEpisode, type StoryEra } from '../../data/story';

export function eraInfo(era: StoryEra): EraInfo {
  return ERAS.find((e) => e.id === era) ?? ERAS[0];
}

/** Separa os emojis da cena (por espaço; se vier tudo junto, por grafema). */
export function sceneEmojis(scene: string): string[] {
  const parts = scene.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return parts;
  const one = parts[0] ?? '📜';
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return Array.from(new Seg('pt-BR', { granularity: 'grapheme' }).segment(one), (s) => s.segment);
  return Array.from(one);
}

/** Posições (%), escala e atraso da animação de cada emoji; o primeiro é o destaque. */
const SLOTS = [
  { x: 50, y: 60, s: 1, d: 0 },
  { x: 15, y: 24, s: 0.5, d: 0.6 },
  { x: 85, y: 22, s: 0.5, d: 1.2 },
  { x: 20, y: 74, s: 0.46, d: 0.3 },
  { x: 81, y: 72, s: 0.46, d: 0.9 },
  { x: 36, y: 15, s: 0.36, d: 1.5 },
  { x: 64, y: 13, s: 0.38, d: 0.4 },
  { x: 8, y: 50, s: 0.36, d: 1.1 },
  { x: 92, y: 48, s: 0.36, d: 0.7 },
  { x: 50, y: 90, s: 0.3, d: 1.3 },
];

const BASE_SIZE = { hero: 104, card: 60, mini: 30 } as const;

/**
 * Ilustração de uma história: emojis da cena sobre o gradiente da era,
 * com sol, colinas e brilho — como a página de um livro ilustrado.
 * `shift` gira as posições dos emojis secundários (uma cena diferente por página).
 */
export function StoryScene({
  story,
  size = 'hero',
  shift = 0,
  locked = false,
}: {
  story: StoryEpisode;
  size?: keyof typeof BASE_SIZE;
  shift?: number;
  locked?: boolean;
}) {
  const era = eraInfo(story.era);
  const emojis = sceneEmojis(story.scene);
  const [main, ...rest] = emojis;
  const max = size === 'mini' ? 3 : size === 'card' ? 6 : SLOTS.length - 1;
  const others = rest.slice(0, max);
  const base = BASE_SIZE[size];
  return (
    <div className={`story-scene story-scene-${size} ${locked ? 'locked' : ''}`} style={{ background: era.gradient }} aria-hidden="true">
      <div className="scene-sun" />
      <div className="scene-hill scene-hill-back" />
      <div className="scene-hill scene-hill-front" />
      {locked ? (
        <span className="scene-emoji scene-main scene-q" style={{ left: '50%', top: '54%', fontSize: base }}>
          ?
        </span>
      ) : (
        <>
          {others.map((e, i) => {
            const slot = SLOTS[1 + ((i + shift) % (SLOTS.length - 1))];
            return (
              <span
                key={i + e}
                className="scene-emoji"
                style={{ left: `${slot.x}%`, top: `${slot.y}%`, fontSize: Math.round(base * slot.s), animationDelay: `${slot.d}s` }}
              >
                {e}
              </span>
            );
          })}
          <span className="scene-glow" />
          <span className="scene-emoji scene-main" style={{ left: `${SLOTS[0].x}%`, top: `${SLOTS[0].y}%`, fontSize: base }}>
            {main}
          </span>
        </>
      )}
    </div>
  );
}
