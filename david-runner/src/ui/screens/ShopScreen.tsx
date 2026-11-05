import { useState } from 'react';
import { audio } from '../../game/AudioManager';
import { CHARACTERS } from '../../data/characters';
import { MAX_CHARGES, POWERS, powerDuration } from '../../data/powers';
import { UPGRADES } from '../../data/progression';
import { progression } from '../../state/ProgressionManager';
import { Btn, CoinIcon, Progress, RelicIcon, TopBar } from '../components/common';
import { UIManager, fmt, useProgress } from '../UIManager';

type Tab = 'herois' | 'trajes' | 'melhorias' | 'poderes';

export function ShopScreen() {
  useProgress();
  const [tab, setTab] = useState<Tab>(UIManager.shopTab);
  UIManager.shopTab = 'herois';
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

/** Aba "Poderes": os seis poderes bíblicos — equipar, desbloquear, comprar cargas e melhorar a duração. */
function PowersTab() {
  const d = progression.data;
  return (
    <div className="shop-list">
      <p className="muted center">
        Equipe <b>um poder</b> e use na corrida com <b>dois toques</b> na tela (ou a tecla E). Ganhe +1 carga do poder equipado a cada
        missão diária resgatada.
      </p>
      {POWERS.map((pw) => {
        const st = progression.powerState(pw.id);
        const status = progression.powerUnlockStatus(pw.id);
        const equipped = d.equippedPower === pw.id;
        const cost = progression.powerUpgradeCost(pw.id);
        const timed = pw.kind === 'timed';
        return (
          <div key={pw.id} className={`power-card ${equipped ? 'equipped' : ''} ${status.unlocked ? '' : 'locked'}`} style={{ borderColor: pw.color }} data-testid={`power-${pw.id}`}>
            <div className="power-card-head">
              <div className="power-card-icon" style={{ background: pw.color }}>
                {pw.icon}
              </div>
              <div className="power-card-title">
                <strong>{pw.name}</strong>
                <small>{pw.reference}</small>
              </div>
              {status.unlocked ? (
                equipped ? (
                  <span className="owned" data-testid={`equipped-${pw.id}`}>
                    ✔ Equipado
                  </span>
                ) : (
                  <Btn variant="green" size="sm" testId={`equip-${pw.id}`} onClick={() => progression.equipPower(pw.id)}>
                    Equipar
                  </Btn>
                )
              ) : (
                <span className="power-lock">🔒</span>
              )}
            </div>
            <p className="power-card-desc">{pw.description}</p>
            <small className="power-card-quote">“{pw.quote}” — {pw.reference}</small>
            {status.unlocked ? (
              <div className="power-card-actions">
                <div className="power-stat">
                  <span>
                    {pw.icon} <b data-testid={`charges-${pw.id}`}>{st.charges}</b> {st.charges === 1 ? pw.chargeName[0] : pw.chargeName[1]}
                  </span>
                  <Btn
                    variant="gold"
                    size="sm"
                    sfx={null}
                    disabled={d.coins < pw.chargeCost || st.charges >= MAX_CHARGES}
                    testId={`buy-charge-${pw.id}`}
                    onClick={() => audio.play(progression.buyPowerCharge(pw.id) ? 'buy' : 'error')}
                  >
                    +1 · <CoinIcon size={16} /> {fmt(pw.chargeCost)}
                  </Btn>
                </div>
                {timed && (
                  <div className="power-stat">
                    <span>
                      ⏱️ {powerDuration(pw, st.level).toLocaleString('pt-BR')} s
                      {cost !== null && <> → {powerDuration(pw, st.level + 1).toLocaleString('pt-BR')} s</>}
                      <span className="pips">
                        {pw.upgradeCosts.map((_, i) => (
                          <span key={i} className={`pip ${i < st.level ? 'on' : ''}`} />
                        ))}
                      </span>
                    </span>
                    {cost === null ? (
                      <span className="owned">Máximo</span>
                    ) : (
                      <Btn
                        variant="gold"
                        size="sm"
                        sfx={null}
                        disabled={d.coins < cost}
                        testId={`upgrade-${pw.id}`}
                        onClick={() => audio.play(progression.buyPowerUpgrade(pw.id) ? 'buy' : 'error')}
                      >
                        <CoinIcon size={16} /> {fmt(cost)}
                      </Btn>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="power-card-actions">
                <small className="muted">{status.label}</small>
                <Btn
                  variant="gold"
                  size="sm"
                  sfx={null}
                  disabled={!status.byStory && !status.canBuy}
                  testId={`unlock-${pw.id}`}
                  onClick={() => {
                    const ok = progression.unlockPower(pw.id, !status.byStory);
                    audio.play(ok ? 'buy' : 'error');
                  }}
                >
                  {status.byStory ? (
                    'Desbloquear'
                  ) : (
                    <>
                      Desbloquear · <CoinIcon size={16} /> {pw.unlock.type === 'story' ? fmt(pw.unlock.coins) : 0}
                    </>
                  )}
                </Btn>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
