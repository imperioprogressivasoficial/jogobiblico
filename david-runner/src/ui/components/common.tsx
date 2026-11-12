import { useEffect, useState, type ReactNode } from 'react';
import { audio, type Sfx } from '../../game/AudioManager';
import { progression } from '../../state/ProgressionManager';
import { UIManager, fmt, useProgress } from '../UIManager';
import { Icon } from '../art/icons';

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

/** Denário de prata: moeda romana com o perfil de César e a coroa de louros. */
export function CoinIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="coin-icon">
      <circle cx="16" cy="16" r="15" fill="#8d97a8" />
      <circle cx="16" cy="16" r="12.5" fill="#e4e9f0" />
      <circle cx="16" cy="16" r="12.5" fill="none" stroke="#b7c0cd" strokeWidth="1.2" strokeDasharray="1.4 1.6" />
      <path d="M13 23c-1.5-2-2-4.5-1-7 .8-2.2 2.8-4 5.2-4 2 0 3.3 1.3 3.3 3 0 1-.5 1.7-.2 2.6l1 1.6-1.4.4c0 1.6-.8 2.6-2.4 2.6H15.5L15 23z" fill="#9aa5b6" />
      <path d="M12.2 14.5c1.4-.9 2.4-1.2 3.6-1M12 17c1.5-.9 2.6-1.1 3.6-.9" stroke="#5f8f45" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <ellipse cx="11.5" cy="10.5" rx="3" ry="1.6" fill="#fff" opacity=".7" transform="rotate(-35 11.5 10.5)" />
    </svg>
  );
}

/** Talento de ouro: a maior medida de dinheiro da Bíblia (lingote/disco dourado). */
export function RelicIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M5 21 9 11h14l4 10z" fill="#c98a0a" />
      <path d="M9 11h14l-2.2 6H11.2z" fill="#ffd23f" />
      <path d="M5 21h22l-2 4H7z" fill="#a86f05" />
      <path d="M11 12.5h5l-.8 2.5h-5z" fill="#fff6c2" opacity=".85" />
      <path d="M24 4l.9 2.1L27 7l-2.1.9L24 10l-.9-2.1L21 7l2.1-.9z" fill="#fff" />
    </svg>
  );
}

/** Tocar nas moedas explica de onde elas vêm (não há compra com dinheiro de verdade no app). */
function openCoinsInfo() {
  audio.play('ui');
  UIManager.go('coins-info');
}

export function Currency() {
  useProgress();
  const d = progression.data;
  return (
    <div className="currency">
      <button type="button" className="pill pill-btn pill-buy" data-testid="coins-total" title="Denários" onClick={openCoinsInfo}>
        <CoinIcon /> {fmt(d.coins)}
      </button>
      <button type="button" className="pill pill-btn pill-buy" data-testid="talents-total" title="Talentos" onClick={openCoinsInfo}>
        <RelicIcon /> {fmt(d.relics)}
      </button>
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
        <Icon name="back" size={24} />
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
