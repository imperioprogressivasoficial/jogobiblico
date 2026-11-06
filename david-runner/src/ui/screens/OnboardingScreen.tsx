import { useState } from 'react';
import { audio } from '../../game/AudioManager';
import { CHARACTERS } from '../../data/characters';
import { progression } from '../../state/ProgressionManager';
import { Btn, CoinIcon, Logo, RelicIcon } from '../components/common';
import { UIManager } from '../UIManager';
import { Portrait } from '../art/Portrait';

/** Presente de boas-vindas ao criar a conta. */
const WELCOME = { coins: 300, talents: 3 };

/**
 * Cadastro na primeira abertura: a criança diz o nome, a idade e escolhe o herói;
 * o responsável cria o PIN das compras, informa o e-mail e aceita os termos.
 */
export function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState(0);
  const [avatar, setAvatar] = useState('davi');
  const [gender, setGender] = useState<'m' | 'f' | null>(null);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [consent, setConsent] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const pinOk = /^\d{4}$/.test(pin) && pin === pin2;
  const canNext = [true, name.trim().length >= 2, age > 0, !!gender, !!avatar, emailOk && pinOk && consent, true][step];
  const total = 6;

  const next = () => {
    if (!canNext) {
      audio.play('error');
      return;
    }
    audio.play('ui');
    if (step === 5) {
      progression.createProfile({ childName: name.trim(), age, gender: gender ?? 'm', avatar, parentEmail: email.trim().toLowerCase(), pin, consent });
      progression.grantPack('boas-vindas', WELCOME.coins, WELCOME.talents, true);
      audio.play('victory');
    }
    if (step === 6) {
      UIManager.showMenuScene();
      UIManager.go('menu', true);
      return;
    }
    setStep(step + 1);
  };

  return (
    <div className="screen onboarding" data-testid="onboarding">
      <div className="ob-sky" aria-hidden="true">
        <span>☁️</span>
        <span>☁️</span>
        <span>⭐</span>
      </div>
      {step > 0 && step < 6 && (
        <div className="ob-progress" aria-hidden="true">
          {Array.from({ length: total - 1 }, (_, i) => (
            <span key={i} className={i < step ? 'on' : ''} />
          ))}
        </div>
      )}
      <div className="ob-card" key={step}>
        {step === 0 && (
          <>
            <Logo small />
            <h1 className="ob-title">Bem-vindo à aventura!</h1>
            <p className="ob-text">Corra com os heróis da Bíblia, jogue, aprenda as histórias e ganhe prêmios. Vamos criar sua conta?</p>
          </>
        )}

        {step === 1 && (
          <>
            <div className="ob-emoji">👋</div>
            <h1 className="ob-title">Qual é o seu nome?</h1>
            <input
              className="ob-input"
              data-testid="ob-name"
              autoFocus
              maxLength={20}
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && next()}
            />
          </>
        )}

        {step === 2 && (
          <>
            <div className="ob-emoji">🎂</div>
            <h1 className="ob-title">Quantos anos você tem, {name.trim()}?</h1>
            <div className="ob-ages">
              {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`ob-age ${age === a ? 'on' : ''}`}
                  data-testid={`ob-age-${a}`}
                  onClick={() => {
                    audio.play('ui');
                    setAge(a);
                  }}
                >
                  {a === 12 ? '12+' : a}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="ob-emoji">🧒</div>
            <h1 className="ob-title">Você é menino ou menina?</h1>
            <div className="ob-genders">
              {(
                [
                  ['m', 'Menino', 'davi'],
                  ['f', 'Menina', 'ester'],
                ] as const
              ).map(([g, label, hero]) => (
                <button
                  key={g}
                  type="button"
                  className={`ob-hero ob-gender ${gender === g ? 'on' : ''}`}
                  data-testid={`ob-gender-${g}`}
                  onClick={() => {
                    audio.play('ui');
                    setGender(g);
                    setAvatar(hero);
                  }}
                >
                  <Portrait charId={hero} size={74} className="ob-hero-face" />
                  <strong>{label}</strong>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="ob-title">Escolha o seu herói</h1>
            <p className="ob-text small">O primeiro é de presente. Os outros você libera jogando!</p>
            <div className="ob-heroes">
              {CHARACTERS.filter((c) => c.gender === (gender ?? 'm')).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`ob-hero ${avatar === c.id ? 'on' : ''}`}
                  data-testid={`ob-hero-${c.id}`}
                  onClick={() => {
                    audio.play('ui');
                    setAvatar(c.id);
                  }}
                >
                  <Portrait charId={c.id} size={58} className="ob-hero-face" />
                  <strong>{c.name}</strong>
                </button>
              ))}
            </div>
            <p className="ob-text small">{CHARACTERS.find((c) => c.id === avatar)?.title}</p>
          </>
        )}

        {step === 5 && (
          <>
            <div className="ob-emoji">👨‍👩‍👧</div>
            <h1 className="ob-title">Agora chame um adulto</h1>
            <p className="ob-text small">O responsável cria o PIN que protege as compras e recebe as novidades por e-mail.</p>
            <label className="ob-label">
              E-mail do responsável
              <input className="ob-input" data-testid="ob-email" type="email" inputMode="email" autoComplete="email" placeholder="nome@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <div className="ob-row">
              <label className="ob-label">
                PIN (4 números)
                <input className="ob-input ob-pin" data-testid="ob-pin" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
              </label>
              <label className="ob-label">
                Repita o PIN
                <input className="ob-input ob-pin" data-testid="ob-pin2" type="password" inputMode="numeric" maxLength={4} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
              </label>
            </div>
            {pin2.length === 4 && pin !== pin2 && <div className="pg-err">Os PINs não são iguais.</div>}
            <label className="ob-consent">
              <input type="checkbox" data-testid="ob-consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>Sou o responsável e aceito os Termos de Uso e a Política de Privacidade. Os dados ficam guardados neste aparelho.</span>
            </label>
          </>
        )}

        {step === 6 && (
          <>
            <div className="ob-emoji ob-bounce">🎉</div>
            <h1 className="ob-title">Tudo pronto, {name.trim()}!</h1>
            <p className="ob-text">Presente de boas-vindas:</p>
            <div className="ob-gift">
              <span>
                <CoinIcon size={28} /> {WELCOME.coins}
              </span>
              <span>
                <RelicIcon size={28} /> {WELCOME.talents}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="ob-nav">
        {step > 0 && step < 6 && (
          <Btn variant="wood" onClick={() => setStep(step - 1)} sfx="uiBack" testId="ob-back">
            ◀
          </Btn>
        )}
        <Btn variant="green" size="lg" onClick={next} disabled={!canNext} sfx={null} testId="ob-next" className="ob-next">
          {step === 0 ? 'Criar conta' : step === 5 ? 'Criar conta ✔' : step === 6 ? 'Começar a jogar ▶' : 'Próximo ▶'}
        </Btn>
      </div>
    </div>
  );
}
