import { getCharacter } from '../../data/characters';
import { MAPS, getMap } from '../../data/maps';
import { progression } from '../../state/ProgressionManager';
import { TopBar } from '../components/common';
import { fmt, useProgress } from '../UIManager';

export function RecordsScreen() {
  useProgress();
  const d = progression.data;
  const st = d.stats;
  return (
    <div className="screen list-screen" data-testid="records-screen">
      <TopBar title="Recordes" />
      <div className="scroll-area">
        <div className="record-hero">
          <div>
            <span className="rg-label">Melhor pontuação</span>
            <strong data-testid="best-score">{fmt(st.bestScore)}</strong>
          </div>
          <div>
            <span className="rg-label">Maior distância</span>
            <strong>{fmt(st.bestDistance)} m</strong>
          </div>
          <div>
            <span className="rg-label">Mais moedas</span>
            <strong>{fmt(st.bestCoinsRun)}</strong>
          </div>
        </div>

        <h3 className="section-title">Por mapa</h3>
        <div className="map-records">
          {MAPS.map((m) => (
            <div key={m.id} className="map-record">
              <span>
                {m.emoji} {m.name}
              </span>
              <strong>{d.maps.includes(m.id) ? `${fmt(d.bestByMap[m.id] ?? 0)} m` : '🔒'}</strong>
            </div>
          ))}
        </div>

        <h3 className="section-title">Melhores corridas</h3>
        {d.records.length === 0 ? (
          <p className="muted center">Nenhuma corrida ainda. Que tal começar agora?</p>
        ) : (
          <table className="records-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Pontos</th>
                <th>Distância</th>
                <th>Herói</th>
                <th>Mapa</th>
              </tr>
            </thead>
            <tbody>
              {d.records.map((r, i) => (
                <tr key={r.date + '-' + i}>
                  <td>{i + 1}</td>
                  <td>{fmt(r.score)}</td>
                  <td>{fmt(r.distance)} m</td>
                  <td>{getCharacter(r.characterId).name}</td>
                  <td>{getMap(r.mapId).emoji}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 className="section-title">Totais</h3>
        <div className="totals">
          <div>Corridas<strong>{fmt(st.totalRuns)}</strong></div>
          <div>Distância total<strong>{fmt(st.totalDistance)} m</strong></div>
          <div>Moedas coletadas<strong>{fmt(st.totalCoins)}</strong></div>
          <div>Pulos<strong>{fmt(st.totalJumps)}</strong></div>
          <div>Deslizes<strong>{fmt(st.totalSlides)}</strong></div>
          <div>Pergaminhos<strong>{fmt(st.totalScrolls)}</strong></div>
          <div>Relíquias<strong>{fmt(st.totalRelics)}</strong></div>
          <div>Power-ups<strong>{fmt(st.totalPowerups)}</strong></div>
        </div>
      </div>
    </div>
  );
}
