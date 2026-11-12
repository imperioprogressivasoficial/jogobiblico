import { useEffect, useRef, useState } from 'react';
import { audio } from '../../../game/AudioManager';
import { vibrate } from '../../../platform/native';
import { progression } from '../../../state/ProgressionManager';
import { ModeFinish, ModeHeader } from './ModeFinish';

/**
 * Exército de Gideão (Juízes 7).
 * 1) Reunir: o exército marcha pelo vale; toque à esquerda ou à direita para passar pelo portão
 *    melhor. Cada portão é uma conta (+, −, ×, ÷) e a conta aparece na tela: aprende fazendo.
 * 2) Os 300: Deus diz que o povo é demais e fica só com 300 (Juízes 7:2-7). Quem chegou com
 *    300 ou mais ganha bônus de obediência.
 * 3) Trombetas: toque o mais rápido que puder; com trombetas e tochas os midianitas fogem
 *    (Juízes 7:20-22). A lição: a vitória vem de Deus, não do tamanho do exército.
 */
const W = 400;
const H = 640;
const GATHER_S = 40;
const TRUMPET_S = 6;
const START = 10;
const MAX_ARMY = 999;
const HORIZON = 150;
const ARMY_Y = 540;

type Op = { kind: '+' | '-' | 'x' | '/'; n: number };
interface Gate {
  z: number; // 1 = longe, 0 = chegou no exército
  ops: [Op, Op]; // esquerda, direita
  done: boolean;
}
type Phase = 'gather' | 'three' | 'trumpet';

export const applyOp = (army: number, o: Op): number => {
  const v = o.kind === '+' ? army + o.n : o.kind === '-' ? army - o.n : o.kind === 'x' ? army * o.n : Math.floor(army / o.n);
  return Math.max(1, Math.min(MAX_ARMY, v));
};
const label = (o: Op): string => (o.kind === '+' ? `+${o.n}` : o.kind === '-' ? `−${o.n}` : o.kind === 'x' ? `×${o.n}` : `÷${o.n}`);
const good = (army: number): Op => {
  const r = Math.random();
  if (army < 120 && r < 0.35) return { kind: 'x', n: army < 40 ? 3 : 2 };
  return { kind: '+', n: [5, 10, 15, 20, 30][Math.floor(Math.random() * 5)] };
};
/** Portão ruim. No modo Criança (padrão) não tem divisão: só tirar soldados. */
const bad = (army: number): Op => (army > 20 && !kidMode() && Math.random() < 0.4 ? { kind: '/', n: 2 } : { kind: '-', n: [5, 10][Math.floor(Math.random() * 2)] });
const kidMode = () => progression.data.settings.difficulty === 'crianca';

/** Um portão bom e um ruim (às vezes dois bons: a criança precisa calcular qual é maior). */
export function makeGate(army: number): [Op, Op] {
  const a = good(army);
  const b = Math.random() < 0.3 ? good(army) : bad(army);
  return Math.random() < 0.5 ? [a, b] : [b, a];
}

export function GideonMode() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ army: START, time: GATHER_S, phase: 'gather' as Phase, taps: 0 });
  const [msg, setMsg] = useState<string | null>('Toque à esquerda ou à direita para escolher o portão!');
  const [over, setOver] = useState<{ score: number; peak: number; taps: number } | null>(null);
  const [game, setGame] = useState(0);
  const tapRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let scale = 1;
    let ox = 0;
    let oy = 0;
    const fit = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, r.width * dpr);
      cv.height = Math.max(1, r.height * dpr);
      scale = Math.min(cv.width / W, cv.height / H);
      ox = (cv.width - W * scale) / 2;
      oy = (cv.height - H * scale) / 2;
    };
    fit();
    window.addEventListener('resize', fit);

    let phase: Phase = 'gather';
    let army = START;
    let peak = START;
    let lane = -1; // -1 esquerda, 1 direita
    let armyX = -1;
    let time = GATHER_S;
    let spawn = 1;
    let gates: Gate[] = [];
    let flash: { text: string; life: number; good: boolean }[] = [];
    let bonus = 0;
    let taps = 0;
    let threeT = 0;
    let flee = 0; // 0..1: midianitas fugindo
    let t = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      // a lição é que Deus vence com poucos: juntar mais de 300 não dá mais pontos
      const score = Math.min(peak, 300) * 3 + bonus + taps * 20;
      setOver({ score, peak, taps });
    };

    const toThree = () => {
      phase = 'three';
      threeT = 0;
      gates = [];
      if (army >= 300) {
        bonus = 500;
        setMsg('Deus disse: “O povo é demais!” Ficaram só 300. +500 de obediência!');
      } else setMsg('Deus disse: “Eu vou vencer com 300!” Ele completou o exército.');
      audio.play('scroll');
      setHud((h) => ({ ...h, phase: 'three' }));
    };

    const toTrumpet = () => {
      phase = 'trumpet';
      time = TRUMPET_S;
      army = 300;
      setMsg('Agora! Toque as trombetas o mais rápido que puder!');
      setHud((h) => ({ ...h, phase: 'trumpet', army: 300, time: TRUMPET_S }));
    };

    tapRef.current = () => {
      if (phase !== 'trumpet' || finished) return;
      taps++;
      flee = Math.min(1, taps / 60);
      audio.play(taps % 2 ? 'powerup' : 'coin');
      vibrate(10);
      setHud((h) => ({ ...h, taps }));
    };

    const pick = (x: number) => {
      if (phase !== 'gather') return;
      const r = cv.getBoundingClientRect();
      const nl = x - r.left < r.width / 2 ? -1 : 1;
      if (nl !== lane) audio.play('lane');
      lane = nl;
    };
    const down = (e: PointerEvent) => {
      cv.setPointerCapture(e.pointerId);
      pick(e.clientX);
    };
    const move = (e: PointerEvent) => e.buttons && pick(e.clientX);
    const key = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') pick(-1e9);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') pick(1e9);
      else if (e.code === 'Space') tapRef.current();
    };
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    window.addEventListener('keydown', key);

    // perspectiva simples do vale: z=1 no horizonte, z=0 no exército
    const py = (z: number) => HORIZON + (ARMY_Y - HORIZON) * (1 - z);
    const ps = (z: number) => 0.3 + 0.7 * (1 - z);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt;

      if (phase === 'gather') {
        time -= dt;
        spawn -= dt;
        if (spawn <= 0 && time > 3) {
          gates.push({ z: 1, ops: makeGate(army), done: false });
          spawn = 2.3;
        }
        for (const g of gates) {
          g.z -= dt * 0.38;
          if (!g.done && g.z <= 0.04) {
            g.done = true;
            const o = g.ops[lane < 0 ? 0 : 1];
            const before = army;
            army = applyOp(army, o);
            peak = Math.max(peak, army);
            const up = army >= before;
            flash.push({ text: `${before} ${label(o)} = ${army}`, life: 1.4, good: up });
            audio.play(up ? 'coin' : 'oops');
            if (!up) vibrate(30);
            setMsg(null);
          }
        }
        gates = gates.filter((g) => g.z > -0.2);
        if (time <= 0) toThree();
        setHud((h) => (h.army === army && Math.ceil(h.time) === Math.ceil(time) ? h : { ...h, army, time: Math.max(0, time) }));
      } else if (phase === 'three') {
        threeT += dt;
        // o número do exército desce (ou sobe) até 300
        army = Math.round(army + (300 - army) * Math.min(1, dt * 2.5));
        setHud((h) => (h.army === army ? h : { ...h, army }));
        if (threeT > 3.2) toTrumpet();
      } else {
        time -= dt;
        setHud((h) => (Math.ceil(h.time) === Math.ceil(time) ? h : { ...h, time: Math.max(0, time) }));
        if (time <= 0) {
          flee = 1;
          finish();
        }
      }
      armyX += (lane - armyX) * Math.min(1, dt * 10);
      for (const f of flash) f.life -= dt;
      flash = flash.filter((f) => f.life > 0);
      draw();
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = phase === 'trumpet' ? '#3a3a2a' : '#d9b77a';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      const night = phase === 'trumpet';
      // céu e montes
      const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
      sky.addColorStop(0, night ? '#141033' : '#8fd3ff');
      sky.addColorStop(1, night ? '#3b2a5c' : '#ffe6b0');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, HORIZON + 2);
      ctx.fillStyle = night ? '#2a2145' : '#c99a5b';
      ctx.beginPath();
      ctx.moveTo(0, HORIZON);
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x, HORIZON - 18 - 14 * Math.sin(x * 0.03 + 1));
      ctx.lineTo(W, HORIZON);
      ctx.fill();
      // vale (chão)
      ctx.fillStyle = night ? '#3a3a2a' : '#d9b77a';
      ctx.fillRect(0, HORIZON, W, H - HORIZON);
      // estrada em perspectiva
      ctx.fillStyle = night ? '#4b4733' : '#ecd29a';
      ctx.beginPath();
      ctx.moveTo(W / 2 - 40, HORIZON);
      ctx.lineTo(W / 2 + 40, HORIZON);
      ctx.lineTo(W - 10, H);
      ctx.lineTo(10, H);
      ctx.fill();
      // faixas que andam (sensação de marcha)
      ctx.strokeStyle = night ? 'rgba(255,255,255,0.08)' : 'rgba(120,80,30,0.25)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const z = 1 - ((i / 8 + t * (phase === 'gather' ? 0.38 : 0.05)) % 1);
        const y = py(z);
        const half = 40 + (W / 2 - 50) * (1 - z);
        ctx.beginPath();
        ctx.moveTo(W / 2 - half, y);
        ctx.lineTo(W / 2 + half, y);
        ctx.stroke();
      }

      // portões
      for (const g of [...gates].sort((a, b) => b.z - a.z)) {
        if (g.z < -0.1) continue;
        const y = py(Math.max(0, g.z));
        const s = ps(Math.max(0, g.z));
        g.ops.forEach((o, i) => {
          const side = i === 0 ? -1 : 1;
          const cx = W / 2 + side * 95 * s;
          const w = 150 * s;
          const h = 70 * s;
          const up = o.kind === '+' || o.kind === 'x';
          ctx.globalAlpha = g.done ? 0.35 : 0.92;
          ctx.fillStyle = up ? '#2ecc71' : '#ff5d5d';
          roundRect(ctx, cx - w / 2, y - h, w, h, 10 * s);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3 * s;
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = `900 ${Math.round(34 * s)}px Nunito, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label(o), cx, y - h / 2);
          ctx.globalAlpha = 1;
        });
      }

      // acampamento midianita (aparece nos 300 e nas trombetas)
      if (phase !== 'gather') {
        const tents = 9;
        for (let i = 0; i < tents; i++) {
          const x = 40 + i * 40 + Math.sin(i) * 8;
          const run = flee * (i % 2 ? 1 : -1) * 260;
          ctx.fillStyle = '#7a4a1a';
          ctx.beginPath();
          ctx.moveTo(x - 16, HORIZON + 40);
          ctx.lineTo(x, HORIZON + 14);
          ctx.lineTo(x + 16, HORIZON + 40);
          ctx.fill();
          // midianitas: bolinhas escuras que fogem para os lados
          ctx.fillStyle = '#5a2d1a';
          for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.arc(x + run + k * 7 - 7, HORIZON + 50 + k * 4, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // exército de Gideão
      const ax = W / 2 + armyX * 95;
      const shown = Math.min(48, Math.max(1, Math.round(Math.sqrt(army) * 2.2)));
      for (let i = 0; i < shown; i++) {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const x = ax + (col - 3.5) * 11 + (row % 2) * 5;
        const y = ARMY_Y + 6 - row * 9 + Math.sin(t * 10 + i) * 1.5;
        ctx.fillStyle = '#3b6fb6';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f2c94c';
        ctx.fillRect(x - 3, y - 7, 6, 3);
        if (night) {
          // tocha acesa
          ctx.fillStyle = Math.sin(t * 20 + i) > 0 ? '#ffb02e' : '#ff6a1a';
          ctx.beginPath();
          ctx.arc(x + 5, y - 10, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // número do exército
      ctx.fillStyle = 'rgba(43,26,74,0.85)';
      roundRect(ctx, ax - 38, ARMY_Y + 20, 76, 30, 15);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '900 20px Nunito, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(army), ax, ARMY_Y + 35);

      // contas que acabaram de acontecer
      flash.forEach((f, i) => {
        ctx.globalAlpha = Math.min(1, f.life);
        ctx.fillStyle = f.good ? '#16865a' : '#c0392b';
        ctx.font = '900 24px Nunito, system-ui, sans-serif';
        ctx.fillText(f.text, W / 2, 330 - i * 30 - (1.4 - f.life) * 30);
        ctx.globalAlpha = 1;
      });
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', key);
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
    };
  }, [game]);

  return (
    <div className="screen mode-screen mode-gideon" data-testid="mode-gideon">
      <ModeHeader
        title="🎺 Gideão"
        right={
          <span className="mode-pill" data-testid="gd-army">
            ⚔️ {hud.army} · ⏱ {Math.ceil(hud.time)}
          </span>
        }
      />
      <p className="ms-sub">
        {hud.phase === 'gather' ? 'Escolha o portão com a melhor conta e junte o exército!' : hud.phase === 'three' ? '“Não é pela força, mas pelo meu Espírito.” (Zacarias 4:6)' : 'Trombetas e tochas! (Juízes 7:20)'}
      </p>
      <canvas ref={canvas} className="ms-canvas gd-canvas" data-testid="gd-canvas" />
      {hud.phase === 'trumpet' && !over && (
        <button type="button" className="gd-trumpet" data-testid="gd-trumpet" onPointerDown={() => tapRef.current()}>
          🎺 Tocar! <small>{hud.taps}</small>
        </button>
      )}
      {msg && (
        <div className="ms-msg" key={msg}>
          {msg}
        </div>
      )}
      {over && (
        <ModeFinish
          mode="gideao"
          score={over.score}
          coins={Math.round(over.score / 12)}
          line={`Você tocou ${over.taps} trombetas! Gideão tinha só 300 soldados, e Deus deu a vitória.`}
          onAgain={() => {
            setOver(null);
            setHud({ army: START, time: GATHER_S, phase: 'gather', taps: 0 });
            setMsg('Toque à esquerda ou à direita para escolher o portão!');
            setGame((g) => g + 1);
          }}
        />
      )}
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
