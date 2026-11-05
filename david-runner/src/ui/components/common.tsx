import { useEffect, useState, type ReactNode } from 'react';
import { audio, type Sfx } from '../../game/AudioManager';
import { progression } from '../../state/ProgressionManager';
import { UIManager, fmt, useProgress } from '../UIManager';

export function Btn(props: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'gold' | 'green' | 'blue' | 'wood' | 'red' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  sfx?: Sfx | null;
  className?: string;
  title?: string;
  testId?: string;
}) {
  const { variant = 'gold', size = 'md', sfx = 'ui' } = props;
  return (
    <button
      type="button"
      title={props.title}
      aria-label={props.title}
      data-testid={props.testId}
      className={`btn btn-${variant} btn-${size} ${props.className ?? ''}`}
      disabled={props.disabled}
      onClick={() => {
        audio.unlock();
        if (sfx) audio.play(sfx);
        props.onClick?.();
      }}
    >
      {props.children}
    </button>
  );
}

export function CoinIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="coin-icon">
      <circle cx="16" cy="16" r="15" fill="#e8a514" />
      <circle cx="16" cy="16" r="12" fill="#ffd23f" />
      <path d="M9 20h14l1.5-9-4.5 3.5L16 9l-4 5.5L7.5 11z" fill="#fff1a0" stroke="#c98a0a" strokeWidth="1" />
    </svg>
  );
}

export function RelicIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2 28 12 16 30 4 12z" fill="#9b4bd9" />
      <path d="M16 2 22 12 16 30 10 12z" fill="#c77dff" />
      <path d="M4 12h24L16 2z" fill="#e2b3ff" opacity=".7" />
    </svg>
  );
}

export function Currency() {
  useProgress();
  const d = progression.data;
  return (
    <div className="currency">
      <span className="pill" data-testid="coins-total">
        <CoinIcon /> {fmt(d.coins)}
      </span>
      <span className="pill">
        <RelicIcon /> {fmt(d.relics)}
      </span>
      <span className="pill pill-mult" title="Multiplicador de pontuação">
        x{progression.baseMultiplier}
      </span>
    </div>
  );
}

export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="topbar">
      <Btn variant="wood" size="sm" sfx={null} onClick={() => UIManager.back()} title="Voltar" testId="back">
        ←
      </Btn>
      <h2 className="sign-title">{title}</h2>
      <div className="topbar-right">{right ?? <Currency />}</div>
    </header>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={`logo ${small ? 'logo-small' : ''}`} aria-label="DAVID RUNNER — Corra pela História">
      <div className="logo-crown">👑</div>
      <div className="logo-board">
        <div className="logo-david">DAVID</div>
        <div className="logo-runner">RUNNER</div>
      </div>
      <div className="logo-ribbon">CORRA PELA HISTÓRIA</div>
    </div>
  );
}

export function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div className="progress">
      <div className="progress-fill" style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
      {label && <span className="progress-label">{label}</span>}
    </div>
  );
}

/** Notificações flutuantes (conquistas, missões, desbloqueios). */
export function Toasts() {
  const v = useProgress();
  const [items, setItems] = useState<{ id: number; icon: string; title: string; text: string }[]>([]);
  useEffect(() => {
    const t = progression.takeToasts();
    if (!t.length) return;
    const now = Date.now();
    setItems((old) => [...old, ...t.map((x, i) => ({ ...x, id: now + i }))]);
    audio.play('achievement');
  }, [v]);
  useEffect(() => {
    if (!items.length) return;
    const h = setTimeout(() => setItems((old) => old.slice(1)), 3200);
    return () => clearTimeout(h);
  }, [items]);
  return (
    <div className="toasts" aria-live="polite">
      {items.slice(0, 3).map((t) => (
        <div key={t.id} className="toast">
          <span className="toast-icon">{t.icon}</span>
          <div>
            <strong>{t.title}</strong>
            <div className="toast-text">{t.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
