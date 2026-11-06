/**
 * Áudio 100% original e procedural (Web Audio API): nenhuma amostra externa.
 * Músicas inspiradas em escalas do Oriente Médio (Hijaz em Ré) e efeitos sintetizados.
 */

type Song = {
  tempo: number;
  melody: number[][]; // seções (colcheias), 0 = pausa
  bass: number[]; // semínimas por compasso (4 por compasso)
  drums: boolean;
  drone: boolean;
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

const SONGS: Record<'menu' | 'game', Song> = {
  game: {
    tempo: 124,
    melody: [
      [74, 0, 69, 70, 69, 67, 66, 67, 69, 0, 0, 66, 67, 69, 70, 69, 72, 0, 70, 69, 70, 69, 67, 66, 67, 66, 63, 62, 0, 0, 62, 0],
      [62, 63, 66, 67, 69, 0, 69, 0, 70, 69, 67, 66, 67, 0, 0, 0, 74, 72, 70, 69, 70, 72, 74, 0, 69, 67, 66, 63, 62, 0, 0, 0],
    ],
    bass: [38, 0, 45, 0, 38, 0, 45, 0, 43, 0, 50, 0, 45, 0, 38, 0],
    drums: true,
    drone: false,
  },
  menu: {
    tempo: 84,
    melody: [
      [62, 0, 0, 63, 66, 0, 67, 0, 69, 0, 0, 0, 67, 66, 63, 0, 66, 0, 67, 69, 70, 0, 69, 0, 67, 0, 66, 0, 62, 0, 0, 0],
      [69, 0, 70, 0, 72, 0, 70, 69, 67, 0, 0, 0, 66, 67, 69, 0, 70, 69, 67, 66, 63, 0, 66, 0, 62, 0, 0, 0, 0, 0, 0, 0],
    ],
    bass: [38, 0, 0, 0, 38, 0, 0, 0, 43, 0, 0, 0, 45, 0, 0, 0],
    drums: false,
    drone: true,
  },
};

export type Sfx =
  | 'coin'
  | 'jump'
  | 'slide'
  | 'land'
  | 'lane'
  | 'crash'
  | 'stumble'
  | 'powerup'
  | 'scroll'
  | 'relic'
  | 'shieldBreak'
  | 'ui'
  | 'uiBack'
  | 'buy'
  | 'error'
  | 'gameover'
  | 'achievement'
  | 'chariot'
  | 'chariotEnd'
  | 'smash'
  | 'victory'
  | 'oops'
  | 'page';

/** WAV de silêncio (0,1 s, 8 kHz, 8 bits) gerado em código, sem arquivo externo. */
const SILENT_WAV = (() => {
  const n = 800;
  const b = new Uint8Array(44 + n);
  const v = new DataView(b.buffer);
  const str = (o: number, t: string) => [...t].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
  let bin = '';
  b.forEach((x) => (bin += String.fromCharCode(x)));
  return 'data:audio/wav;base64,' + btoa(bin);
})();

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private noise!: AudioBuffer;
  private song: Song | null = null;
  private songName: 'menu' | 'game' | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private droneNodes: { osc: OscillatorNode[]; gain: GainNode } | null = null;
  private musicVolume = 0.6;
  private sfxVolume = 0.8;
  private coinCombo = 0;
  private lastCoin = 0;
  private suspendedByPause = false;
  private paused = false;
  /** Som contínuo de fogo/vento da Carruagem de Fogo. */
  private boostLoop: { src: AudioBufferSourceNode; lfo: OscillatorNode; gain: GainNode } | null = null;
  private boostWanted = false;

  /** Deve ser chamado a partir de um gesto do usuário (política dos navegadores). */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.applyVolumes();
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.songName) this.playMusic(this.songName, true);
      if (this.boostWanted) {
        this.boostWanted = false;
        this.setBoostLoop(true);
      }
    }
    // No iPhone o contexto também pode ficar "interrupted" (não só "suspended"): retoma sempre que não estiver tocando.
    if (this.ctx.state !== 'running' && !this.suspendedByPause) void this.ctx.resume().catch(() => {});
    this.unlockIOS();
  }

  private iosUnlocked = false;
  private silentEl: HTMLAudioElement | null = null;

  /**
   * iPhone/iPad: o Web Audio segue o botão de silêncio por padrão.
   * 1) navigator.audioSession.type = 'playback' (iOS 16.4+) faz o jogo tocar mesmo no silencioso;
   * 2) um <audio> mudo em loop, iniciado no toque, coloca a sessão de áudio em modo reprodução nos iOS mais antigos.
   */
  private unlockIOS(): void {
    try {
      const nav = navigator as unknown as { audioSession?: { type: string } };
      if (nav.audioSession && nav.audioSession.type !== 'playback') nav.audioSession.type = 'playback';
    } catch {
      /* sem suporte */
    }
    if (this.iosUnlocked) return;
    try {
      if (!this.silentEl) {
        const el = document.createElement('audio');
        el.src = SILENT_WAV;
        el.loop = true;
        el.setAttribute('playsinline', '');
        el.setAttribute('webkit-playsinline', '');
        el.preload = 'auto';
        this.silentEl = el;
      }
      const pr = this.silentEl.play();
      if (pr) pr.then(() => (this.iosUnlocked = true)).catch(() => {});
      else this.iosUnlocked = true;
    } catch {
      /* sem suporte */
    }
  }

  get ready(): boolean {
    return !!this.ctx;
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.55 * (this.paused ? 0.15 : 1) * (this.ducked ? 0.3 : 1), this.ctx.currentTime, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.02);
  }

  /** Na pausa a música fica bem baixinha; os sons de interface continuam. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.55 * (paused ? 0.15 : 1) * (this.ducked ? 0.3 : 1), this.ctx.currentTime, 0.08);
  }

  private ducked = false;
  /** Abaixa a música enquanto o narrador fala. */
  setDucked(d: boolean): void {
    this.ducked = d;
    this.applyVolumes();
  }

  /** Suspende todo o áudio quando a aba fica oculta. */
  setHidden(hidden: boolean): void {
    this.suspendedByPause = hidden;
    if (!this.ctx) return;
    if (hidden) {
      void this.ctx.suspend();
      this.silentEl?.pause();
      this.iosUnlocked = false;
    } else {
      void this.ctx.resume().catch(() => {});
      this.unlockIOS();
    }
  }

  // ------------------------------------------------------------------ música
  playMusic(name: 'menu' | 'game', force = false): void {
    if (this.songName === name && !force && this.timer !== null) return;
    this.songName = name;
    if (!this.ctx) return;
    this.stopMusic(false);
    this.song = SONGS[name];
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    if (this.song.drone) this.startDrone();
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic(clearName = true): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (clearName) this.songName = null;
    if (this.droneNodes && this.ctx) {
      const { osc, gain } = this.droneNodes;
      gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      osc.forEach((o) => o.stop(this.ctx!.currentTime + 1));
      this.droneNodes = null;
    }
  }

  private startDrone(): void {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.045, ctx.currentTime, 1.2);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    gain.connect(filter).connect(this.musicGain);
    const osc = [50, 57, 62].map((n, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sawtooth' : 'triangle';
      o.frequency.value = midi(n);
      o.detune.value = i * 4;
      o.connect(gain);
      o.start();
      return o;
    });
    this.droneNodes = { osc, gain };
  }

  private schedule(): void {
    const ctx = this.ctx;
    const song = this.song;
    if (!ctx || !song) return;
    const eighth = 60 / song.tempo / 2;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const t = this.nextTime;
      const sectionLen = song.melody[0].length;
      const section = Math.floor(this.step / sectionLen) % song.melody.length;
      const i = this.step % sectionLen;
      const note = song.melody[section][i];
      if (note) this.pluck(midi(note), t, eighth * 1.8, song.drums ? 0.16 : 0.14);
      // baixo em semínimas
      if (i % 2 === 0) {
        const bn = song.bass[(i / 2) % song.bass.length];
        if (bn) this.bassNote(midi(bn), t, eighth * (song.drums ? 1.8 : 7), song.drums ? 0.2 : 0.12);
      }
      if (song.drums) {
        const pos = i % 8; // maqsum: D T . T D . T .
        if (pos === 0 || pos === 4) this.kick(t, 0.5);
        if (pos === 1 || pos === 3 || pos === 6) this.tak(t, pos === 6 ? 0.22 : 0.16);
        this.shaker(t, 0.035);
        this.shaker(t + eighth / 2, 0.02);
      }
      this.nextTime += eighth;
      this.step++;
    }
  }

  private env(t: number, attack: number, decay: number, vol: number, dest: AudioNode): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(dest);
    return g;
  }

  private pluck(freq: number, t: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const g = this.env(t, 0.006, dur, vol, this.musicGain);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq * 6, t);
    f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
    f.connect(g);
    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = freq * 1.002;
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    o1.connect(f);
    o2.connect(g2).connect(f);
    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
  }

  private bassNote(freq: number, t: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const g = this.env(t, 0.01, dur, vol, this.musicGain);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = freq * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    o.connect(g);
    o2.connect(g2).connect(g);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
  }

  private kick(t: number, vol: number, dest?: AudioNode): void {
    const ctx = this.ctx!;
    const g = this.env(t, 0.004, 0.22, vol, dest ?? this.musicGain);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.3);
  }

  private noiseHit(t: number, vol: number, dur: number, type: BiquadFilterType, freq: number, dest: AudioNode, q = 1, freqEnd?: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    f.Q.value = q;
    const g = this.env(t, 0.003, dur, vol, dest);
    src.connect(f).connect(g);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  private tak(t: number, vol: number): void {
    this.noiseHit(t, vol, 0.07, 'bandpass', 2200, this.musicGain, 1.4);
    const o = this.ctx!.createOscillator();
    o.frequency.value = 420;
    const g = this.env(t, 0.002, 0.05, vol * 0.4, this.musicGain);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.08);
  }

  private shaker(t: number, vol: number): void {
    this.noiseHit(t, vol, 0.035, 'highpass', 7000, this.musicGain);
  }

  private tone(freq: number, t: number, dur: number, vol: number, type: OscillatorType = 'sine', freqEnd?: number): void {
    const ctx = this.ctx!;
    const g = this.env(t, 0.005, dur, vol, this.sfxGain);
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // ------------------------------------------------------------------ Carruagem de Fogo
  /** Liga/desliga o rugido do fogo enquanto a carruagem está ativa (idempotente). */
  setBoostLoop(on: boolean): void {
    if (on === this.boostWanted) return;
    this.boostWanted = on;
    const ctx = this.ctx;
    if (!ctx) return;
    if (on) {
      if (this.boostLoop) return;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const low = ctx.createBiquadFilter();
      low.type = 'bandpass';
      low.frequency.value = 520;
      low.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(0.16, ctx.currentTime, 0.12);
      // tremulação das chamas
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 9;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 260;
      lfo.connect(lfoGain).connect(low.frequency);
      src.connect(low).connect(gain).connect(this.sfxGain);
      src.start();
      lfo.start();
      this.boostLoop = { src, lfo, gain };
    } else if (this.boostLoop) {
      const { src, lfo, gain } = this.boostLoop;
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      src.stop(ctx.currentTime + 0.8);
      lfo.stop(ctx.currentTime + 0.8);
      this.boostLoop = null;
    }
  }

  // ------------------------------------------------------------------ efeitos
  play(sfx: Sfx): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.005;
    switch (sfx) {
      case 'coin': {
        const now = performance.now();
        this.coinCombo = now - this.lastCoin < 450 ? Math.min(this.coinCombo + 1, 10) : 0;
        this.lastCoin = now;
        const base = 1318 * Math.pow(2, this.coinCombo / 24);
        this.tone(base, t, 0.07, 0.12, 'square');
        this.tone(base * 1.5, t + 0.055, 0.16, 0.1, 'sine');
        break;
      }
      case 'jump':
        this.tone(240, t, 0.16, 0.18, 'triangle', 640);
        this.noiseHit(t, 0.06, 0.15, 'bandpass', 900, this.sfxGain, 0.8, 2400);
        break;
      case 'slide':
        this.noiseHit(t, 0.16, 0.32, 'bandpass', 1400, this.sfxGain, 0.9, 260);
        break;
      case 'land':
        this.tone(110, t, 0.08, 0.12, 'sine', 55);
        break;
      case 'lane':
        this.noiseHit(t, 0.05, 0.07, 'highpass', 2500, this.sfxGain);
        break;
      case 'crash':
        this.kick(t, 0.9, this.sfxGain);
        this.noiseHit(t, 0.4, 0.5, 'lowpass', 1600, this.sfxGain, 0.7, 120);
        this.tone(160, t, 0.45, 0.2, 'square', 38);
        break;
      case 'stumble':
        this.kick(t, 0.6, this.sfxGain);
        this.noiseHit(t, 0.18, 0.18, 'lowpass', 1200, this.sfxGain);
        break;
      case 'powerup':
        [74, 78, 81, 86].forEach((n, i) => this.tone(midi(n), t + i * 0.06, 0.18, 0.13, 'triangle'));
        break;
      case 'scroll':
        [81, 86, 88, 93].forEach((n, i) => this.tone(midi(n), t + i * 0.08, 0.6, 0.09, 'sine'));
        this.noiseHit(t, 0.03, 0.6, 'highpass', 8000, this.sfxGain);
        break;
      case 'relic':
        [74, 81, 86, 90, 93, 98].forEach((n, i) => this.tone(midi(n), t + i * 0.07, 0.7, 0.08, i % 2 ? 'sine' : 'triangle'));
        break;
      case 'shieldBreak':
        this.tone(1800, t, 0.25, 0.08, 'sine', 600);
        this.noiseHit(t, 0.2, 0.3, 'highpass', 3000, this.sfxGain);
        break;
      case 'ui':
        this.tone(880, t, 0.06, 0.08, 'triangle', 1320);
        break;
      case 'uiBack':
        this.tone(660, t, 0.06, 0.07, 'triangle', 440);
        break;
      case 'buy':
        [69, 74, 78, 81].forEach((n, i) => this.tone(midi(n), t + i * 0.05, 0.2, 0.12, 'square'));
        break;
      case 'error':
        this.tone(220, t, 0.18, 0.12, 'square', 180);
        break;
      case 'gameover':
        [69, 66, 63, 62].forEach((n, i) => this.tone(midi(n), t + i * 0.16, 0.3, 0.12, 'triangle'));
        break;
      case 'achievement':
        [74, 78, 81, 86, 81, 86].forEach((n, i) => this.tone(midi(n), t + i * 0.07, 0.22, 0.1, 'triangle'));
        break;
      case 'chariot':
        // rajada de vento subindo + estouro de fogo + fanfarra
        this.noiseHit(t, 0.32, 0.7, 'bandpass', 300, this.sfxGain, 0.8, 3200);
        this.kick(t, 0.7, this.sfxGain);
        this.tone(110, t, 0.6, 0.18, 'sawtooth', 330);
        [62, 69, 74, 78, 81, 86].forEach((n, i) => this.tone(midi(n), t + 0.12 + i * 0.07, 0.35, 0.11, i % 2 ? 'square' : 'triangle'));
        break;
      case 'chariotEnd':
        this.noiseHit(t, 0.12, 0.6, 'bandpass', 2400, this.sfxGain, 0.8, 300);
        [81, 78, 74].forEach((n, i) => this.tone(midi(n), t + i * 0.09, 0.25, 0.08, 'triangle'));
        break;
      case 'smash':
        this.noiseHit(t, 0.3, 0.28, 'lowpass', 2600, this.sfxGain, 0.7, 200);
        this.tone(220, t, 0.16, 0.12, 'square', 70);
        this.noiseHit(t + 0.03, 0.08, 0.3, 'highpass', 4000, this.sfxGain);
        break;
      case 'victory':
        [72, 76, 79, 84].forEach((n, i) => this.tone(midi(n), t + i * 0.11, 0.3, 0.12, 'triangle'));
        [84, 88, 91].forEach((n) => this.tone(midi(n), t + 0.5, 0.8, 0.07, 'sine'));
        this.tone(midi(48), t + 0.5, 0.8, 0.1, 'triangle');
        break;
      case 'oops':
        this.tone(midi(67), t, 0.18, 0.09, 'sine');
        this.tone(midi(64), t + 0.16, 0.3, 0.09, 'sine');
        break;
      case 'page':
        this.noiseHit(t, 0.07, 0.22, 'bandpass', 2600, this.sfxGain, 0.7, 900);
        break;
    }
  }
}

export const audio = new AudioManager();
