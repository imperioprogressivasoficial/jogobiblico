import { useEffect, useState } from 'react';
import { audio } from '../../game/AudioManager';
import { CHARACTERS } from '../../data/characters';
import { progression } from '../../state/ProgressionManager';
import { Btn, Progress, RelicIcon, TopBar } from '../components/common';
import { UIManager, useProgress } from '../UIManager';

export function CharacterSelect() {
  useProgress();
  const d = progression.data;
  const [index, setIndex] = useState(Math.max(0, CHARACTERS.findIndex((c) => c.id === d.selectedCharacter)));
  const c = CHARACTERS[index];
  const status = progression.characterStatus(c);
  const ownedSkins = d.skins[c.id] ?? ['padrao'];
  const [previewSkin, setPreviewSkin] = useState(d.selectedSkin[c.id] ?? 'padrao');

  useEffect(() => {
    setPreviewSkin(d.selectedSkin[c.id] ?? 'padrao');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  useEffect(() => {
    const e = UIManager.engine!;
    e.showMenu('showcase');
    return () => {
      // restaura o herói escolhido ao sair
      const sel = progression.data.selectedCharacter;
      e.setCharacter(sel, progression.data.selectedSkin[sel] ?? 'padrao');
      e.showMenu('menu');
    };
  }, []);

  useEffect(() => {
    UIManager.engine!.setCharacter(c.id, previewSkin);
  }, [c.id, previewSkin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') move(-1);
      if (e.code === 'ArrowRight') move(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const move = (dir: number) => {
    audio.play('ui');
    setIndex((i) => (i + dir + CHARACTERS.length) % CHARACTERS.length);
  };

  const selected = d.selectedCharacter === c.id;
  const skin = c.skins.find((s) => s.id === previewSkin) ?? c.skins[0];
  const skinOwned = ownedSkins.includes(skin.id);

  return (
    <div className="screen characters" data-testid="characters-screen">
      <TopBar title="Heróis" />
      <div className="carousel-arrows">
        <Btn variant="wood" size="lg" onClick={() => move(-1)} sfx={null} title="Anterior" testId="char-prev">
          ‹
        </Btn>
        <Btn variant="wood" size="lg" onClick={() => move(1)} sfx={null} title="Próximo" testId="char-next">
          ›
        </Btn>
      </div>
      <div className="char-dots">
        {CHARACTERS.map((x, i) => (
          <span key={x.id} className={`dot ${i === index ? 'on' : ''} ${progression.characterStatus(x).owned ? '' : 'locked'}`} />
        ))}
      </div>
      <div className="panel char-panel">
        <div className="char-head">
          <div>
            <h3 className="char-name" data-testid="char-name">
              {c.name} {!status.owned && '🔒'}
            </h3>
            <div className="char-title">{c.title}</div>
          </div>
          <span className="char-ref">{c.reference}</span>
        </div>
        <p className="char-desc">{c.description}</p>
        <p className="char-perk">✨ {c.perk}</p>

        <div className="skins">
          {c.skins.map((s) => {
            const own = ownedSkins.includes(s.id);
            return (
              <button
                key={s.id}
                className={`skin-chip ${previewSkin === s.id ? 'on' : ''}`}
                onClick={() => {
                  audio.play('ui');
                  setPreviewSkin(s.id);
                }}
              >
                {s.name}
                {!own && (
                  <span className="skin-cost">
                    <RelicIcon size={14} /> {s.relicCost}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {status.owned ? (
          <div className="char-actions">
            {!skinOwned ? (
              <Btn
                variant="gold"
                disabled={d.relics < skin.relicCost}
                sfx={null}
                onClick={() => {
                  if (progression.buySkin(c.id, skin.id)) audio.play('buy');
                  else audio.play('error');
                }}
              >
                Comprar traje · <RelicIcon size={16} /> {skin.relicCost}
              </Btn>
            ) : selected && (d.selectedSkin[c.id] ?? 'padrao') === previewSkin ? (
              <Btn variant="ghost" disabled>
                ✔ Selecionado
              </Btn>
            ) : (
              <Btn
                variant="green"
                testId="btn-select-char"
                onClick={() => {
                  progression.selectCharacter(c.id);
                  progression.selectSkin(c.id, previewSkin);
                }}
              >
                Selecionar
              </Btn>
            )}
          </div>
        ) : (
          <div className="char-actions">
            <Progress value={status.progress} label={status.label} />
            {(c.unlock.type === 'coins' || c.unlock.type === 'relics') && (
              <Btn
                variant="gold"
                disabled={!status.canUnlock}
                sfx={null}
                testId="btn-unlock-char"
                onClick={() => {
                  if (progression.unlockCharacter(c.id)) audio.play('buy');
                  else audio.play('error');
                }}
              >
                Desbloquear · {status.label}
              </Btn>
            )}
            {(c.unlock.type === 'distance' || c.unlock.type === 'scrolls') && (
              <small className="muted">Desbloqueio automático ao cumprir o desafio.</small>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
