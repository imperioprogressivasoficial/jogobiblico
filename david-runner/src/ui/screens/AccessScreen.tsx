import { useState } from 'react';
import { ACCESS_ERRORS, formatCode } from '../../data/access';
import { audio } from '../../game/AudioManager';
import { progression } from '../../state/ProgressionManager';
import { Icon } from '../art/icons';
import { Btn, TopBar } from '../components/common';
import { ParentGate } from '../components/ParentGate';
import { UIManager, useProgress } from '../UIManager';

/**
 * Jogo completo. A criança vê o que ganha e chama um adulto; o responsável (com PIN) digita
 * o código que recebeu ao comprar fora do app. Por regra das lojas: sem preço e sem link de compra.
 */
export function AccessScreen() {
  useProgress();
  const [gate, setGate] = useState(false);
  const [form, setForm] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const a = progression.data.access;
  const active = progression.hasAccess;

  const send = async () => {
    if (busy || code.length < 14) return;
    setBusy(true);
    setErr('');
    const r = await progression.activateAccess(code);
    setBusy(false);
    if (r.ok) {
      audio.play('victory');
      setOk(true);
    } else {
      audio.play('error');
      setErr(ACCESS_ERRORS[r.error] ?? ACCESS_ERRORS.codigo);
    }
  };

  return (
    <div className="screen list-screen access-screen" data-testid="access-screen">
      <TopBar title="Jogo completo" />
      <div className="scroll-area">
        {active && a ? (
          <div className="panel center" data-testid="access-active">
            <Icon name="check" size={48} stroke="#16865a" tone="none" />
            <h2 className="sign-title">Jogo completo liberado!</h2>
            <p className="muted">{a.until ? `Válido até ${new Date(a.until).toLocaleDateString('pt-BR')}.` : 'Acesso sem prazo.'}</p>
            <Btn variant="green" onClick={() => UIManager.back()}>
              Jogar ▶
            </Btn>
          </div>
        ) : (
          <>
            <div className="panel access-perks">
              <h2 className="sign-title">Tem muito mais esperando por você!</h2>
              <ul>
                <li><Icon name="journey" size={22} /> Todas as histórias da Bíblia, da Criação à Igreja</li>
                <li><Icon name="modes" size={22} /> Todos os modos: Show da Fé, Memória, Versículos, Funda de Davi e Exército de Gideão</li>
                <li><Icon name="map" size={22} /> Mundo Aberto para brincar com amigos</li>
              </ul>
              <p className="muted small center">Peça para um adulto da sua família liberar o jogo completo. Só o responsável, com o PIN, ativa o código.</p>
            </div>
            {!form ? (
              <Btn variant="green" size="lg" onClick={() => setGate(true)} testId="access-open">
                Ativar código
              </Btn>
            ) : (
              <div className="panel access-form" data-testid="access-form">
                <label htmlFor="access-code">Código de acesso da família</label>
                <input
                  id="access-code"
                  data-testid="access-code"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="ABCD-EFGH-JKLM"
                  value={code}
                  onChange={(e) => {
                    setCode(formatCode(e.target.value));
                    setErr('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                />
                {err && <p className="access-err" data-testid="access-err">{err}</p>}
                <Btn variant="green" onClick={send} disabled={busy || code.length < 14} testId="access-send">
                  {busy ? 'Conferindo...' : 'Ativar'}
                </Btn>
                <p className="muted small">O código chega por e-mail ou WhatsApp depois da compra. Ele vale em até 3 aparelhos da família.</p>
              </div>
            )}
          </>
        )}
      </div>
      {gate && (
        <ParentGate
          title="Área do responsável"
          detail="Digite o PIN para ativar o código de acesso."
          onCancel={() => setGate(false)}
          onOk={() => {
            setGate(false);
            setForm(true);
          }}
        />
      )}
      {ok && (
        <div className="overlay" data-testid="access-ok">
          <div className="panel center">
            <h2 className="sign-title">Tudo liberado! 🎉</h2>
            <p>Agora todas as histórias e modos estão abertos. Bom jogo!</p>
            <Btn variant="green" onClick={() => UIManager.back()}>
              Oba! ✔
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
