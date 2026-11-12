import { useRef, useState } from 'react';
import { audio } from '../../game/AudioManager';
import { progression } from '../../state/ProgressionManager';
import { Btn } from './common';

/**
 * Área dos pais: pede o PIN do responsável antes de abrir o painel dos pais ou ativar o acesso
 * (criado no cadastro). Sem conta, pede uma conta de adulto (multiplicação).
 */
/**
 * Tentativas erradas seguidas: depois de 5, espera 30 s (a criança não adivinha o PIN).
 * Fica fora do componente para valer mesmo se a janela for fechada e aberta de novo.
 */
const lock = { fails: 0, until: 0 };

export function ParentGate({ title, detail, onOk, onCancel }: { title: string; detail: string; onOk: () => void; onCancel: () => void }) {
  const hasPin = !!progression.data.profile?.pin;
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  /** Impede confirmar duas vezes (toque duplo no último dígito creditaria a compra em dobro). */
  const fired = useRef(false);
  const [q] = useState(() => {
    const a = 6 + Math.floor(Math.random() * 7);
    const b = 3 + Math.floor(Math.random() * 7);
    return { a, b };
  });

  const press = (k: string) => {
    if (fired.current) return;
    if (Date.now() < lock.until) {
      setErr(true);
      return;
    }
    audio.play('ui');
    setErr(false);
    if (k === '⌫') return setPin((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, hasPin ? 4 : 3);
    setPin(next);
    const done = hasPin ? next.length === 4 : next.length >= String(q.a * q.b).length;
    if (!done) return;
    const ok = hasPin ? progression.checkPin(next) : Number(next) === q.a * q.b;
    if (ok) {
      lock.fails = 0;
      fired.current = true;
      onOk();
    } else {
      if (++lock.fails >= 5) {
        lock.fails = 0;
        lock.until = Date.now() + 30000;
      }
      audio.play('error');
      setErr(true);
      setPin('');
    }
  };

  return (
    <div className="overlay" data-testid="parent-gate">
      <div className="panel parent-gate">
        <div className="pg-badge">👨‍👩‍👧 Área dos pais</div>
        <h2>{title}</h2>
        <p className="muted">{detail}</p>
        <p className="pg-ask">{hasPin ? 'Digite o PIN do responsável' : `Quanto é ${q.a} × ${q.b}?`}</p>
        <div className={`pg-dots ${err ? 'shake' : ''}`}>
          {hasPin ? [0, 1, 2, 3].map((i) => <span key={i} className={i < pin.length ? 'on' : ''} />) : <strong>{pin || '—'}</strong>}
        </div>
        {err && <div className="pg-err">{Date.now() < lock.until ? 'Muitas tentativas. Espere 30 segundos.' : hasPin ? 'PIN errado. Peça ajuda a um adulto.' : 'Resposta errada.'}</div>}
        <div className="pg-keys">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
            k ? (
              <button key={i} type="button" className="pg-key" data-testid={`pg-key-${k}`} onClick={() => press(k)}>
                {k}
              </button>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
        <Btn variant="ghost" onClick={onCancel} testId="pg-cancel">
          Cancelar
        </Btn>
      </div>
    </div>
  );
}
