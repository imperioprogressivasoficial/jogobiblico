import { useEffect, useState } from 'react';
import { COIN_PACKS, coinsLabel, talentsLabel, type CoinPack } from '../../data/currency';
import { hashString, Rng } from '../../game/rng';
import { ParentGate } from '../components/ParentGate';
import { audio } from '../../game/AudioManager';
import { CHARACTERS } from '../../data/characters';
import { MAX_CHARGES, POWERS, powerDuration } from '../../data/powers';
import { UPGRADES } from '../../data/progression';
import { progression } from '../../state/ProgressionManager';
import { Btn, CoinIcon, Progress, RelicIcon, TopBar } from '../components/common';
import { UIManager, fmt, useProgress, type ShopTab } from '../UIManager';

type Tab = ShopTab;

export function ShopScreen() {
  useProgress();
  const [tab, setTab] = useState<Tab>(UIManager.shopTab);
  UIManager.shopTab = 'destaque';
  const d = progression.data;

  return (
    <div className="screen list-screen" data-testid="shop-screen">
      <TopBar title="Loja" />
      <div className="tabs">
        {(
          [
            ['destaque', '⭐ Destaque'],
            ['moedas', '💰 Denários'],
            ['herois', '🧑 Heróis'],
            ['trajes', '👕 Roupas'],
            ['poderes', '🔥 Poderes'],
            ['melhorias', '⚡ Melhorias'],
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
        {tab === 'destaque' && <FeaturedTab onGo={setTab} />}
        {tab === 'moedas' && <PacksTab />}
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
            <p className="muted center">Roupas são compradas com talentos, encontrados raramente nas corridas e ao completar missões diárias.</p>
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

/** Itens em destaque mudam todo dia (mesmos para todos os jogadores no mesmo dia). */
function dailyKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function untilMidnight(): string {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const m = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60000));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}min`;
}

export function featuredToday() {
  const rng = new Rng(hashString('loja-' + dailyKey()));
  const d = progression.data;
  const all = CHARACTERS.flatMap((c) => c.skins.filter((s) => s.relicCost > 0).map((s) => ({ c, s })));
  const pool = [...all];
  const pick: typeof all = [];
  while (pick.length < 4 && pool.length) pick.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  const hero = rng.pick(CHARACTERS.filter((c) => c.unlock.type === 'coins' || c.unlock.type === 'relics'));
  return { skins: pick.map((x, i) => ({ ...x, price: Math.max(1, Math.round(x.s.relicCost * (i === 0 ? 0.6 : 0.8))), owned: (d.skins[x.c.id] ?? []).includes(x.s.id), hasHero: d.characters.includes(x.c.id) })), hero };
}

function FeaturedTab({ onGo }: { onGo: (t: ShopTab) => void }) {
  const d = progression.data;
  const f = featuredToday();
  const [left, setLeft] = useState(untilMidnight());
  useEffect(() => {
    const h = window.setInterval(() => setLeft(untilMidnight()), 30000);
    return () => clearInterval(h);
  }, []);
  const heroSt = progression.characterStatus(f.hero);
  return (
    <div className="featured" data-testid="shop-featured">
      <div className="featured-head">
        <strong>⭐ Loja do Dia</strong>
        <span className="featured-timer">⏱️ Muda em {left}</span>
      </div>
      <div className="featured-grid">
        {f.skins.map(({ c, s, price, owned, hasHero }, i) => {
          const look = { ...c.look, ...s.look };
          return (
            <div key={c.id + s.id} className={`feat-card ${i === 0 ? 'feat-big' : ''}`} style={{ ['--feat' as string]: look.tunic }} data-testid={`feat-${c.id}-${s.id}`}>
              {i === 0 && <span className="feat-ribbon">-40%</span>}
              {i > 0 && <span className="feat-ribbon feat-ribbon-sm">-20%</span>}
              <div className="feat-art">
                <div className="feat-avatar" style={{ background: look.tunic, borderColor: look.tunicTrim }}>
                  <span>{c.name[0]}</span>
                </div>
              </div>
              <div className="feat-info">
                <strong>{s.name}</strong>
                <small>Roupa de {c.name}</small>
              </div>
              {owned ? (
                <span className="owned">✔ Sua</span>
              ) : !hasHero ? (
                <span className="muted small">Desbloqueie {c.name}</span>
              ) : (
                <Btn
                  variant="gold"
                  size="sm"
                  sfx={null}
                  disabled={d.relics < price}
                  testId={`feat-buy-${c.id}-${s.id}`}
                  onClick={() => {
                    const ok = progression.buySkinFor(c.id, s.id, price);
                    audio.play(ok ? 'buy' : 'error');
                    if (ok) {
                      progression.selectSkin(c.id, s.id);
                      if (d.selectedCharacter === c.id) UIManager.engine?.setCharacter(c.id, s.id);
                    }
                  }}
                >
                  <s className="old-price">{s.relicCost}</s> <RelicIcon size={16} /> {price}
                </Btn>
              )}
            </div>
          );
        })}
      </div>
      {!heroSt.owned && (
        <div className="feat-hero" style={{ background: f.hero.look.tunic }}>
          <div className="feat-hero-avatar">{f.hero.name[0]}</div>
          <div className="feat-info">
            <small>Herói em destaque</small>
            <strong>{f.hero.name}</strong>
            <small>{f.hero.title}</small>
          </div>
          <Btn variant="green" size="sm" onClick={() => onGo('herois')}>
            Ver ▶
          </Btn>
        </div>
      )}
      <button type="button" className="feat-banner" onClick={() => onGo('moedas')} data-testid="feat-packs">
        <span className="feat-banner-art">👑</span>
        <span>
          <strong>Tesouro de Salomão</strong>
          <small>Pacotes de denários e talentos</small>
        </span>
        <span className="feat-banner-go">▶</span>
      </button>
      <button type="button" className="feat-banner feat-banner-learn" onClick={() => UIManager.go('coins-info')} data-testid="feat-coins-info">
        <span className="feat-banner-art">📜</span>
        <span>
          <strong>Moedas da Bíblia</strong>
          <small>Denário, dracma, siclo, talento... aprenda a história de cada uma!</small>
        </span>
        <span className="feat-banner-go">▶</span>
      </button>
    </div>
  );
}

function PacksTab() {
  const d = progression.data;
  const [buying, setBuying] = useState<CoinPack | null>(null);
  const [done, setDone] = useState<CoinPack | null>(null);
  return (
    <div className="packs" data-testid="shop-packs">
      <p className="muted center small">Compras só com a permissão de um adulto. 👨‍👩‍👧</p>
      <div className="packs-grid">
        {COIN_PACKS.map((pk) => {
          const sold = pk.once && d.purchases.includes(pk.id);
          return (
            <button
              key={pk.id}
              type="button"
              className={`pack ${pk.badge ? 'pack-badged' : ''}`}
              disabled={sold}
              data-testid={`pack-${pk.id}`}
              onClick={() => {
                audio.play('ui');
                setBuying(pk);
              }}
            >
              {pk.badge && <span className="pack-badge">{pk.badge}</span>}
              <span className="pack-art">{pk.art}</span>
              <strong>{pk.name}</strong>
              <span className="pack-gets">
                {pk.coins > 0 && (
                  <span>
                    <CoinIcon size={16} /> {fmt(pk.coins)}
                  </span>
                )}
                {pk.talents > 0 && (
                  <span>
                    <RelicIcon size={16} /> {pk.talents}
                  </span>
                )}
              </span>
              <span className="pack-price">{sold ? 'Comprado' : pk.price}</span>
            </button>
          );
        })}
      </div>
      <p className="muted center small">
        Versão de teste: nenhuma cobrança é feita. Na versão da App Store, o pagamento é feito pela loja do aparelho.
      </p>
      {buying && (
        <ParentGate
          title={`${buying.art} ${buying.name}`}
          detail={`${[buying.coins ? coinsLabel(buying.coins) : '', buying.talents ? talentsLabel(buying.talents) : ''].filter(Boolean).join(' + ')} por ${buying.price}`}
          onCancel={() => setBuying(null)}
          onOk={() => {
            const ok = progression.grantPack(buying.id, buying.coins, buying.talents, buying.once);
            audio.play(ok ? 'victory' : 'error');
            setDone(ok ? buying : null);
            setBuying(null);
          }}
        />
      )}
      {done && (
        <div className="overlay" onClick={() => setDone(null)} data-testid="pack-done">
          <div className="panel center">
            <div className="pack-art pack-art-big">{done.art}</div>
            <h2 className="sign-title">Obrigado!</h2>
            <p>Você recebeu {[done.coins ? coinsLabel(done.coins) : '', done.talents ? talentsLabel(done.talents) : ''].filter(Boolean).join(' e ')}.</p>
            <Btn variant="green" onClick={() => setDone(null)}>
              Oba! ✔
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
