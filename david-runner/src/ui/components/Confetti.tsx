import { useMemo, type CSSProperties } from 'react';

const COLORS = ['#ffd23f', '#ff6b6b', '#4cbf3f', '#2f8fe0', '#c77dff', '#ff9f1c', '#ffffff'];
const SHAPES = ['', '', '', '⭐', '✨'];

/** Chuva de confete (só CSS, some sozinha). */
export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        dur: 1.6 + Math.random() * 1.4,
        drift: (Math.random() * 2 - 1) * 90,
        spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
        color: COLORS[i % COLORS.length],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        w: 8 + Math.random() * 8,
      })),
    [count],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={p.shape ? 'confetti-star' : 'confetti-piece'}
          style={
            {
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              background: p.shape ? undefined : p.color,
              width: p.shape ? undefined : p.w,
              height: p.shape ? undefined : p.w * 0.45,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
            } as CSSProperties
          }
        >
          {p.shape}
        </span>
      ))}
    </div>
  );
}
