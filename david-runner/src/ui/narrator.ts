/**
 * Narração das histórias com a voz do aparelho (Web Speech API), em português do Brasil.
 * Escolhe a melhor voz pt-BR disponível e fala um pouco mais devagar, para crianças.
 */

let current: SpeechSynthesisUtterance | null = null;
let chosen: SpeechSynthesisVoice | null | undefined;

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

function scoreVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.replace('_', '-').toLowerCase();
  let s: number;
  if (lang === 'pt-br') s = 100;
  else if (lang.startsWith('pt')) s = 40;
  else return -1;
  const n = v.name.toLowerCase();
  if (/natural|neural|online|enhanced|premium|aprimorad|melhorad/.test(n)) s += 30;
  if (n.includes('google')) s += 18;
  if (/luciana|francisca|thalita|vit[oó]ria|camila|let[ií]cia|maria|fernanda/.test(n)) s += 8;
  if (v.localService) s += 2;
  return s;
}

function bestVoice(): SpeechSynthesisVoice | null {
  if (chosen !== undefined) return chosen;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null; // ainda carregando: tenta de novo na próxima fala
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const s = scoreVoice(v);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  chosen = best;
  return chosen;
}

if (speechSupported()) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    chosen = undefined;
  });
}

/** Ajusta o texto para soar natural: referências bíblicas, travessões, aspas. */
const ORD_F = ['', 'Primeira', 'Segunda', 'Terceira'];
const ORD_M = ['', 'Primeiro', 'Segundo', 'Terceiro'];

export function speechText(text: string): string {
  return text
    .replace(/\b([123])\s+(João|Coríntios|Tessalonicenses|Timóteo|Pedro)/g, (_, n: string, b: string) => `${ORD_F[+n]} ${b}`)
    .replace(/\b([123])\s+(Reis|Samuel|Crônicas)/g, (_, n: string, b: string) => `${ORD_M[+n]} ${b}`)
    .replace(/(\d+):(\d+)\s*[-–]\s*(\d+)/g, 'capítulo $1, versículos $2 a $3')
    .replace(/(\d+):(\d+)/g, 'capítulo $1, versículo $2')
    .replace(/(\d+)\s*[–-]\s*(\d+)/g, 'capítulos $1 a $2')
    .replace(/\s+—\s+/g, '. ')
    .replace(/[“”"]/g, '');
}

/** Fala o texto (interrompe o que estiver falando). `onEnd` é chamado ao terminar ou parar. */
export function speak(text: string, onEnd?: () => void): boolean {
  if (!speechSupported()) return false;
  const synth = window.speechSynthesis;
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(speechText(text));
  u.lang = 'pt-BR';
  u.rate = 0.86;
  u.pitch = 1.05;
  const v = bestVoice();
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  }
  const done = () => {
    if (current === u) current = null;
    onEnd?.();
  };
  u.onend = done;
  u.onerror = done;
  current = u; // mantém a referência (no Chrome, sem isso o evento de fim pode se perder)
  synth.speak(u);
  return true;
}

export function stopSpeaking(): void {
  if (!speechSupported()) return;
  const u = current;
  current = null;
  if (u) {
    u.onend = null;
    u.onerror = null;
  }
  const synth = window.speechSynthesis;
  if (synth.speaking || synth.pending) synth.cancel();
}
