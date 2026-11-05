import { SCROLLS } from '../../data/scrolls';
import { progression } from '../../state/ProgressionManager';
import { TopBar } from '../components/common';
import { useProgress } from '../UIManager';

export function ScrollsScreen() {
  useProgress();
  const found = progression.data.scrolls;
  return (
    <div className="screen list-screen" data-testid="scrolls-screen">
      <TopBar title="Pergaminhos" />
      <div className="scroll-area">
        <p className="center summary-line">
          {found.length} de {SCROLLS.length} curiosidades bíblicas descobertas
        </p>
        <div className="scroll-grid">
          {SCROLLS.map((s, i) => {
            const ok = found.includes(s.id);
            return ok ? (
              <div key={s.id} className="scroll-card">
                <div className="scroll-tag">📜 {i + 1}</div>
                <strong>{s.title}</strong>
                <p>{s.text}</p>
                <em>{s.reference}</em>
              </div>
            ) : (
              <div key={s.id} className="scroll-card locked">
                <div className="scroll-tag">🔒 {i + 1}</div>
                <strong>???</strong>
                <p>Encontre pergaminhos durante as corridas para revelar esta curiosidade.</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
