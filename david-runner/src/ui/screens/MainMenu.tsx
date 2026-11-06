import { useEffect, useState } from 'react';
import { getCharacter } from '../../data/characters';
import { getMap } from '../../data/maps';
import { MODES } from '../../data/modes';
import { progression } from '../../state/ProgressionManager';
import { Btn, Currency, RelicIcon } from '../components/common';
import { UIManager, fmt, useProgress } from '../UIManager';
import { playMode } from './ModesScreen';
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
  const map = getMap(d.selectedMap);
  const claimable = d.missions.list.filter((m) => m.progress >= m.target && !m.claimed).length;
  const unread = progression.unreadStories().length;
  const mode = MODES.find((m) => m.id === UIManager.selectedMode) ?? MODES[0];
  const feat = featuredToday().skins[0];
  const [left, setLeft] = useState(untilMidnight());
  const profile = d.profile;

  useEffect(() => {
    progression.ensureDailyMissions();
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
      <header className="lobby-top">
        <button type="button" className="lobby-profile" onClick={() => UIManager.go('settings')} data-testid="lobby-profile">
          <span className="lobby-avatar" style={{ background: avatar.look.tunic, borderColor: avatar.look.tunicTrim }}>
            {avatar.name[0]}
          </span>
          <span className="lobby-name">
            <strong>{profile?.childName ?? 'Jogador'}</strong>
            <small>Recorde {fmt(d.stats.bestScore)}</small>
          </span>
        </button>
        <div className="lobby-top-right">
          <Currency />
          <Btn variant="wood" size="sm" onClick={() => UIManager.go('settings')} title="Configurações" testId="btn-settings">
            ⚙️
          </Btn>
        </div>
      </header>

      <nav className="lobby-tabs">
        <button type="button" className="lobby-tab on">
          🏠 Início
        </button>
        <button type="button" className="lobby-tab" onClick={() => UIManager.go('modes')} data-testid="btn-modes">
          🎮 Modos
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
          🛒 Loja<span className="lobby-new">NOVO</span>
        </button>
        <button type="button" className="lobby-tab" onClick={() => UIManager.go('journey')} data-testid="btn-journey">
          📖 Jornada
          {unread > 0 && (
            <span className="badge badge-new" data-testid="journey-unread">
              {unread}
            </span>
          )}
        </button>
        <button type="button" className="lobby-tab" onClick={() => UIManager.go('characters')} data-testid="btn-characters">
          🧑 Heróis
        </button>
      </nav>

      <div className="lobby-side lobby-left">
        <button type="button" className="lobby-mini" onClick={() => UIManager.go('missions')} data-testid="btn-missions">
          <span>🎯</span>Missões
          {claimable > 0 && <span className="badge">{claimable}</span>}
        </button>
        <button type="button" className="lobby-mini" onClick={() => UIManager.go('achievements')} data-testid="btn-achievements">
          <span>🏆</span>Conquistas
        </button>
        <button type="button" className="lobby-mini" onClick={() => UIManager.go('records')} data-testid="btn-records">
          <span>📊</span>Recordes
        </button>
        <button type="button" className="lobby-mini" onClick={() => UIManager.go('maps')} data-testid="btn-maps">
          <span>{map.emoji}</span>Mapas
        </button>
        <button
          type="button"
          className="lobby-mini lobby-power"
          title={`Poder equipado: ${progression.equippedPower.name}`}
          data-testid="chariot-charges"
          onClick={() => {
            UIManager.shopTab = 'poderes';
            UIManager.go('shop');
          }}
        >
          <span>{progression.equippedPower.icon}</span>
          {progression.chariotCharges}
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
        <span className="lsc-head">⭐ Loja do Dia</span>
        {feat && (
          <span className="lsc-item" style={{ background: { ...feat.c.look, ...feat.s.look }.tunic }}>
            <span className="lsc-ribbon">-40%</span>
            <span className="lsc-face">{feat.c.name[0]}</span>
          </span>
        )}
        {feat && <span className="lsc-name">{feat.s.name}</span>}
        {feat && (
          <span className="lsc-price">
            <RelicIcon size={14} /> {feat.price}
          </span>
        )}
        <span className="lsc-timer">⏱️ {left}</span>
      </button>

      <div className="lobby-bottom">
        <div className="lobby-hero-name">
          <strong>{char.name}</strong>
          <small>{char.title}</small>
        </div>
        <div className="lobby-play">
          <button type="button" className="lobby-mode" onClick={() => UIManager.go('modes')} data-testid="lobby-mode">
            <span className="lobby-mode-icon" style={{ background: `linear-gradient(160deg, ${mode.colors[0]}, ${mode.colors[1]})` }}>
              {mode.icon}
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
