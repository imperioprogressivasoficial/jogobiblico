import { useState } from 'react';
import { audio } from '../../game/AudioManager';
import { progression, type Settings } from '../../state/ProgressionManager';
import { Btn, TopBar } from '../components/common';
import { UIManager, applySettings, useProgress } from '../UIManager';

function Segmented<T extends string>(props: { value: T; options: [T, string][]; onChange: (v: T) => void; testId?: string }) {
  return (
    <div className="segmented" data-testid={props.testId}>
      {props.options.map(([v, label]) => (
        <button
          key={v}
          className={props.value === v ? 'on' : ''}
          onClick={() => {
            audio.play('ui');
            props.onChange(v);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function SettingsScreen() {
  useProgress();
  const s = progression.data.settings;
  const [confirmReset, setConfirmReset] = useState(false);
  const set = (p: Partial<Settings>) => {
    progression.updateSettings(p);
    applySettings();
  };
  const isTouch = window.matchMedia?.('(pointer: coarse)').matches;

  return (
    <div className="screen list-screen" data-testid="settings-screen">
      <TopBar title="Configurações" right={<span />} />
      <div className="scroll-area">
        {progression.data.profile && (
          <section className="settings-group" data-testid="settings-account">
            <h3 className="section-title">👤 Conta</h3>
            <div className="setting-row">
              <span>Jogador</span>
              <span className="setting-val">
                {progression.data.profile.childName}, {progression.data.profile.age} anos
              </span>
            </div>
            <div className="setting-row">
              <span>Responsável</span>
              <span className="setting-val">{progression.data.profile.parentEmail}</span>
            </div>
            <div className="setting-row">
              <span>Compras protegidas por PIN</span>
              <span className="setting-val">✔ Ativo</span>
            </div>
          </section>
        )}
        <section className="settings-group">
          <h3 className="section-title">Áudio</h3>
          <label className="setting-row">
            <span>🎵 Música</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.music}
              data-testid="music-volume"
              onChange={(e) => set({ music: Number(e.target.value) })}
            />
            <span className="setting-val">{Math.round(s.music * 100)}%</span>
          </label>
          <label className="setting-row">
            <span>🔊 Efeitos</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.sfx}
              data-testid="sfx-volume"
              onChange={(e) => set({ sfx: Number(e.target.value) })}
              onPointerUp={() => audio.play('coin')}
            />
            <span className="setting-val">{Math.round(s.sfx * 100)}%</span>
          </label>
        </section>

        <section className="settings-group">
          <h3 className="section-title">Jogo</h3>
          <div className="setting-row">
            <span>Dificuldade</span>
            <Segmented
              value={s.difficulty}
              options={[
                ['crianca', '🧒 Criança'],
                ['normal', 'Normal'],
              ]}
              onChange={(v) => set({ difficulty: v })}
              testId="difficulty"
            />
          </div>
          <small className="muted">
            {s.difficulty === 'crianca'
              ? 'Modo Criança: a corrida é mais lenta e acelera com calma. Ótimo para os pequenos!'
              : 'Modo Normal: a corrida fica mais rápida e desafiadora.'}
          </small>
        </section>

        <section className="settings-group">
          <h3 className="section-title">Controles</h3>
          <div className="setting-row">
            <span>Sensibilidade do gesto</span>
            <Segmented
              value={s.sensitivity}
              options={[
                ['baixa', 'Baixa'],
                ['media', 'Média'],
                ['alta', 'Alta'],
              ]}
              onChange={(v) => set({ sensitivity: v })}
              testId="sensitivity"
            />
          </div>
          <div className="setting-row">
            <span>Vibração ao colidir</span>
            <Segmented
              value={s.vibration ? 'on' : 'off'}
              options={[
                ['on', 'Ligada'],
                ['off', 'Desligada'],
              ]}
              onChange={(v) => set({ vibration: v === 'on' })}
            />
          </div>
          <div className="setting-row">
            <span>Dicas nas primeiras corridas</span>
            <Segmented
              value={s.showHints ? 'on' : 'off'}
              options={[
                ['on', 'Sim'],
                ['off', 'Não'],
              ]}
              onChange={(v) => set({ showHints: v === 'on' })}
            />
          </div>
          <div className="controls-help">
            <div>
              <strong>{isTouch ? '📱 Celular' : '📱 Celular (toque)'}</strong>
              <ul>
                <li>Deslize ← → para trocar de pista</li>
                <li>Deslize ↑ para pular</li>
                <li>Deslize ↓ para deslizar (no ar, desce rápido)</li>
                <li>Toque duas vezes: Carruagem de Fogo 🔥</li>
              </ul>
            </div>
            <div>
              <strong>💻 Computador</strong>
              <ul>
                <li>← → ou A / D: trocar de pista</li>
                <li>↑, W ou Espaço: pular</li>
                <li>↓ ou S: deslizar</li>
                <li>E ou Shift: Carruagem de Fogo 🔥</li>
                <li>Esc ou P: pausar</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="settings-group">
          <h3 className="section-title">Gráficos</h3>
          <div className="setting-row">
            <span>Qualidade</span>
            <Segmented
              value={s.quality}
              options={[
                ['auto', 'Auto'],
                ['alta', 'Alta'],
                ['media', 'Média'],
                ['baixa', 'Baixa'],
              ]}
              onChange={(v) => {
                set({ quality: v });
                const e = UIManager.engine;
                if (e) e.setQuality(v === 'auto' ? 'alta' : v);
              }}
              testId="quality"
            />
          </div>
          <small className="muted">No modo automático, a qualidade é reduzida se o aparelho ficar lento.</small>
        </section>

        <section className="settings-group">
          <h3 className="section-title">Progresso</h3>
          {!confirmReset ? (
            <Btn variant="red" size="sm" onClick={() => setConfirmReset(true)}>
              Apagar progresso
            </Btn>
          ) : (
            <div className="confirm-row">
              <span>Tem certeza? Denários, recordes e desbloqueios serão apagados.</span>
              <Btn
                variant="red"
                size="sm"
                onClick={() => {
                  progression.resetProgress();
                  setConfirmReset(false);
                  UIManager.showMenuScene();
                }}
              >
                Sim, apagar
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                Cancelar
              </Btn>
            </div>
          )}
        </section>

        <section className="settings-group about">
          <h3 className="section-title">Sobre</h3>
          <p>
            <strong>DAVID RUNNER — Corra pela História</strong> · versão 1.0
          </p>
          <p className="muted">
            Personagens, cenários e músicas originais. Modelos 3D construídos em código e áudio sintetizado em tempo real — sem
            recursos de terceiros. Desenvolvido para a Império Progressivas.
          </p>
        </section>
      </div>
    </div>
  );
}
