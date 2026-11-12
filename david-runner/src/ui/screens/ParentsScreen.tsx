import { useState } from 'react';
import { STORY } from '../../data/story';
import { MODES } from '../../data/modes';
import { progression } from '../../state/ProgressionManager';
import { ParentGate } from '../components/ParentGate';
import { Btn, TopBar } from '../components/common';
import { Icon } from '../art/icons';
import { UIManager, fmt, useProgress } from '../UIManager';

/**
 * Painel dos Pais (atrás do PIN): o que a criança fez hoje, a pergunta pronta para
 * a mesa do jantar, a semana e os controles da conta.
 */
export function ParentsScreen() {
  useProgress();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div className="screen list-screen" data-testid="parents-locked">
        <TopBar title="Painel dos Pais" />
        <ParentGate title="Painel dos Pais" detail="Resumo do que a criança aprendeu, pergunta do dia e controles." onOk={() => setOpen(true)} onCancel={() => UIManager.back()} />
      </div>
    );
  }
  return <Panel />;
}

function Panel() {
  const d = progression.data;
  const p = d.profile;
  const dl = d.daily;
  const story = progression.dailyStory();
  const mode = MODES.find((m) => m.id === dl.challenge) ?? MODES[1];
  const done = [dl.story, dl.challenge_done, dl.run].filter(Boolean).length;
  const readToday = STORY.filter((s) => d.storiesRead.includes(s.id));
  const lastRead = readToday.length ? readToday[readToday.length - 1] : null;
  // a pergunta do dia vem da história do dia (se já vivida) ou da última lida
  const q = dl.story ? story : lastRead;
  return (
    <div className="screen list-screen parents" data-testid="parents-screen">
      <TopBar title="Painel dos Pais" />
      <div className="scroll-area">
        {!p?.pin && <ParentSetup />}
        <section className="pp-card pp-today">
          <header>
            <Icon name="star" size={18} tone="#ffd23f" stroke="#ffd23f" />
            <strong>Hoje · {p?.childName ?? 'Jogador'}</strong>
            <span className="pp-badge">
              {done}/3 {done === 3 ? '✔' : ''}
            </span>
          </header>
          <ul className="pp-steps">
            <li className={dl.story ? 'on' : ''}>
              <Icon name={dl.story ? 'check' : 'journey'} size={18} /> História: <b>{story.title}</b>
            </li>
            <li className={dl.challenge_done ? 'on' : ''}>
              <Icon name={dl.challenge_done ? 'check' : mode.icon} size={18} /> Desafio: <b>{mode.name}</b>
            </li>
            <li className={dl.run ? 'on' : ''}>
              <Icon name={dl.run ? 'check' : 'run'} size={18} /> Corrida curta (150 m)
            </li>
          </ul>
          <div className="pp-streak">
            <Icon name="fire" size={18} tone="#ff9a2e" stroke="#ff6a1a" /> Sequência: <b>{dl.streak}</b> {dl.streak === 1 ? 'dia' : 'dias'}
          </div>
        </section>

        {q ? (
          <section className="pp-card pp-ask" data-testid="pp-question">
            <header>
              <Icon name="family" size={18} />
              <strong>Pergunte hoje</strong>
            </header>
            <p className="pp-q">“{q.quiz.question}”</p>
            <p className="pp-a">
              <small>Resposta esperada</small>
              {q.quiz.options[q.quiz.answer]}
            </p>
            <p className="pp-lesson">
              <small>Lição do dia</small>
              {q.lesson}
            </p>
            <p className="pp-verse">
              <small>Versículo</small>
              {q.verse}
            </p>
            <small className="muted">{q.title} · {q.reference}</small>
          </section>
        ) : (
          <section className="pp-card">
            <p className="muted center">Quando a criança viver a primeira história, a pergunta do dia aparece aqui.</p>
          </section>
        )}

        <section className="pp-card">
          <header>
            <Icon name="records" size={18} />
            <strong>Progresso</strong>
          </header>
          <div className="pp-grid">
            <div>
              <b>{d.storiesRead.length}</b>
              <small>de {STORY.length} histórias</small>
            </div>
            <div>
              <b>{d.storyQuizzes.length}</b>
              <small>quizzes acertados</small>
            </div>
            <div>
              <b>{fmt(d.stats.totalRuns)}</b>
              <small>corridas</small>
            </div>
            <div>
              <b>{fmt(Math.round(d.stats.totalDistance / 1000))} km</b>
              <small>percorridos</small>
            </div>
          </div>
        </section>

        <section className="pp-card">
          <header>
            <Icon name="settings" size={18} />
            <strong>Conta</strong>
          </header>
          <div className="setting-row">
            <span>Responsável</span>
            <span className="setting-val">{p?.parentEmail}</span>
          </div>
          <div className="setting-row">
            <span>Área dos pais com PIN</span>
            <span className="setting-val">✔ Ativo</span>
          </div>
          <div className="setting-row">
            <span>Denários · Talentos</span>
            <span className="setting-val">
              {fmt(d.coins)} · {fmt(d.relics)}
            </span>
          </div>
          <Btn variant="wood" size="sm" onClick={() => UIManager.go('settings')}>
            Configurações do jogo
          </Btn>
        </section>
      </div>
    </div>
  );
}

/** Primeira vez no painel: o responsável cria o PIN, informa o e-mail e aceita os termos. */
function ParentSetup() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [consent, setConsent] = useState(false);
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && /^\d{4}$/.test(pin) && pin === pin2 && consent;
  return (
    <section className="pp-card pp-setup" data-testid="pp-setup">
      <header>
        <Icon name="family" size={18} />
        <strong>Configure a área dos pais</strong>
      </header>
      <p className="muted small">Crie um PIN de 4 números. Ele protege este painel e a ativação do jogo completo.</p>
      <label className="ob-label">
        E-mail do responsável
        <input className="ob-input" data-testid="pp-email" type="email" inputMode="email" autoComplete="email" placeholder="nome@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <div className="ob-row">
        <label className="ob-label">
          PIN
          <input className="ob-input ob-pin" data-testid="pp-pin" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        </label>
        <label className="ob-label">
          Repita o PIN
          <input className="ob-input ob-pin" data-testid="pp-pin2" type="password" inputMode="numeric" maxLength={4} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
        </label>
      </div>
      {pin2.length === 4 && pin !== pin2 && <div className="pg-err">Os PINs não são iguais.</div>}
      <label className="ob-consent">
        <input type="checkbox" data-testid="pp-consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Sou o responsável e aceito os Termos de Uso e a Política de Privacidade. Os dados ficam guardados neste aparelho.</span>
      </label>
      <Btn variant="green" disabled={!ok} testId="pp-save" onClick={() => progression.updateProfile({ parentEmail: email.trim().toLowerCase(), pin, consent: true })}>
        Salvar ✔
      </Btn>
    </section>
  );
}
