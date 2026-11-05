import { useEffect } from 'react';
import { getCharacter } from '../../data/characters';
import { getMap } from '../../data/maps';
import { progression } from '../../state/ProgressionManager';
import { Btn, Currency, Logo } from '../components/common';
import { UIManager, fmt, useProgress } from '../UIManager';

export function MainMenu() {
  useProgress();
  const d = progression.data;
  const char = getCharacter(d.selectedCharacter);
  const map = getMap(d.selectedMap);
  const claimable = d.missions.list.filter((m) => m.progress >= m.target && !m.claimed).length;
  const unread = progression.unreadStories().length;

  useEffect(() => {
    progression.ensureDailyMissions();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter') UIManager.startRun();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="screen menu" data-testid="main-menu">
      <header className="menu-top">
        <div className="menu-top-left">
          <Currency />
          <span className="pill pill-fire" title="Cargas da Carruagem de Fogo" data-testid="chariot-charges">
            🔥 {d.chariot.charges}
          </span>
        </div>
        <Btn variant="wood" size="sm" onClick={() => UIManager.go('settings')} title="Configurações" testId="btn-settings">
          ⚙️
        </Btn>
      </header>

      <Logo small />

      <div className="menu-side menu-left">
        <Btn variant="wood" onClick={() => UIManager.go('characters')} testId="btn-characters">
          <span className="ico">🧑</span>Heróis
        </Btn>
        <Btn variant="wood" onClick={() => UIManager.go('maps')} testId="btn-maps">
          <span className="ico">🗺️</span>Mapas
        </Btn>
        <Btn variant="wood" onClick={() => UIManager.go('shop')} testId="btn-shop">
          <span className="ico">🛒</span>Loja
        </Btn>
      </div>
      <div className="menu-side menu-right">
        <Btn variant="wood" onClick={() => UIManager.go('missions')} testId="btn-missions">
          <span className="ico">📅</span>Missões
          {claimable > 0 && <span className="badge">{claimable}</span>}
        </Btn>
        <Btn variant="wood" onClick={() => UIManager.go('achievements')} testId="btn-achievements">
          <span className="ico">🏆</span>Conquistas
        </Btn>
        <Btn variant="wood" onClick={() => UIManager.go('records')} testId="btn-records">
          <span className="ico">📊</span>Recordes
        </Btn>
      </div>

      <div className="menu-bottom">
        <Btn variant="blue" size="lg" className="btn-journey" onClick={() => UIManager.go('journey')} testId="btn-journey">
          <span className="ico">📖</span>Jornada Bíblica
          {unread > 0 && (
            <span className="badge badge-new" data-testid="journey-unread">
              {unread}
            </span>
          )}
        </Btn>
        <div className="menu-info">
          <span>
            <strong>{char.name}</strong> · {map.emoji} {map.name}
          </span>
          <span>Recorde: {fmt(d.stats.bestScore)} pts</span>
        </div>
        <Btn variant="green" size="xl" onClick={() => UIManager.startRun()} testId="btn-play" sfx="buy">
          JOGAR
        </Btn>
      </div>
    </div>
  );
}
