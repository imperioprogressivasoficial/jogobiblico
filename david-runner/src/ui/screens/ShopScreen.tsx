import { useState } from 'react';
import { audio } from '../../game/AudioManager';
import { CHARACTERS } from '../../data/characters';
import { CHARIOT, chariotDuration } from '../../data/chariot';
import { UPGRADES } from '../../data/progression';
import { progression } from '../../state/ProgressionManager';
import { Btn, CoinIcon, Progress, RelicIcon, TopBar } from '../components/common';
import { UIManager, fmt, useProgress } from '../UIManager';

type Tab = 'herois' | 'trajes' | 'melhorias' | 'poderes';

export function ShopScreen() {
  useProgress();
  const [tab, setTab] = useState<Tab>('herois');
  const d = progression.data;

  return (
    <div className="screen list-screen" data-testid="shop-screen">
      <TopBar title="Loja" />
      <div className="tabs">
        {(
          [
            ['herois', 'Heróis'],
            ['trajes', 'Trajes'],
            ['melhorias', 'Melhorias'],
            ['poderes', '🔥 Poderes'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            className={`tab ${tab === id ? 'on' : ''}`}
            data-testid={`tab-${id}`}
            onClick={() => {
              audio.play('ui');
              setTab(id);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="scroll-area">
        {tab === 'herois' && (
          <div className="shop-list">
            {CHARACTERS.map((c) => {
              const st = progression.characterStatus(c);
              const buyable = c.unlock.type === 'coins' || c.unlock.type === 'relics';
              return (
                <div key={c.id} className="shop-item">
                  <div className="shop-avatar" style={{ background: c.look.tunic }}>
                    {c.name[0]}
                  </div>
                  <div className="shop-info">
                    <strong>{c.name}</strong>
                    <small>{c.title}</small>
                    {!st.owned && <Progress value={st.progress} label={st.label} />}
                  </div>
                  {st.owned ? (
                    <span className="owned">✔ Seu</span>
                  ) : buyable ? (
                    <Btn
                      variant="gold"
                      size="sm"
                      sfx={null}
                      disabled={!st.canUnlock}
                      testId={`buy-${c.id}`}
                      onClick={() => audio.play(progression.unlockCharacter(c.id) ? 'buy' : 'error')}
                    >
                      {c.unlock.type === 'coins' ? <CoinIcon size={16} /> : <RelicIcon size={16} />}{' '}
                      {c.unlock.type === 'coins' ? fmt(c.unlock.amount) : c.unlock.type === 'relics' ? c.unlock.count : ''}
                    </Btn>
                  ) : (
                    <span className="muted small">Desafio</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'trajes' && (
          <div className="shop-list">
            <p className="muted center">Trajes são comprados com relíquias, encontradas raramente nas corridas e ao completar missões diárias.</p>
            {CHARACTERS.filter((c) => d.characters.includes(c.id)).map((c) =>
              c.skins
                .filter((s) => s.relicCost > 0)
                .map((s) => {
                  const own = (d.skins[c.id] ?? []).includes(s.id);
                  const look = { ...c.look, ...s.look };
                  return (
                    <div key={c.id + s.id} className="shop-item">
                      <div className="shop-avatar" style={{ background: look.tunic, borderColor: look.tunicTrim }}>
                        {c.name[0]}
                      </div>
                      <div className="shop-info">
                        <strong>{s.name}</strong>
                        <small>{c.name}</small>
                      </div>
                      {own ? (
                        <Btn
                          variant="green"
                          size="sm"
                          disabled={d.selectedSkin[c.id] === s.id}
                          onClick={() => {
                            progression.selectSkin(c.id, s.id);
                            if (d.selectedCharacter === c.id) UIManager.engine?.setCharacter(c.id, s.id);
                          }}
                        >
                          {d.selectedSkin[c.id] === s.id ? 'Usando' : 'Usar'}
                        </Btn>
                      ) : (
                        <Btn
                          variant="gold"
                          size="sm"
                          sfx={null}
                          disabled={d.relics < s.relicCost}
                          onClick={() => {
                            const ok = progression.buySkin(c.id, s.id);
                            audio.play(ok ? 'buy' : 'error');
                            if (ok && d.selectedCharacter === c.id) UIManager.engine?.setCharacter(c.id, s.id);
                          }}
                        >
                          <RelicIcon size={16} /> {s.relicCost}
                        </Btn>
                      )}
                    </div>
                  );
                }),
            )}
          </div>
        )}

        {tab === 'poderes' && <PowersTab />}

        {tab === 'melhorias' && (
          <div className="shop-list">
            {UPGRADES.map((u) => {
              const lvl = d.upgrades[u.id] ?? 0;
              const cost = progression.upgradeCost(u.id);
              const dur = u.baseDuration + u.perLevel * lvl;
              return (
                <div key={u.id} className="shop-item">
                  <div className="shop-avatar emoji">{u.icon}</div>
                  <div className="shop-info">
                    <strong>{u.name}</strong>
                    <small>
                      {u.description} Duração: {dur.toLocaleString('pt-BR')} s
                    </small>
                    <div className="pips">
                      {u.costs.map((_, i) => (
                        <span key={i} className={`pip ${i < lvl ? 'on' : ''}`} />
                      ))}
                    </div>
                  </div>
                  {cost === null ? (
                    <span className="owned">Máximo</span>
                  ) : (
                    <Btn
                      variant="gold"
                      size="sm"
                      sfx={null}
                      disabled={d.coins < cost}
                      testId={`upgrade-${u.id}`}
                      onClick={() => audio.play(progression.buyUpgrade(u.id) ? 'buy' : 'error')}
                    >
                      <CoinIcon size={16} /> {fmt(cost)}
                    </Btn>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Aba "Poderes": cargas da Carruagem de Fogo e melhoria de duração. */
function PowersTab() {
  const d = progression.data;
  const lvl = d.chariot.level;
  const cost = progression.chariotUpgradeCost();
  const full = d.chariot.charges >= CHARIOT.maxCharges;
  return (
    <div className="shop-list">
      <div className="chariot-card">
        <div className="chariot-card-art" aria-hidden="true">
          🐎🔥🐎
        </div>
        <div>
          <strong>Carruagem de Fogo</strong>
          <p>
            Toque <b>duas vezes</b> na tela durante a corrida (ou aperte <b>E</b>): você corre mais rápido, fica invencível e
            atravessa tudo pelo caminho!
          </p>
          <small>“Eis que um carro de fogo, com cavalos de fogo...” — {CHARIOT.reference}</small>
        </div>
      </div>
      <div className="shop-item">
        <div className="shop-avatar emoji">🔥</div>
        <div className="shop-info">
          <strong>Carga da Carruagem</strong>
          <small>
            Você tem <b data-testid="shop-chariot-charges">{d.chariot.charges}</b> {d.chariot.charges === 1 ? 'carga' : 'cargas'}. Ganhe +1
            a cada missão diária resgatada.
          </small>
        </div>
        <Btn
          variant="gold"
          size="sm"
          sfx={null}
          disabled={d.coins < CHARIOT.chargeCost || full}
          testId="buy-chariot-charge"
          onClick={() => audio.play(progression.buyChariotCharge() ? 'buy' : 'error')}
        >
          <CoinIcon size={16} /> {fmt(CHARIOT.chargeCost)}
        </Btn>
      </div>
      <div className="shop-item">
        <div className="shop-avatar emoji">⏱️</div>
        <div className="shop-info">
          <strong>Duração da Carruagem</strong>
          <small>
            Duração: {chariotDuration(lvl).toLocaleString('pt-BR')} s
            {cost !== null && <> → {chariotDuration(lvl + 1).toLocaleString('pt-BR')} s</>}
          </small>
          <div className="pips">
            {CHARIOT.upgradeCosts.map((_, i) => (
              <span key={i} className={`pip ${i < lvl ? 'on' : ''}`} />
            ))}
          </div>
        </div>
        {cost === null ? (
          <span className="owned">Máximo</span>
        ) : (
          <Btn
            variant="gold"
            size="sm"
            sfx={null}
            disabled={d.coins < cost}
            testId="upgrade-chariot"
            onClick={() => audio.play(progression.buyChariotUpgrade() ? 'buy' : 'error')}
          >
            <CoinIcon size={16} /> {fmt(cost)}
          </Btn>
        )}
      </div>
    </div>
  );
}
