import { useEffect, useState } from 'react';
import { audio } from '../../game/AudioManager';
import { Confetti } from '../components/Confetti';
import { NpcBubbles } from '../components/NpcBubbles';
import { getCharacter } from '../../data/characters';
import { MODES } from '../../data/modes';
import { progression } from '../../state/ProgressionManager';
import { Btn, Currency } from '../components/common';
import { UIManager, useProgress, type Screen } from '../UIManager';
import { playMode } from './ModesScreen';
import { Portrait } from '../art/Portrait';
import { Icon, type IconName } from '../art/icons';
import { Treasure } from '../art/Treasure';
import { featuredToday } from './ShopScreen';

/**
 * Lobby, com pouca coisa na tela de uma vez:
 * - topo: perfil e moedas;
 * - centro: o herói (3D) com um só cartão pequeno da Loja do Dia;
 * - embaixo: a Jornada do Dia em uma linha, o modo + JOGAR e a barra de navegação.
 * O resto (heróis, mapas, missões, conquistas, recordes, pais, configurações) fica em "Mais".
 */
export function MainMenu() {
  useProgress();
  const d = progression.data;
  const char = getCharacter(d.selectedCharacter);
  const claimable = d.missions.list.filter((m) => m.progress >= m.target && !m.claimed).length;
  const unread = progression.unreadStories().length;
  const mode = MODES.find((m) => m.id === UIManager.selectedMode) ?? MODES[0];
  const feat = featuredToday().skins[0];
  const profile = d.profile;
  const [more, setMore] = useState(false);

  useEffect(() => {
    progression.ensureDailyMissions();
    progression.ensureDaily();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter') playMode(mode);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  const go = (s: Screen) => {
    setMore(false);
    UIManager.go(s);
  };
  const avatar = getCharacter(profile?.avatar ?? d.selectedCharacter);
  const moreItems: { id: Screen; icon: IconName; label: string; testId: string; badge?: number }[] = [
    { id: 'maps', icon: 'map', label: 'Mapas', testId: 'btn-maps' },
    { id: 'missions', icon: 'missions', label: 'Missões', testId: 'btn-missions', badge: claimable },
    { id: 'achievements', icon: 'trophy', label: 'Conquistas', testId: 'btn-achievements' },
    { id: 'records', icon: 'records', label: 'Recordes', testId: 'btn-records' },
    { id: 'parents', icon: 'family', label: 'Pais', testId: 'btn-parents-menu' },
    { id: 'settings', icon: 'settings', label: 'Ajustes', testId: 'btn-settings' },
  ];

  return (
    <div className="screen menu lobby" data-testid="main-menu">
      <NpcBubbles />
      <header className="lobby-top">
        <button type="button" className="lobby-profile" onClick={() => UIManager.go('parents')} data-testid="lobby-profile">
          <Portrait charId={avatar.id} skinId={d.selectedSkin[avatar.id] ?? 'padrao'} size={40} className="lobby-avatar" />
          <span className="lobby-name">
            <strong>{profile?.childName ?? 'Jogador'}</strong>
          </span>
        </button>
        <Currency />
      </header>

      <button
        type="button"
        className="lobby-shopcard lobby-shopcard-mini"
        onClick={() => {
          UIManager.shopTab = 'destaque';
          UIManager.go('shop');
        }}
        data-testid="lobby-shopcard"
      >
        {feat && (
          <span className="lsc-item">
            <span className="lsc-ribbon">-40%</span>
            <Portrait charId={feat.c.id} skinId={feat.s.id} size={54} shape="rounded" />
          </span>
        )}
        <span className="lsc-head">Loja do Dia</span>
      </button>

      <div className="lobby-hero-name">
        <strong>{char.name}</strong>
        <small>{char.title}</small>
      </div>

      <DailyCard />

      <div className="lobby-play">
        <div className="lobby-play-row">
          <button type="button" className="lobby-mode" onClick={() => UIManager.go('modes')} data-testid="lobby-mode">
            <span className="lobby-mode-icon" style={{ background: `linear-gradient(160deg, ${mode.colors[0]}, ${mode.colors[1]})` }}>
              <Icon name={mode.icon} size={22} />
            </span>
            <span>
              <small>Modo</small>
              <strong>{mode.name}</strong>
            </span>
          </button>
          <button
            type="button"
            className="pill pill-btn pill-fire lobby-power"
            title={`Poder equipado: ${progression.equippedPower.name}`}
            data-testid="chariot-charges"
            onClick={() => {
              UIManager.shopTab = 'poderes';
              UIManager.go('shop');
            }}
          >
            {progression.equippedPower.icon} {progression.chariotCharges}
          </button>
        </div>
        <Btn variant="green" size="xl" onClick={() => playMode(mode)} testId="btn-play" sfx={null}>
          JOGAR
        </Btn>
      </div>

      <nav className="lobby-nav">
        <button type="button" className="lobby-nav-item on">
          <Icon name="home" size={24} tone="rgba(255,255,255,0.25)" />
          <small>Início</small>
        </button>
        <button type="button" className="lobby-nav-item" onClick={() => go('modes')} data-testid="btn-modes">
          <Icon name="modes" size={24} />
          <small>Modos</small>
        </button>
        <button
          type="button"
          className="lobby-nav-item lobby-nav-shop"
          onClick={() => {
            UIManager.shopTab = 'destaque';
            go('shop');
          }}
          data-testid="btn-shop"
        >
          <Icon name="shop" size={26} />
          <small>Loja</small>
        </button>
        <button type="button" className="lobby-nav-item" onClick={() => go('journey')} data-testid="btn-journey">
          <Icon name="journey" size={24} />
          <small>Jornada</small>
          {unread > 0 && (
            <span className="badge badge-new" data-testid="journey-unread">
              {unread}
            </span>
          )}
        </button>
        <button type="button" className="lobby-nav-item" onClick={() => go('characters')} data-testid="btn-characters">
          <Icon name="heroes" size={24} />
          <small>Heróis</small>
        </button>
        <button type="button" className={`lobby-nav-item ${more ? 'on' : ''}`} onClick={() => { audio.play('ui'); setMore(!more); }} data-testid="btn-more">
          <Icon name="plus" size={24} />
          <small>Mais</small>
          {claimable > 0 && <span className="badge">{claimable}</span>}
        </button>
      </nav>

      {more && (
        <div className="lobby-more" data-testid="lobby-more">
          <div className="lobby-more-sheet">
            {moreItems.map((it) => (
              <button key={it.id} type="button" className="lobby-more-item" onClick={() => go(it.id)} data-testid={it.testId}>
                <Icon name={it.icon} size={26} />
                <small>{it.label}</small>
                {it.badge ? <span className="badge">{it.badge}</span> : null}
              </button>
            ))}
          </div>
          <button type="button" className="lobby-more-close" onClick={() => setMore(false)} aria-label="Fechar" />
        </div>
      )}
    </div>
  );
}

/** Jornada do Dia, em uma linha: três passos, o baú e a sequência. O próximo passo pisca. */
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
    { done: d.run, icon: run.icon, label: 'Corrida', sub: '150 m', go: () => playMode(run), testId: 'daily-run' },
  ];
  const next = steps.find((s) => !s.done);
  return (
    <div className="daily daily-compact" data-testid="daily-card">
      <div className="daily-row">
        <span className="daily-title">
          <Icon name="star" size={14} tone="#ffd23f" stroke="#ffd23f" /> Jornada do Dia
        </span>
        <span className="daily-next">{next ? `${next.label}: ${next.sub}` : all && !d.chest ? 'Abra o baú!' : 'Completa ✔'}</span>
        <span className="daily-streak" data-testid="daily-streak">
          <Icon name="fire" size={14} tone="#ff9a2e" stroke="#ff6a1a" /> {d.streak}
        </span>
      </div>
      <div className="daily-steps">
        {steps.map((s, i) => (
          <button key={s.label} type="button" className={`daily-step ${s.done ? 'done' : ''} ${next === s ? 'next' : ''}`} data-testid={s.testId} title={`${s.label}: ${s.sub}`} onClick={() => (s.done ? undefined : s.go())}>
            <span className="daily-step-icon">{s.done ? <Icon name="check" size={18} stroke="#fff" tone="none" /> : <Icon name={s.icon} size={18} />}</span>
            <small>{i + 1}</small>
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
          <Treasure kind="bau" size={34} />
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
