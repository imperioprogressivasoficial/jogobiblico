import { useCallback, useEffect, useRef, useState } from 'react';
import { audio } from '../../game/AudioManager';
import type { HudData, PowerType } from '../../game/GameEngine';
import type { RunStats } from '../../game/ScoreManager';
import { getMap } from '../../data/maps';
import type { StoryEpisode } from '../../data/story';
import { MISSION_POOL, REVIVE_COST } from '../../data/progression';
import { progression, type RunSummary } from '../../state/ProgressionManager';
import { Btn, CoinIcon, Progress } from '../components/common';
import { StoryReader } from '../components/StoryReader';
import { StoryScene, eraInfo } from '../components/StoryScene';
import { UIManager, fmt, useProgress } from '../UIManager';

type Phase = 'playing' | 'paused' | 'countdown' | 'revive' | 'results';

const POWER_INFO: Record<PowerType, { icon: string; name: string; color: string }> = {
  magnet: { icon: '🧲', name: 'Ímã de Moedas', color: '#e2574c' },
  double: { icon: '🎵', name: 'Harpa Dourada x2', color: '#f2c13a' },
  shield: { icon: '🛡️', name: 'Escudo da Fé', color: '#4fa3ff' },
};

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

const HINTS = isTouch
  ? ['Deslize ⟵ ⟶ para trocar de pista', 'Deslize para cima ↑ para pular', 'Deslize para baixo ↓ para deslizar', 'Pegue 📜 pergaminhos para revelar histórias da Bíblia!']
  : ['Use ← → ou A / D para trocar de pista', '↑, W ou Espaço para pular', '↓ ou S para deslizar', 'Pegue 📜 pergaminhos para revelar histórias da Bíblia!'];
const CHARIOT_HINT = isTouch ? '🔥 Toque duas vezes na tela para chamar a Carruagem de Fogo!' : '🔥 Aperte E (ou toque duas vezes) para chamar a Carruagem de Fogo!';

export function GameScreen() {
  useProgress();
  const engine = UIManager.engine!;
  const [phase, setPhase] = useState<Phase>('playing');
  const [countdown, setCountdown] = useState(0);
  const [powers, setPowers] = useState<HudData['powers']>([]);
  const [banner, setBanner] = useState<{ id: number; text: string } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [boost, setBoost] = useState<HudData['boost']>({ remaining: 0, total: 1, charges: progression.data.chariot.charges });
  const [reading, setReading] = useState<StoryEpisode | null>(null);
  const readingRef = useRef(false);
  readingRef.current = !!reading;
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [reviveLeft, setReviveLeft] = useState(0);
  const revivesUsed = useRef(0);
  const pendingStats = useRef<RunStats | null>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const coinsRef = useRef<HTMLSpanElement>(null);
  const multRef = useRef<HTMLSpanElement>(null);
  const toastedMissions = useRef(new Set<number>());
  const [runId, setRunId] = useState(0);

  const showBanner = useCallback((text: string) => setBanner({ id: Date.now() + Math.random(), text }), []);

  // HUD atualizado direto no DOM (sem re-render a cada quadro)
  useEffect(() => {
    let last = { d: -1, s: -1, c: -1, m: -1, pk: '', bk: '' };
    let tick = 0;
    return engine.onFrame((hud) => {
      if (hud.distance !== last.d && distRef.current) distRef.current.textContent = `${fmt(hud.distance)} m`;
      if (hud.score !== last.s && scoreRef.current) scoreRef.current.textContent = fmt(hud.score);
      if (hud.coins !== last.c && coinsRef.current) coinsRef.current.textContent = fmt(hud.coins);
      if (hud.multiplier !== last.m && multRef.current) multRef.current.textContent = `x${hud.multiplier}`;
      last = { d: hud.distance, s: hud.score, c: hud.coins, m: hud.multiplier, pk: last.pk, bk: last.bk };
      if (++tick % 6 === 0) {
        const key = hud.powers.map((p) => `${p.type}${Math.ceil(p.remaining * 4)}`).join();
        if (key !== last.pk) {
          last.pk = key;
          setPowers(hud.powers.map((p) => ({ ...p })));
        }
        const b = hud.boost;
        const bk = `${b.charges}:${Math.ceil(b.remaining * 4)}`;
        if (bk !== last.bk) {
          last.bk = bk;
          setBoost({ ...b });
        }
      }
    });
  }, [engine]);

  // eventos do motor
  useEffect(() => {
    const offs = [
      engine.on('gameover', (stats) => {
        pendingStats.current = stats;
        const cost = REVIVE_COST[revivesUsed.current];
        if (cost !== undefined && progression.data.coins + stats.coins >= cost) {
          setReviveLeft(5);
          setPhase('revive');
        } else {
          finalize(stats);
        }
      }),
      engine.on('pickup', (e) => {
        if (e.type === 'scroll') {
          // cada pergaminho revela a próxima história (as desta corrida ainda não foram salvas)
          const story = progression.nextLockedStory(Math.max(0, engine.score.run.scrolls - 1));
          showBanner(story ? `📜 Nova história: ${story.title}!` : '📜 Pergaminho encontrado! +100 moedas');
        }
        else if (e.type === 'relic') showBanner('💎 Relíquia rara encontrada!');
        else if (e.type !== 'coin') showBanner(`${POWER_INFO[e.type].icon} ${POWER_INFO[e.type].name}`);
      }),
      engine.on('stumble', () => showBanner('⚠️ Cuidado!')),
      engine.on('shieldBreak', () => showBanner('🛡️ O escudo te protegeu!')),
      engine.on('boost', () => {
        progression.useChariotCharge();
        showBanner('🔥 Carruagem de Fogo!');
        setBoost({ remaining: engine.chariot.remaining, total: engine.chariot.duration, charges: engine.chariot.charges });
      }),
      engine.on('boostDenied', () => {
        audio.play('error');
        showBanner('🔥 Sem cargas! Ganhe nas missões ou na loja.');
      }),
      engine.on('mode', (m) => {
        if (m === 'paused') setPhase((p) => (p === 'playing' ? 'paused' : p));
      }),
    ];
    return () => offs.forEach((o) => o());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // dicas de controle nas primeiras corridas
  useEffect(() => {
    const d = progression.data;
    if (!(d.settings.showHints && d.stats.totalRuns < 3)) return;
    const timers: number[] = [];
    HINTS.forEach((h, i) => timers.push(window.setTimeout(() => setHint(h), 400 + i * 2600)));
    // por último, a Carruagem de Fogo (fica um pouco mais na tela)
    timers.push(window.setTimeout(() => setHint(CHARIOT_HINT), 400 + HINTS.length * 2600));
    timers.push(window.setTimeout(() => setHint(null), 400 + HINTS.length * 2600 + 4200));
    return () => timers.forEach((t) => clearTimeout(t));
  }, [runId]);

  // missões concluídas durante a corrida
  useEffect(() => {
    const h = window.setInterval(() => {
      if (engine.mode !== 'playing') return;
      const run = engine.getRunStats();
      progression.data.missions.list.forEach((ms, i) => {
        if (ms.claimed || ms.progress >= ms.target || toastedMissions.current.has(i)) return;
        if (progression.missionProgressWith(ms, run) >= ms.target) {
          toastedMissions.current.add(i);
          const t = MISSION_POOL.find((x) => x.id === ms.templateId)!;
          showBanner(`✅ Missão concluída: ${t.text(ms.target)}`);
          audio.play('achievement');
        }
      });
    }, 500);
    return () => clearInterval(h);
  }, [engine, showBanner]);

  useEffect(() => {
    if (!banner) return;
    const h = setTimeout(() => setBanner(null), 1800);
    return () => clearTimeout(h);
  }, [banner]);

  // contagem para reviver
  useEffect(() => {
    if (phase !== 'revive') return;
    if (reviveLeft <= 0) {
      finalize(pendingStats.current!);
      return;
    }
    const h = setTimeout(() => setReviveLeft((v) => v - 1), 1000);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reviveLeft]);

  // contagem regressiva ao retomar
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      engine.resume();
      setPhase('playing');
      return;
    }
    audio.play('ui');
    const h = setTimeout(() => setCountdown((c) => c - 1), 650);
    return () => clearTimeout(h);
  }, [phase, countdown, engine]);

  // teclado nas telas de pausa
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (readingRef.current) return;
      if (phase === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) resumeGame();
      else if (phase === 'results' && e.code === 'Enter') restart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function finalize(stats: RunStats) {
    const s = progression.applyRun(stats);
    progression.setTutorialDone();
    setSummary(s);
    setPhase('results');
    audio.play('gameover');
    audio.playMusic('menu');
  }

  function revive() {
    const cost = REVIVE_COST[revivesUsed.current];
    const stats = pendingStats.current!;
    // as moedas da corrida atual também podem pagar o resgate
    if (progression.data.coins < cost) {
      const missing = cost - progression.data.coins;
      if (stats.coins < missing) return;
      engine.score.run.coins -= missing;
      progression.spendCoins(progression.data.coins);
    } else {
      progression.spendCoins(cost);
    }
    revivesUsed.current++;
    audio.play('powerup');
    engine.revive();
    setPhase('playing');
  }

  function pause() {
    engine.pause();
    setPhase('paused');
  }

  function resumeGame() {
    setCountdown(3);
    setPhase('countdown');
  }

  function restart() {
    revivesUsed.current = 0;
    toastedMissions.current.clear();
    pendingStats.current = null;
    setRunId((r) => r + 1);
    setSummary(null);
    setPowers([]);
    setReading(null);
    setPhase('playing');
    UIManager.startRun();
    setBoost({ remaining: 0, total: engine.chariot.duration, charges: engine.chariot.charges });
  }

  function toMenu() {
    if (phase === 'paused' && engine.mode === 'paused') {
      // abandonar a corrida conta como fim de partida
      const stats = engine.getRunStats();
      progression.applyRun(stats);
    }
    UIManager.showMenuScene();
    UIManager.home();
  }

  const s = progression.data.settings;
  const cost = REVIVE_COST[revivesUsed.current] ?? 0;
  const boostActive = boost.remaining > 0;
  const boostPct = boostActive ? Math.max(0, Math.min(1, boost.remaining / boost.total)) : 0;

  return (
    <div className="screen game" data-testid="game-screen">
      {/* HUD */}
      <div className={`hud ${phase === 'results' ? 'hud-hidden' : ''}`}>
        <div className="hud-left">
          <div className="hud-pill" data-testid="hud-coins">
            <CoinIcon size={20} />
            <span ref={coinsRef}>0</span>
          </div>
          <div className="hud-pill hud-dist" data-testid="hud-distance">
            <span ref={distRef}>0 m</span>
          </div>
        </div>
        <div className="hud-right">
          <div className="hud-score" data-testid="hud-score">
            <span ref={scoreRef}>0</span>
            <span ref={multRef} className="hud-mult">
              x1
            </span>
          </div>
          <button className="pause-btn" onClick={pause} aria-label="Pausar" data-testid="btn-pause" disabled={phase !== 'playing'}>
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className="hud-powers">
        {boostActive && phase !== 'results' && (
          <div className="power-chip power-chip-fire" data-testid="boost-bar">
            <span>🔥</span>
            <div className="power-bar">
              <div style={{ width: `${boostPct * 100}%` }} />
            </div>
          </div>
        )}
        {powers.map((p) => (
          <div key={p.type} className="power-chip" style={{ borderColor: POWER_INFO[p.type].color }}>
            <span>{POWER_INFO[p.type].icon}</span>
            <div className="power-bar">
              <div style={{ width: `${(p.remaining / p.total) * 100}%`, background: POWER_INFO[p.type].color }} />
            </div>
          </div>
        ))}
      </div>

      {boostActive && phase === 'playing' && <div className="boost-vignette" aria-hidden="true" />}

      {(phase === 'playing' || phase === 'countdown') && (
        <button
          type="button"
          className={`chariot-btn ${boostActive ? 'active' : ''} ${boost.charges <= 0 && !boostActive ? 'empty' : ''} ${hint === CHARIOT_HINT ? 'hinting' : ''}`}
          style={boostActive ? { background: `conic-gradient(#ffd23f ${boostPct * 360}deg, rgba(60, 20, 4, 0.75) 0deg)` } : undefined}
          data-testid="btn-chariot"
          aria-label={`Carruagem de Fogo: ${boost.charges} cargas`}
          disabled={phase !== 'playing'}
          onClick={() => {
            audio.unlock();
            engine.activateBoost();
          }}
        >
          <span className="chariot-btn-inner">
            <span className="chariot-btn-icon">🔥</span>
            <span className="chariot-btn-count" data-testid="hud-chariot-charges">
              {boost.charges}
            </span>
          </span>
        </button>
      )}

      {banner && phase === 'playing' && (
        <div key={banner.id} className="game-banner">
          {banner.text}
        </div>
      )}
      {hint && phase === 'playing' && (
        <div className="game-hint" data-testid="hint">
          {hint}
        </div>
      )}

      {phase === 'countdown' && (
        <div className="overlay overlay-clear">
          <div key={countdown} className="countdown">
            {countdown}
          </div>
        </div>
      )}

      {/* PAUSA */}
      {phase === 'paused' && (
        <div className="overlay" data-testid="pause-screen">
          <div className="panel">
            <h2 className="sign-title">Pausado</h2>
            <div className="pause-stats">
              <span>{fmt(engine.getRunStats().distance)} m</span>
              <span>
                <CoinIcon size={18} /> {fmt(engine.getRunStats().coins)}
              </span>
              <span>{fmt(engine.getRunStats().score)} pts</span>
            </div>
            <Btn variant="green" size="lg" onClick={resumeGame} testId="btn-resume">
              ▶ Continuar
            </Btn>
            <Btn variant="blue" onClick={restart} testId="btn-restart">
              ↻ Reiniciar
            </Btn>
            <div className="quick-settings">
              <Btn
                variant="wood"
                size="sm"
                onClick={() => {
                  progression.updateSettings({ music: s.music > 0 ? 0 : 0.6 });
                  audio.setVolumes(progression.data.settings.music, progression.data.settings.sfx);
                }}
              >
                {s.music > 0 ? '🎵 Música: ligada' : '🔇 Música: desligada'}
              </Btn>
              <Btn
                variant="wood"
                size="sm"
                onClick={() => {
                  progression.updateSettings({ sfx: s.sfx > 0 ? 0 : 0.8 });
                  audio.setVolumes(progression.data.settings.music, progression.data.settings.sfx);
                }}
              >
                {s.sfx > 0 ? '🔊 Efeitos: ligados' : '🔈 Efeitos: desligados'}
              </Btn>
            </div>
            <Btn variant="red" onClick={toMenu} sfx="uiBack" testId="btn-quit">
              Sair para o menu
            </Btn>
          </div>
        </div>
      )}

      {/* REVIVER */}
      {phase === 'revive' && (
        <div className="overlay" data-testid="revive-screen">
          <div className="panel panel-revive">
            <h2 className="sign-title">Continuar?</h2>
            <p>Use suas moedas para continuar a corrida de onde parou.</p>
            <div className="revive-timer">
              <Progress value={reviveLeft / 5} />
            </div>
            <Btn variant="gold" size="lg" onClick={revive} sfx={null} testId="btn-revive">
              Reviver · <CoinIcon size={20} /> {fmt(cost)}
            </Btn>
            <Btn variant="ghost" onClick={() => finalize(pendingStats.current!)} testId="btn-no-revive">
              Não, obrigado
            </Btn>
          </div>
        </div>
      )}

      {/* FIM DE PARTIDA */}
      {phase === 'results' && summary && <Results summary={summary} onRestart={restart} onMenu={toMenu} onRead={setReading} />}
      {reading && <StoryReader story={reading} onClose={() => setReading(null)} />}
    </div>
  );
}

function Results({
  summary,
  onRestart,
  onMenu,
  onRead,
}: {
  summary: RunSummary;
  onRestart: () => void;
  onMenu: () => void;
  onRead: (s: StoryEpisode) => void;
}) {
  const st = summary.stats;
  const map = getMap(st.mapId);
  return (
    <div className="overlay overlay-results" data-testid="results-screen">
      <div className="panel panel-results">
        <h2 className="sign-title">Fim de Corrida</h2>
        {(summary.isBestScore || summary.isBestDistance) && <div className="new-record">🏆 Novo recorde!</div>}
        <div className="results-score" data-testid="final-score">
          {fmt(st.score)}
          <small>pontos</small>
        </div>
        <div className="results-grid">
          <div>
            <span className="rg-label">Distância</span>
            <strong>{fmt(st.distance)} m</strong>
          </div>
          <div>
            <span className="rg-label">Moedas</span>
            <strong>
              <CoinIcon size={18} /> {fmt(st.coins)}
            </strong>
          </div>
          <div>
            <span className="rg-label">Multiplicador</span>
            <strong>x{st.baseMultiplier}</strong>
          </div>
          <div>
            <span className="rg-label">Mapa</span>
            <strong>
              {map.emoji} {map.name}
            </strong>
          </div>
        </div>

        {summary.newStories.map((s) => (
          <div key={s.id} className="new-story" data-testid={`new-story-${s.id}`} style={{ borderColor: eraInfo(s.era).color }}>
            <StoryScene story={s} size="card" />
            <div className="new-story-info">
              <div className="new-story-tag">📜 Nova história revelada!</div>
              <strong>{s.title}</strong>
              <small>
                {eraInfo(s.era).emoji} {s.era} · {s.reference}
              </small>
              <Btn variant="gold" size="md" onClick={() => onRead(s)} testId={`read-${s.id}`}>
                📖 Ler a história
              </Btn>
            </div>
          </div>
        ))}
        {summary.scrollCoins > 0 && <p className="results-note">Você já revelou todas as histórias: +{summary.scrollCoins} moedas!</p>}

        {(summary.unlockedCharacters.length > 0 || summary.unlockedMaps.length > 0) && (
          <div className="results-unlocks">
            {summary.unlockedCharacters.map((c) => (
              <div key={c.id} className="unlock-chip">
                🎉 Novo herói: <strong>{c.name}</strong>
              </div>
            ))}
            {summary.unlockedMaps.map((m) => (
              <div key={m.id} className="unlock-chip">
                🎉 Novo mapa: <strong>{m.name}</strong>
              </div>
            ))}
          </div>
        )}
        {summary.completedMissions.length > 0 && (
          <div className="results-missions">
            {summary.completedMissions.map((m) => (
              <div key={m}>✅ {m}</div>
            ))}
            <small>Resgate as recompensas na tela de Missões.</small>
          </div>
        )}

        <div className="results-actions">
          <Btn variant="green" size="lg" onClick={onRestart} testId="btn-play-again" sfx="buy">
            ↻ Jogar novamente
          </Btn>
          <Btn variant="wood" onClick={onMenu} sfx="uiBack" testId="btn-menu">
            Menu
          </Btn>
        </div>
      </div>
    </div>
  );
}
