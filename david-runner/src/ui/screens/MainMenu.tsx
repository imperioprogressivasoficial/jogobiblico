import { useEffect, useState } from 'react';
import { audio } from '../../game/AudioManager';
import { Confetti } from '../components/Confetti';
import { NpcBubbles } from '../components/NpcBubbles';
import { getCharacter } from '../../data/characters';
import { MODES } from '../../data/modes';
import { progression } from '../../state/ProgressionManager';
import { Btn, Currency, RelicIcon } from '../components/common';
import { UIManager, fmt, useProgress } from '../UIManager';
import { playMode } from './ModesScreen';
import { Portrait } from '../art/Portrait';
import { Icon } from '../art/icons';
import { Treasure } from '../art/Treasure';
import { featuredToday } from './ShopScreen';

function untilMidnight(): string {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const m = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60000));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}min`;
}

/**
 * Lobby: herói no centro (cena 3D por trás), conta e moedas no topo,
 * abas de navegação, a Loja do Dia sempre visível e o botão JOGAR com o modo escolhido.
 */
export function MainMenu() {
  useProgress();
  const d = progression.data;
  const char = getCharacter(d.selectedCharacter);
  const claimable = d.missions.list.filter((m) => m.progress >= m.target && !m.claimed).length;
  const unread = progression.unreadStories().length;
  const mode = MODES.find((m) => m.id === UIManager.selectedMode) ?? MODES[0];
  const feat = featuredToday().skins[0];
  const [left, setLeft] = useState(untilMidnight());
  const profile = d.profile;

  useEffect(() => {
    progression.ensureDailyMissions();
    progression.ensureDaily();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter') playMode(mode);
    };
    window.addEventListener('keydown', onKey);
    const h = window.setInterval(() => setLeft(untilMidnight()), 30000);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearInterval(h);
    };
  }, [mode]);

  const avatar = getCharacter(profile?.avatar ?? d.selectedCharacter);
  return (
    <div className="screen menu lobby" data-testid="main-menu">
      <NpcBubbles />
      <header className="lobby-top">
        <button type="button" className="lobby-profile" onClick={() => UIManager.go('parents')} data-testid="lobby-profile">
          <Portrait charId={avatar.id} skinId={d.selectedSkin[avatar.id] ?? 'padrao'} size={44} className="lobby-avatar" />
          <span className="lobby-name">
            <strong>{profile?.childName ?? 'Jogador'}</strong>
            <small>Recorde {fmt(d.stats.bestScore)}</small>
          </span>
        </button>
        <div className="lobby-top-right">
          <Currency />
        <button
          type="button"
          className="pill pill-btn pill-fire"
          title={`Poder equipado: ${progression.equippedPower.name}`}
          data-testid="chariot-charges"
          onClick={() => {
            UIManager.shopTab = 'poderes';
            UIManager.go('shop');
          }}
        >
          {progression.equippedPower.icon} {progression.chariotCharges}
        </button>

          <Btn variant="wood" size="sm" onClick={() => UIManager.go('settings')} title="Configurações" testId="btn-settings">
            <Icon name="settings" size={24} />
          </Btn>
        </div>
      </header>

      <nav className="lobby-tabs">
        <button type="button" className="lobby-tab on">
          <Icon name="home" size={20} tone="rgba(43,26,74,0.18)" /> Início
        </button>
        <button type="button" className="lobby-tab" onClick={() => UIManager.go('modes')} data-testid="btn-modes">
          <Icon name="modes" size={20} /> Modos
        </button>
        <button
          type="button"
          className="lobby-tab lobby-tab-shop"
          onClick={() => {
            UIManager.shopTab = 'destaque';
            UIManager.go('shop');
          }}
          data-testid="btn-shop"
        >
          <Icon name="shop" size={20} /> Loja<span className="lobby-new">NOVO</span>
        </button>
        <button type="button" className="lobby-tab" onClick={() => UIManager.go('journey')} data-testid="btn-journey">
          <Icon name="journey" size={20} /> Jornada
          {unread > 0 && (
            <span className="badge badge-new" data-testid="journey-unread">
              {unread}
            </span>
          )}
        </button>
        <button type="button" className="lobby-tab" onClick={() => UIManager.go('characters')} data-testid="btn-characters">
          <Icon name="heroes" size={20} /> Heróis
        </button>
      </nav>

      <div className="lobby-side lobby-left">
        <button type="button" className="lobby-mini" onClick={() => UIManager.go('missions')} data-testid="btn-missions">
          <span><Icon name="missions" size={26} tone="#ff8a5c" /></span>Missões
          {claimable > 0 && <span className="badge">{claimable}</span>}
        </button>
        <button type="button" className="lobby-mini" onClick={() => UIManager.go('achievements')} data-testid="btn-achievements">
          <span><Icon name="trophy" size={26} tone="#ffd23f" /></span>Conquistas
        </button>
        <button type="button" className="lobby-mini" onClick={() => UIManager.go('records')} data-testid="btn-records">
          <span><Icon name="records" size={26} tone="#7ee0ff" /></span>Recordes
        </button>
        <button type="button" className="lobby-mini" onClick={() => UIManager.go('maps')} data-testid="btn-maps">
          <span><Icon name="map" size={26} tone="#9cf07a" /></span>Mapas
        </button>
      </div>

      <button
        type="button"
        className="lobby-shopcard"
        onClick={() => {
          UIManager.shopTab = 'destaque';
          UIManager.go('shop');
        }}
        data-testid="lobby-shopcard"
      >
        <span className="lsc-head">
          <Icon name="star" size={16} tone="#ffd23f" stroke="#ffd23f" /> Loja do Dia
        </span>
        {feat && (
          <span className="lsc-item">
            <span className="lsc-ribbon">-40%</span>
            <Portrait charId={feat.c.id} skinId={feat.s.id} size={84} shape="rounded" />
          </span>
        )}
        {feat && <span className="lsc-name">{feat.s.name}</span>}
        {feat && (
          <span className="lsc-price">
            <RelicIcon size={14} /> {feat.price}
          </span>
        )}
        <span className="lsc-timer">
          <Icon name="timer" size={12} /> {left}
        </span>
      </button>

      <DailyCard />

      <div className="lobby-bottom">
        <div className="lobby-hero-name">
          <strong>{char.name}</strong>
          <small>{char.title}</small>
        </div>
        <div className="lobby-play">
          <button type="button" className="lobby-mode" onClick={() => UIManager.go('modes')} data-testid="lobby-mode">
            <span className="lobby-mode-icon" style={{ background: `linear-gradient(160deg, ${mode.colors[0]}, ${mode.colors[1]})` }}>
              <Icon name={mode.icon} size={26} />
            </span>
            <span>
              <small>Modo</small>
              <strong>{mode.name}</strong>
            </span>
            <span className="lobby-mode-change">trocar</span>
          </button>
          <Btn variant="green" size="xl" onClick={() => playMode(mode)} testId="btn-play" sfx={null}>
            JOGAR
          </Btn>
        </div>
      </div>
    </div>
  );
}

/** Jornada do Dia: história → desafio → corrida, com o Baú do Dia e a sequência de dias. */
function DailyCard() {
  const d = progression.data.daily;
  const story = progression.dailyStory();
  const mode = MODES.find((m) => m.id === d.challenge) ?? MODES[1];
  const run = MODES[0];
  const all = d.story && d.challenge_done && d.run;
  const [reward, setReward] = useState<{ coins: number; talents: number } | null>(null);
  const steps = [
    { done: d.story, icon: 'journey' as const, label: 'História', sub: story.title, go: () => UIManager.startStoryRun(story), testId: 'daily-story' },
    { done: d.challenge_done, icon: mode.icon, label: 'Desafio', sub: mode.name, go: () => playMode(mode), testId: 'daily-challenge' },
    { done: d.run, icon: run.icon, label: 'Corrida', sub: '150 m ou mais', go: () => playMode(run), testId: 'daily-run' },
  ];
  const next = steps.find((s) => !s.done);
  return (
    <div className="daily" data-testid="daily-card">
      <div className="daily-head">
        <strong>
          <Icon name="star" size={16} tone="#ffd23f" stroke="#ffd23f" /> Jornada do Dia
        </strong>
        <span className="daily-streak" data-testid="daily-streak">
          <Icon name="fire" size={16} tone="#ff9a2e" stroke="#ff6a1a" /> {d.streak} {d.streak === 1 ? 'dia' : 'dias'}
        </span>
      </div>
      <div className="daily-steps">
        {steps.map((s, i) => (
          <button key={s.label} type="button" className={`daily-step ${s.done ? 'done' : ''} ${next === s ? 'next' : ''}`} data-testid={s.testId} onClick={() => (s.done ? undefined : s.go())}>
            <span className="daily-step-icon">{s.done ? <Icon name="check" size={20} stroke="#fff" tone="none" /> : <Icon name={s.icon} size={20} />}</span>
            <span className="daily-step-text">
              <small>
                {i + 1}. {s.label}
              </small>
              <strong>{s.sub}</strong>
            </span>
          </button>
        ))}
        <button
          type="button"
          className={`daily-chest ${all && !d.chest ? 'ready' : ''} ${d.chest ? 'open' : ''}`}
          data-testid="daily-chest"
          disabled={!all || d.chest}
          onClick={() => {
            const r = progression.openChest();
            if (!r) return;
            audio.play('victory');
            setReward(r);
          }}
        >
          <Treasure kind={d.chest ? 'bau' : 'bau'} size={44} />
          <small>{d.chest ? 'Aberto' : all ? 'Abrir!' : 'Baú'}</small>
        </button>
      </div>
      {reward && (
        <div className="overlay" onClick={() => setReward(null)} data-testid="daily-reward">
          <Confetti />
          <div className="panel center">
            <Treasure kind="bau" size={100} />
            <h2 className="sign-title">Baú do Dia!</h2>
            <p>
              Você completou a Jornada do Dia e ganhou {reward.coins} denários{reward.talents ? ` e ${reward.talents} talento` : ''}. Volte amanhã para manter a sequência!
            </p>
            <Btn variant="green" onClick={() => setReward(null)}>
              Oba! ✔
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
