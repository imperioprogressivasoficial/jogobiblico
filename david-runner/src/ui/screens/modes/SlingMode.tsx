import { useEffect, useRef, useState } from 'react';
import { audio } from '../../../game/AudioManager';
import { vibrate } from '../../../platform/native';
import { ModeFinish, ModeHeader } from './ModeFinish';

/**
 * Funda de Davi: puxe a pedra para trás e solte. Acerte o capacete de Golias (testa = 300),
 * os jarros (100) e o escudo (50). São 3 rodadas de 5 pedras; Golias anda mais a cada rodada.
 */
const STONES = 5;
const ROUNDS = 3;
const G = 900; // gravidade (px/s²) em coordenadas lógicas
const W = 400;
const H = 640;

interface Jar {
  x: number;
  y: number;
  hit: boolean;
}

export function SlingMode() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ score: 0, stones: STONES, round: 1 });
  const [msg, setMsg] = useState<string | null>('Puxe a pedra para trás e solte!');
  const [over, setOver] = useState<{ score: number; hits: number } | null>(null);
  const [game, setGame] = useState(0);

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
      cv.width = r.width * dpr;
      cv.height = r.height * dpr;
      scale = Math.min(cv.width / W, cv.height / H);
      ox = (cv.width - W * scale) / 2;
      oy = (cv.height - H * scale) / 2;
    };
    fit();
    window.addEventListener('resize', fit);

    const anchor = { x: 80, y: 500 };
    let stone = { x: anchor.x, y: anchor.y, vx: 0, vy: 0, flying: false };
    let drag: { x: number; y: number } | null = null;
    let score = 0;
    let stones = STONES;
    let round = 1;
    let hits = 0;
    let t = 0;
    let gx = 300;
    let fall = 0; // animação de Golias caindo
    let flash: { x: number; y: number; text: string; life: number }[] = [];
    let jars: Jar[] = [];
    const newRound = () => {
      jars = [
        { x: 220 + Math.random() * 40, y: 300 + Math.random() * 60, hit: false },
        { x: 170 + Math.random() * 60, y: 200 + Math.random() * 60, hit: false },
      ];
      fall = 0;
    };
    newRound();

    const toLogic = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      const dpr = cv.width / r.width;
      return { x: ((e.clientX - r.left) * dpr - ox) / scale, y: ((e.clientY - r.top) * dpr - oy) / scale };
    };
    const down = (e: PointerEvent) => {
      if (stone.flying || stones <= 0) return;
      const p = toLogic(e);
      if (Math.hypot(p.x - anchor.x, p.y - anchor.y) < 90) {
        drag = p;
        cv.setPointerCapture(e.pointerId);
        setMsg(null);
      }
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      drag = toLogic(e);
    };
    const up = () => {
      if (!drag) return;
      let dx = anchor.x - drag.x;
      let dy = anchor.y - drag.y;
      const len = Math.hypot(dx, dy);
      const maxL = 110;
      if (len > maxL) {
        dx *= maxL / len;
        dy *= maxL / len;
      }
      drag = null;
      if (len < 12) return;
      stone = { x: anchor.x, y: anchor.y, vx: dx * 7.2, vy: dy * 7.2, flying: true };
      stones--;
      audio.play('jump');
      setHud({ score, stones, round });
    };
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    const pop = (x: number, y: number, text: string, pts: number) => {
      score += pts;
      hits++;
      flash.push({ x, y, text, life: 1 });
      setHud({ score, stones, round });
    };

    const endStone = () => {
      stone = { x: anchor.x, y: anchor.y, vx: 0, vy: 0, flying: false };
      if (stones > 0) return;
      if (round < ROUNDS) {
        round++;
        stones = STONES;
        newRound();
        setMsg(`Rodada ${round}! Golias está mais rápido!`);
        setHud({ score, stones, round });
      } else {
        setOver({ score, hits });
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      t += dt;
      const speed = 0.6 + round * 0.55;
      if (fall <= 0) gx = 300 + Math.sin(t * speed) * (round === 1 ? 10 : 34);
      else fall = Math.min(1, fall + dt * 1.5);
      if (fall >= 1) fall = 1;

      if (stone.flying) {
        stone.vy += G * dt;
        stone.x += stone.vx * dt;
        stone.y += stone.vy * dt;
        // alvos
        for (const j of jars) {
          if (!j.hit && Math.hypot(stone.x - j.x, stone.y - j.y) < 22) {
            j.hit = true;
            audio.play('crash');
            pop(j.x, j.y, '+100', 100);
          }
        }
        const head = { x: gx, y: 268 };
        if (fall === 0 && Math.hypot(stone.x - head.x, stone.y - head.y) < 17) {
          audio.play('victory');
          vibrate(60);
          pop(head.x, head.y - 30, 'NA TESTA! +300', 300);
          fall = 0.01;
          window.setTimeout(endStone, 900);
          stone.flying = false;
          stone.y = -100;
        } else if (fall === 0 && stone.x > gx - 46 && stone.x < gx - 26 && stone.y > 300 && stone.y < 380) {
          audio.play('stumble');
          pop(stone.x, stone.y, 'Escudo +50', 50);
          endStone();
        } else if (stone.y > H + 40 || stone.x > W + 40 || stone.x < -40) {
          audio.play('lane');
          endStone();
        }
      }
      flash = flash.filter((f) => (f.life -= dt * 0.8) > 0);
      draw();
      raf = requestAnimationFrame(loop);
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const sky = ctx.createLinearGradient(0, 0, 0, cv.height);
      sky.addColorStop(0, '#7cc8ff');
      sky.addColorStop(1, '#ffe7b0');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      // sol e morros
      ctx.fillStyle = '#fff3a8';
      ctx.beginPath();
      ctx.arc(330, 90, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9fd36a';
      ctx.beginPath();
      ctx.ellipse(110, 600, 260, 120, 0, 0, Math.PI * 2);
      ctx.ellipse(360, 610, 220, 110, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9b77a';
      ctx.fillRect(-200, 560, W + 400, 200);
      // jarros
      for (const j of jars) {
        if (j.hit) continue;
        ctx.fillStyle = '#c8743a';
        ctx.beginPath();
        ctx.ellipse(j.x, j.y, 15, 19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e39a5c';
        ctx.fillRect(j.x - 8, j.y - 26, 16, 8);
        ctx.fillStyle = '#7a3d14';
        ctx.fillRect(j.x - 14, j.y - 2, 28, 4);
        ctx.fillStyle = '#5b3a1e';
        ctx.fillRect(j.x - 2, j.y + 19, 4, 60);
      }
      drawGoliath();
      // funda (estilingue) e Davi
      ctx.strokeStyle = '#6b3f1f';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(anchor.x, 600);
      ctx.lineTo(anchor.x, anchor.y + 20);
      ctx.moveTo(anchor.x, anchor.y + 20);
      ctx.lineTo(anchor.x - 22, anchor.y - 18);
      ctx.moveTo(anchor.x, anchor.y + 20);
      ctx.lineTo(anchor.x + 22, anchor.y - 18);
      ctx.stroke();
      const sp = drag ? clampDrag(drag) : stone.flying ? null : anchor;
      if (sp) {
        ctx.strokeStyle = '#8a5530';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(anchor.x - 22, anchor.y - 18);
        ctx.lineTo(sp.x, sp.y);
        ctx.lineTo(anchor.x + 22, anchor.y - 18);
        ctx.stroke();
      }
      // trajetória prevista
      if (drag) {
        const d = clampDrag(drag);
        let vx = (anchor.x - d.x) * 7.2;
        let vy = (anchor.y - d.y) * 7.2;
        let x = anchor.x;
        let y = anchor.y;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (let k = 0; k < 14; k++) {
          for (let s = 0; s < 4; s++) {
            vy += G * 0.012;
            x += vx * 0.012;
            y += vy * 0.012;
          }
          ctx.beginPath();
          ctx.arc(x, y, 4 - k * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        void vx;
      }
      const st = drag ? clampDrag(drag) : stone;
      if (stones > 0 || stone.flying) {
        ctx.fillStyle = '#7d7f86';
        ctx.beginPath();
        ctx.arc(st.x, st.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b9bcc4';
        ctx.beginPath();
        ctx.arc(st.x - 3, st.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const f of flash) {
        ctx.globalAlpha = Math.min(1, f.life * 1.5);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#7a3d14';
        ctx.lineWidth = 5;
        ctx.font = 'bold 24px "Lilita One", sans-serif';
        ctx.textAlign = 'center';
        const y = f.y - (1 - f.life) * 40;
        ctx.strokeText(f.text, f.x, y);
        ctx.fillText(f.text, f.x, y);
        ctx.globalAlpha = 1;
      }
    };

    const clampDrag = (p: { x: number; y: number }) => {
      const dx = p.x - anchor.x;
      const dy = p.y - anchor.y;
      const len = Math.hypot(dx, dy);
      const k = len > 110 ? 110 / len : 1;
      return { x: anchor.x + dx * k, y: anchor.y + dy * k };
    };

    const drawGoliath = () => {
      ctx.save();
      ctx.translate(gx, 560);
      ctx.rotate(fall * 1.45);
      ctx.translate(-gx, -560);
      // pernas e corpo
      ctx.fillStyle = '#7a4a24';
      ctx.fillRect(gx - 20, 470, 14, 90);
      ctx.fillRect(gx + 6, 470, 14, 90);
      ctx.fillStyle = '#9aa3ad';
      ctx.beginPath();
      ctx.roundRect(gx - 34, 300, 68, 180, 18);
      ctx.fill();
      ctx.fillStyle = '#c9a33a';
      ctx.fillRect(gx - 34, 380, 68, 12);
      // escudo
      ctx.fillStyle = '#b07440';
      ctx.beginPath();
      ctx.ellipse(gx - 36, 340, 14, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3;
      ctx.stroke();
      // lança
      ctx.strokeStyle = '#5b3a1e';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(gx + 40, 520);
      ctx.lineTo(gx + 40, 200);
      ctx.stroke();
      ctx.fillStyle = '#c0c6cf';
      ctx.beginPath();
      ctx.moveTo(gx + 40, 180);
      ctx.lineTo(gx + 32, 205);
      ctx.lineTo(gx + 48, 205);
      ctx.fill();
      // cabeça, barba e capacete
      ctx.fillStyle = '#e9b48a';
      ctx.beginPath();
      ctx.arc(gx, 272, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a2a14';
      ctx.beginPath();
      ctx.ellipse(gx, 290, 22, 14, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#aab3bd';
      ctx.beginPath();
      ctx.arc(gx, 262, 27, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(gx - 3, 228, 6, 12);
      // alvo na testa
      if (fall === 0) {
        ctx.strokeStyle = 'rgba(255,80,60,0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(gx, 268, 9, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#222';
      ctx.fillRect(gx - 11, 274, 5, fall > 0 ? 2 : 5);
      ctx.fillRect(gx + 6, 274, 5, fall > 0 ? 2 : 5);
      ctx.restore();
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
    };
  }, [game]);

  return (
    <div className="screen mode-screen mode-sling" data-testid="mode-sling">
      <ModeHeader
        title="🎯 Funda"
        right={
          <span className="mode-pill">
            {hud.score} pts · 🪨 {hud.stones}
          </span>
        }
      />
      <p className="ms-sub">
        Rodada {hud.round}/{ROUNDS} · “Davi venceu Golias com uma funda e uma pedra.” (1 Samuel 17:50)
      </p>
      <canvas ref={canvas} className="ms-canvas" data-testid="ms-canvas" />
      {msg && (
        <div className="ms-msg" key={msg}>
          {msg}
        </div>
      )}
      {over && (
        <ModeFinish
          mode="funda"
          score={over.score}
          coins={Math.round(over.score / 10)}
          line={`Você acertou ${over.hits} alvos!`}
          onAgain={() => {
            setOver(null);
            setHud({ score: 0, stones: STONES, round: 1 });
            setMsg('Puxe a pedra para trás e solte!');
            setGame((g) => g + 1);
          }}
        />
      )}
    </div>
  );
}
