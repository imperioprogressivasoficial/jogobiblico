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

/**
 * Lobby simples (pensado para crianças de 4 a 6 anos): perfil, moedas, Loja, Mais,
 * a Aventura do Dia e um botão grande de JOGAR. O resto fica em "Mais".
 * Antes:
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
  // JOGAR é sempre a corrida: os outros jogos ficam em "Mais > Jogos"
  const run = MODES[0];
  const profile = d.profile;
  const [more, setMore] = useState(false);

  useEffect(() => {
    progression.ensureDailyMissions();
    progression.ensureDaily();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter') playMode(run);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run]);

  const go = (s: Screen) => {
    setMore(false);
    UIManager.go(s);
  };
  const avatar = getCharacter(profile?.avatar ?? d.selectedCharacter);
  const moreItems: { id: Screen; icon: IconName; label: string; testId: string; badge?: number }[] = [
    { id: 'journey', icon: 'journey', label: 'Histórias', testId: 'btn-journey', badge: unread },
    { id: 'modes', icon: 'modes', label: 'Jogos', testId: 'btn-modes' },
    { id: 'characters', icon: 'heroes', label: 'Heróis', testId: 'btn-characters' },
    { id: 'maps', icon: 'map', label: 'Mapas', testId: 'btn-maps' },
    { id: 'missions', icon: 'missions', label: 'Missões', testId: 'btn-missions', badge: claimable },
    { id: 'achievements', icon: 'trophy', label: 'Conquistas', testId: 'btn-achievements' },
    { id: 'parents', icon: 'family', label: 'Pais', testId: 'btn-parents-menu' },
    { id: 'settings', icon: 'settings', label: 'Ajustes', testId: 'btn-settings' },
  ];

  const [dailyOpen, setDailyOpen] = useState(false);
  const dl = d.daily;
  const dailyDone = [dl.story, dl.challenge_done, dl.run].filter(Boolean).length;
  const chestReady = dailyDone === 3 && !dl.chest;
  const side = (id: Screen, icon: IconName, label: string, testId: string, badge?: number, cls = '') => (
    <button key={testId} type="button" className={`lobby-round ${cls}`} onClick={() => go(id)} data-testid={testId} aria-label={label}>
      <Icon name={icon} size={26} />
      <small>{label}</small>
      {badge ? <span className="badge">{badge}</span> : null}
    </button>
  );

  return (
    <div className="screen menu lobby lobby-clean" data-testid="main-menu">
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

      <div className="lobby-col lobby-col-left">
        {side('shop', 'shop', 'Loja', 'btn-shop', undefined, 'lobby-round-shop')}
      </div>
      <div className="lobby-col lobby-col-right">
        <button type="button" className={`lobby-round ${more ? 'on' : ''}`} onClick={() => { audio.play('ui'); setMore(!more); }} data-testid="btn-more" aria-label="Mais">
          <Icon name="plus" size={26} />
          <small>Mais</small>
          {claimable + unread > 0 && <span className="badge">{claimable + unread}</span>}
        </button>
      </div>

      <div className="lobby-hero-name">
        <strong>{char.name}</strong>
        <small>{char.title}</small>
      </div>

      <button type="button" className={`daily-pill ${chestReady ? 'ready' : ''}`} onClick={() => { audio.play('ui'); setDailyOpen(true); }} data-testid="daily-card">
        <Icon name="star" size={16} tone="#ffd23f" stroke="#ffd23f" />
        <span>Aventura do Dia</span>
        <b>{dailyDone}/3</b>
        <span className="daily-pill-streak" data-testid="daily-streak">
          <Icon name="fire" size={14} tone="#ff9a2e" stroke="#ff6a1a" /> {dl.streak}
        </span>
        <Treasure kind="bau" size={28} />
      </button>

      <div className="lobby-play">
        <Btn variant="green" size="xl" onClick={() => playMode(run)} testId="btn-play" sfx={null} className="lobby-tap">
          JOGAR ▶
        </Btn>
      </div>

      {dailyOpen && (
        <div className="lobby-more" data-testid="daily-sheet">
          <div className="lobby-more-sheet lobby-daily-sheet">
            <DailyCard />
          </div>
          <button type="button" className="lobby-more-close" onClick={() => setDailyOpen(false)} aria-label="Fechar" />
        </div>
      )}

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
    { done: d.story, icon: 'journey' as const, label: 'História', short: 'Ouvir', sub: story.title, go: () => UIManager.startStoryRun(story), testId: 'daily-story' },
    { done: d.challenge_done, icon: mode.icon, label: 'Desafio', short: 'Jogar', sub: mode.name, go: () => playMode(mode), testId: 'daily-challenge' },
    { done: d.run, icon: run.icon, label: 'Corrida', short: 'Correr', sub: 'uma corridinha', go: () => playMode(run), testId: 'daily-run' },
  ];
  const next = steps.find((s) => !s.done);
  return (
    <div className="daily daily-compact daily-in-sheet">
      <div className="daily-row">
        <span className="daily-title">
          <Icon name="star" size={14} tone="#ffd23f" stroke="#ffd23f" /> Aventura do Dia
        </span>
        <span className="daily-next">{next ? `${next.label}: ${next.sub}` : all && !d.chest ? 'Abra o baú!' : 'Completa ✔'}</span>
        <span className="daily-streak" data-testid="daily-streak">
          <Icon name="fire" size={14} tone="#ff9a2e" stroke="#ff6a1a" /> {d.streak}
        </span>
      </div>
      <div className="daily-steps">
        {steps.map((s) => (
          <button key={s.label} type="button" className={`daily-step ${s.done ? 'done' : ''} ${next === s ? 'next' : ''}`} data-testid={s.testId} title={`${s.label}: ${s.sub}`} onClick={() => (s.done ? undefined : s.go())}>
            <span className="daily-step-icon">{s.done ? <Icon name="check" size={18} stroke="#fff" tone="none" /> : <Icon name={s.icon} size={18} />}</span>
            <small>{s.short}</small>
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
              Você completou a Aventura do Dia e ganhou {reward.coins} denários{reward.talents ? ` e ${reward.talents} talento` : ''}. Volte amanhã para manter a sequência!
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
