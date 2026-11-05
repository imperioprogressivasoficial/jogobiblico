import { audio } from '../../game/AudioManager';
import { MAPS } from '../../data/maps';
import { progression } from '../../state/ProgressionManager';
import { Btn, CoinIcon, Progress, TopBar } from '../components/common';
import { UIManager, fmt, useProgress } from '../UIManager';

export function MapSelect() {
  useProgress();
  const d = progression.data;
  return (
    <div className="screen list-screen" data-testid="maps-screen">
      <TopBar title="Mapas" />
      <div className="scroll-area">
        <div className="map-grid">
          {MAPS.map((m) => {
            const st = progression.mapStatus(m);
            const selected = d.selectedMap === m.id;
            return (
              <div key={m.id} className={`map-card ${selected ? 'selected' : ''} ${st.owned ? '' : 'locked'}`} data-testid={`map-${m.id}`}>
                <div className="map-art" style={{ background: m.cardGradient }}>
                  <span className="map-emoji">{m.emoji}</span>
                  {!st.owned && <span className="map-lock">🔒</span>}
                </div>
                <div className="map-body">
                  <h3>{m.name}</h3>
                  <div className="map-sub">{m.subtitle}</div>
                  <p>{m.description}</p>
                  {st.owned ? (
                    <>
                      <div className="map-best">Melhor distância: {fmt(d.bestByMap[m.id] ?? 0)} m</div>
                      {selected ? (
                        <Btn variant="ghost" size="sm" disabled>
                          ✔ Selecionado
                        </Btn>
                      ) : (
                        <Btn
                          variant="green"
                          size="sm"
                          testId={`select-${m.id}`}
                          onClick={() => {
                            progression.selectMap(m.id);
                            UIManager.engine?.setMap(m.id);
                          }}
                        >
                          Selecionar
                        </Btn>
                      )}
                    </>
                  ) : (
                    <>
                      <Progress value={st.progress} />
                      <small className="muted">{st.label}</small>
                      <Btn
                        variant="gold"
                        size="sm"
                        disabled={!st.canBuy && !st.canUnlockFree}
                        sfx={null}
                        testId={`unlock-${m.id}`}
                        onClick={() => {
                          const ok = progression.unlockMap(m.id, !st.canUnlockFree);
                          audio.play(ok ? 'buy' : 'error');
                          if (ok) UIManager.engine?.setMap(m.id);
                        }}
                      >
                        {st.canUnlockFree ? (
                          'Desbloquear'
                        ) : (
                          <>
                            Desbloquear · <CoinIcon size={16} /> {m.unlock.type === 'distanceIn' ? fmt(m.unlock.coins) : 0}
                          </>
                        )}
                      </Btn>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
