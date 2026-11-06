import type { CSSProperties } from 'react';

/**
 * Ícones próprios do jogo (SVG em linha): traço grosso e arredondado, duas cores,
 * no lugar dos emojis da interface. `tone` muda a cor de preenchimento.
 */
export type IconName =
  | 'home'
  | 'modes'
  | 'shop'
  | 'journey'
  | 'heroes'
  | 'missions'
  | 'trophy'
  | 'records'
  | 'map'
  | 'settings'
  | 'back'
  | 'play'
  | 'pause'
  | 'timer'
  | 'lock'
  | 'check'
  | 'star'
  | 'bolt'
  | 'sound'
  | 'quiz'
  | 'memory'
  | 'verse'
  | 'sling'
  | 'run'
  | 'coins'
  | 'gift'
  | 'family'
  | 'plus'
  | 'close'
  | 'refresh'
  | 'fire';

const PATHS: Record<IconName, { fill?: string; stroke?: string; d: string; d2?: string }> = {
  home: { d: 'M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z' },
  modes: { d: 'M7 7h10a4 4 0 0 1 4 4v3a3 3 0 0 1-5.4 1.8L14 14h-4l-1.6 1.8A3 3 0 0 1 3 14v-3a4 4 0 0 1 4-4z', d2: 'M7.5 10.5v3M6 12h3M16 11.2h.01M18 13.2h.01' },
  shop: { d: 'M5 9h14l-1 10H6zM9 9V7a3 3 0 0 1 6 0v2', d2: 'M9 12v1M15 12v1' },
  journey: { d: 'M4 6.5A2.5 2.5 0 0 1 6.5 4H12v15H6.5A2.5 2.5 0 0 0 4 20.5zM12 4h5.5A2.5 2.5 0 0 1 20 6.5v14A2.5 2.5 0 0 0 17.5 19H12z', d2: 'M7 8h2.5M14.5 8H17M7 11h2.5M14.5 11H17' },
  heroes: { d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0z' },
  missions: { d: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z', d2: 'M12 16.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zM12 12h.01' },
  trophy: { d: 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4', d2: 'M12 14v3M8.5 20h7M10 17h4' },
  records: { d: 'M4 20h16', d2: 'M6 17v-5h3v5zM10.5 17V7h3v10zM15 17v-8h3v8z' },
  map: { d: 'M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z', d2: 'M9 4v13.5M15 6.5V20' },
  settings: { d: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', d2: 'M19 12l2-1.2-1.5-3.2-2.3.4-1.3-1.1.3-2.3L13 3.4l-1 2.1h-1.7L9.3 3.4 6.1 4.6l.3 2.3L5.1 8 2.8 7.6 1.3 10.8 3.3 12l-2 1.2 1.5 3.2 2.3-.4 1.3 1.1-.3 2.3 3.2 1.2 1-2.1h1.7l1 2.1 3.2-1.2-.3-2.3 1.3-1.1 2.3.4 1.5-3.2z' },
  back: { d: 'M14 6l-6 6 6 6' },
  play: { d: 'M8 5.5v13l10-6.5z' },
  pause: { d: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z' },
  timer: { d: 'M12 21a8 8 0 1 1 0-16 8 8 0 0 1 0 16z', d2: 'M12 9v4l2.5 1.5M9.5 3h5' },
  lock: { d: 'M6 11h12v9H6z', d2: 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 15v2' },
  check: { d: 'M5 12.5l4.5 4.5L19 7' },
  star: { d: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z' },
  bolt: { d: 'M13 3L5 13.5h6L10.5 21 19 10.5h-6z' },
  sound: { d: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z', d2: 'M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11' },
  quiz: { d: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z', d2: 'M9.5 9.5a2.5 2.5 0 1 1 3.8 2.1c-.9.6-1.3 1.1-1.3 2.1M12 17h.01' },
  memory: { d: 'M4 8h7v12H4zM13 4h7v12h-7z', d2: 'M7.5 12.5h.01M16.5 9h.01' },
  verse: { d: 'M6 4h12v16l-6-3-6 3z', d2: 'M9 8h6M9 11h6' },
  sling: { d: 'M12 21v-8M12 13 7.5 6.5M12 13l4.5-6.5', d2: 'M7.5 6.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM16.5 6.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z' },
  run: { d: 'M14 5.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM6 21l4-6 3 2.5L15 12l2 2.5h3', d2: 'M10 9l4-1 1 4 3 1.5M10 9 8 12l-4-.5' },
  coins: { d: 'M12 13a7 3.2 0 1 0 0-6.4 7 3.2 0 0 0 0 6.4z', d2: 'M5 10v4c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2v-4M5 14v3c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2v-3' },
  gift: { d: 'M4 10h16v3H4zM5 13h14v7H5z', d2: 'M12 10v10M12 10c-2.5 0-4.5-1.3-4.5-3S9 4.5 12 7c3-2.5 4.5-1 4.5 0S14.5 10 12 10z' },
  family: { d: 'M8 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM16 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', d2: 'M3 19a5 5 0 0 1 10 0zM11 19a5 5 0 0 1 10 0zM12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
  plus: { d: 'M12 6v12M6 12h12' },
  close: { d: 'M7 7l10 10M17 7 7 17' },
  refresh: { d: 'M19 12a7 7 0 1 1-2-4.9', d2: 'M19 4v4h-4' },
  fire: { d: 'M12 21c-4 0-6.5-2.6-6.5-6 0-3.2 2.2-5 3.2-7.5 1 1.2 1.3 2.3 1.3 3.5C11.5 8.5 12 6 14.5 3c.5 3 3.5 5 3.5 9 0 4.4-2.6 9-6 9z', d2: 'M12 21c-1.8 0-3-1.3-3-3 0-1.5 1-2.3 1.6-3.6.8.8 1.4 1.5 2.9 1.8.4 1.6-.2 4.8-1.5 4.8z' },
};

export function Icon({ name, size = 22, tone, stroke, className = '', style }: { name: IconName; size?: number; tone?: string; stroke?: string; className?: string; style?: CSSProperties }) {
  const p = PATHS[name];
  const sc = stroke ?? 'currentColor';
  const fc = tone ?? 'rgba(255,255,255,0.22)';
  return (
    <svg className={`ico ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={style} fill="none" stroke={sc} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
      <path d={p.d} fill={fc} />
      {p.d2 && <path d={p.d2} fill="none" />}
    </svg>
  );
}
