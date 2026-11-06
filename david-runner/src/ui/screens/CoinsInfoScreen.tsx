import { BIBLE_COINS } from '../../data/currency';
import { speak, speechSupported } from '../narrator';
import { CoinIcon, RelicIcon, TopBar } from '../components/common';

/** "Moedas da Bíblia": as moedas do tempo bíblico, da menor para a maior, com a história de cada uma. */
export function CoinsInfoScreen() {
  const canSpeak = speechSupported();
  return (
    <div className="screen list-screen" data-testid="coins-info">
      <TopBar title="Moedas da Bíblia" />
      <div className="scroll-area">
        <div className="coins-intro">
          <p>
            No jogo você junta <b><CoinIcon size={16} /> denários</b>, a moeda de prata do tempo de Jesus, e <b><RelicIcon size={16} /> talentos</b>, a maior
            riqueza da Bíblia. Conheça as moedas daquela época, da menor para a maior!
          </p>
        </div>
        <div className="coin-cards">
          {BIBLE_COINS.map((c, i) => (
            <article key={c.id} className="coin-card" data-testid={`coin-${c.id}`}>
              <div className="coin-disc" style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${c.color} 55%, #0003)` }}>
                {i + 1}
              </div>
              <div className="coin-body">
                <header>
                  <strong>{c.name}</strong>
                  <span className="coin-tag">
                    {c.metal} · {c.origin}
                  </span>
                </header>
                <p className="coin-value">💰 {c.value}</p>
                <p>{c.story}</p>
                <footer>
                  <small>📖 {c.reference}</small>
                  {canSpeak && (
                    <button type="button" className="coin-listen" onClick={() => speak(`${c.name}. ${c.value} ${c.story} ${c.reference}`)}>
                      🔊 Ouvir
                    </button>
                  )}
                </footer>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
