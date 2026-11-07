import { useEffect, useRef, useState } from 'react';
import { audio } from '../../game/AudioManager';
import { MODES } from '../../data/modes';
import { NPC_DEFS } from '../../game/Npcs';
import { progression } from '../../state/ProgressionManager';
import { speak, stopSpeaking } from '../narrator';
import { UIManager } from '../UIManager';
import { featuredToday } from '../screens/ShopScreen';

/**
 * Balões de fala dos NPCs do lobby. Cada NPC escolhe a frase mais relevante para o momento
 * (história do dia, passo da jornada, loja, sequência, hora do dia). Tocar no NPC faz ele
 * parar, acenar e falar; de tempos em tempos um deles puxa assunto sozinho.
 */
interface Line {
  text: string;
  /** Quanto mais alto, mais relevante agora. */
  weight: number;
  go?: () => void;
}

function linesFor(id: string): Line[] {
  const d = progression.data;
  const name = d.profile?.childName ?? 'amigo';
  const dl = d.daily;
  const story = progression.dailyStory();
  const mode = MODES.find((m) => m.id === dl.challenge) ?? MODES[1];
  const h = new Date().getHours();
  const hello = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const feat = featuredToday().skins[0];
  const all = dl.story && dl.challenge_done && dl.run;
  const L: Line[] = [];
  if (id === 'eli') {
    L.push({ text: `${hello}, ${name}! Na minha barraca tem novidade: a roupa "${feat.s.name}" está com desconto só hoje!`, weight: feat.owned ? 1 : 4, go: () => { UIManager.shopTab = 'destaque'; UIManager.go('shop'); } });
    L.push({ text: 'Sabia que um denário era o pagamento de um dia inteiro de trabalho? Está escrito em Mateus 20!', weight: 2, go: () => UIManager.go('coins-info') });
    L.push({ text: `Você tem ${d.coins.toLocaleString('pt-BR')} denários. Guarde bem, como o servo fiel da parábola!`, weight: 1.5 });
  }
  if (id === 'ana') {
    L.push({ text: dl.story ? `Que bom que você viveu "${story.title}" hoje, ${name}! Lembra da lição? ${story.lesson}` : `${hello}, ${name}! A história de hoje é "${story.title}". Vamos vivê-la juntos?`, weight: dl.story ? 2 : 5, go: dl.story ? undefined : () => UIManager.startStoryRun(story) });
    L.push({ text: `O versículo de hoje: ${story.verse}`, weight: 2.5 });
    L.push({ text: 'Jesus disse: "Eu sou o bom pastor". Ele cuida de cada ovelhinha, e de você também!', weight: 1.5 });
  }
  if (id === 'tomas') {
    L.push({ text: all && !dl.chest ? `${name}, você terminou a Jornada do Dia! Corre lá abrir o Baú!` : all ? 'Você já abriu o baú de hoje. Amanhã tem mais!' : !dl.challenge_done ? `Vem jogar ${mode.name} comigo? É o desafio de hoje!` : `Falta a corrida de 150 metros pra ganhar o baú, ${name}!`, weight: 5, go: !dl.challenge_done ? () => UIManager.go(mode.screen === 'run' ? 'modes' : mode.screen) : undefined });
    L.push({ text: dl.streak >= 2 ? `Uau, ${dl.streak} dias seguidos! Não perde a sequência, hein!` : 'Se você jogar todo dia, a chama da sequência cresce!', weight: dl.streak >= 2 ? 3 : 1.5 });
    L.push({ text: 'Toque duas vezes na tela durante a corrida pra usar o poder. É demais!', weight: 1 });
  }
  return L;
}

function pick(id: string): Line {
  const L = linesFor(id);
  const total = L.reduce((s, l) => s + l.weight, 0);
  let r = Math.random() * total;
  for (const l of L) {
    r -= l.weight;
    if (r <= 0) return l;
  }
  return L[0];
}

interface Pos {
  id: string;
  name: string;
  x: number;
  y: number;
  depth: number;
}

export function NpcBubbles() {
  const [pos, setPos] = useState<Pos[]>([]);
  const [bubble, setBubble] = useState<{ id: string; line: Line } | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const e = UIManager.engine;
      if (!e || e.mode !== 'menu') return;
      setPos(e.npcs.screenPositions(e.cameraCtl.camera));
      // puxa assunto sozinho de vez em quando
      timer.current += (t - last) / 1000;
      last = t;
      if (!bubble && timer.current > 9) {
        timer.current = 0;
        const def = NPC_DEFS[Math.floor(Math.random() * NPC_DEFS.length)];
        say(def.id, false);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubble]);

  function say(id: string, voice: boolean) {
    const line = pick(id);
    UIManager.engine?.npcs.greet(id);
    setBubble({ id, line });
    if (voice) speak(line.text, () => undefined);
    window.setTimeout(() => setBubble((b) => (b && b.id === id ? null : b)), 6500);
  }

  return (
    <div className="npc-layer" aria-hidden={false}>
      {pos
        .filter((p) => p.depth < 1 && p.x > -0.1 && p.x < 1.1)
        .map((p) => (
          <div key={p.id} className="npc-anchor" style={{ left: `${Math.min(0.68, Math.max(0.32, p.x)) * 100}%`, top: `${Math.min(0.6, Math.max(0.22, p.y)) * 100}%` }}>
            {bubble?.id === p.id ? (
              <button
                type="button"
                className="npc-bubble"
                data-testid={`npc-bubble-${p.id}`}
                onClick={() => {
                  audio.play('ui');
                  bubble.line.go?.();
                }}
              >
                <small>{p.name}</small>
                {bubble.line.text}
                {bubble.line.go && <span className="npc-go">Vamos? ▶</span>}
              </button>
            ) : (
              <button type="button" className="npc-tap" data-testid={`npc-${p.id}`} aria-label={`Falar com ${p.name}`} onClick={() => { audio.unlock(); audio.play('ui'); say(p.id, true); }}>
                💬
              </button>
            )}
          </div>
        ))}
    </div>
  );
}
