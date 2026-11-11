import { useCallback, useEffect, useRef, useState } from 'react';
import { audio } from '../../game/AudioManager';
import type { Emote } from '../../game/World';
import { EMOTES, PHRASES } from '../../data/worldChat';
import { WorldClient, type NetPlayer, type NetStatus } from '../../net/worldClient';
import { progression } from '../../state/ProgressionManager';
import { Icon } from '../art/icons';
import { UIManager } from '../UIManager';

type Label = { id: number; name: string; x: number; y: number; visible: boolean; self: boolean };

/**
 * Mundo Aberto (beta online): a criança anda pela praça de Jerusalém e vê outros jogadores ao vivo.
 * Conversa só com frases e gestos prontos (sem texto livre), por segurança das crianças.
 */
export function WorldScreen() {
  const engine = UIManager.engine!;
  const d = progression.data;
  const first = (d.profile?.childName ?? 'Amigo').trim().split(/\s+/)[0];
  const [status, setStatus] = useState<NetStatus>('connecting');
  const [room, setRoom] = useState(0);
  const [count, setCount] = useState(1);
  const [labels, setLabels] = useState<Label[]>([]);
  const [bubbles, setBubbles] = useState<Record<number, string>>({});
  const [panel, setPanel] = useState<null | 'say' | 'emote'>(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const net = useRef<WorldClient | null>(null);
  const myId = useRef(0);
  const timers = useRef<Record<number, number>>({});
  const keys = useRef({ up: false, down: false, left: false, right: false });
  const pad = useRef<HTMLDivElement>(null);
  const names = useRef<Record<number, string>>({});

  const showBubble = useCallback((id: number, text: string) => {
    setBubbles((b) => ({ ...b, [id]: text }));
    window.clearTimeout(timers.current[id]);
    timers.current[id] = window.setTimeout(() => setBubbles((b) => {
      const n = { ...b };
      delete n[id];
      return n;
    }), 4500);
  }, []);

  // entra no mundo, conecta e sai limpando tudo
  useEffect(() => {
    const skin = d.selectedSkin[d.selectedCharacter] ?? 'padrao';
    engine.enterWorld(d.selectedCharacter, skin);
    const w = engine.world;
    const connect = () => {
      const c = new WorldClient(
        {
          status: (s, r) => {
            setStatus(s);
            if (r) setRoom(r);
          },
          welcome: (id, players) => {
            myId.current = id;
            players.forEach((p: NetPlayer) => {
              w.addRemote(p.id, p.name, p.hero, p.skin, p.x, p.z, p.r);
              names.current[p.id] = p.name;
            });
            setCount(1 + players.length);
          },
          join: (p) => {
            w.addRemote(p.id, p.name, p.hero, p.skin, p.x, p.z, p.r);
            names.current[p.id] = p.name;
            setCount(1 + w.remoteCount);
            audio.play('ui');
          },
          leave: (id) => {
            w.removeRemote(id);
            setCount(1 + w.remoteCount);
          },
          snap: (list) => list.forEach(([id, x, z, r, a]) => id !== myId.current && w.updateRemote(id, x, z, r, a)),
          say: (id, i) => showBubble(id, PHRASES[i] ?? ''),
          emote: (id, e) => (id === myId.current ? undefined : w.remoteEmote(id, e as Emote)),
        },
        { name: first, hero: d.selectedCharacter, skin },
      );
      c.connect();
      net.current = c;
    };
    connect();

    // envia a posição 10 vezes por segundo
    const send = window.setInterval(() => {
      const s = w.state();
      net.current?.pos(s.x, s.z, s.r, s.a);
    }, 100);

    // etiquetas de nome e balões acompanham os personagens na tela
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (engine.mode !== 'world') return;
      setLabels(w.labels(engine.cameraCtl.camera));
      const k = keys.current;
      if (k.up || k.down || k.left || k.right) w.setMove((k.right ? 1 : 0) - (k.left ? 1 : 0), (k.up ? 1 : 0) - (k.down ? 1 : 0));
    };
    raf = requestAnimationFrame(tick);

    const key = (down: boolean) => (e: KeyboardEvent) => {
      const k = keys.current;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') k.up = down;
      else if (e.code === 'KeyS' || e.code === 'ArrowDown') k.down = down;
      else if (e.code === 'KeyA' || e.code === 'ArrowLeft') k.left = down;
      else if (e.code === 'KeyD' || e.code === 'ArrowRight') k.right = down;
      if (!k.up && !k.down && !k.left && !k.right && !down) w.setMove(0, 0);
    };
    const kd = key(true);
    const ku = key(false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    const offBack = UIManager.pushBackHandler(() => UIManager.back());

    return () => {
      window.clearInterval(send);
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      offBack();
      net.current?.close();
      w.setMove(0, 0);
      UIManager.showMenuScene();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // joystick: arrastar no círculo da esquerda
  const onStick = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = pad.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2);
    let dy = (e.clientY - cy) / (r.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    setStick({ x: dx, y: dy });
    engine.world.setMove(dx, -dy);
  };
  const endStick = () => {
    setStick({ x: 0, y: 0 });
    engine.world.setMove(0, 0);
  };

  // arrastar o resto da tela gira a câmera
  const drag = useRef<{ x: number; y: number } | null>(null);

  const say = (i: number) => {
    audio.play('ui');
    net.current?.say(i);
    if (status !== 'online') showBubble(0, PHRASES[i]);
    setPanel(null);
  };
  const emote = (e: Emote) => {
    audio.play('ui');
    engine.world.emote(e);
    net.current?.emote(e);
    setPanel(null);
  };

  return (
    <div className="screen world-screen" data-testid="world-screen">
      <div
        className="world-look"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
          setPanel(null);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          engine.world.rotateCamera(e.clientX - drag.current.x, e.clientY - drag.current.y);
          drag.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      />

      <div className="world-labels" aria-hidden="true">
        {labels
          .filter((l) => l.visible)
          .map((l) => {
            const text = bubbles[l.self ? 0 : l.id] ?? (l.self ? bubbles[myId.current] : undefined);
            return (
              <div key={l.id} className={`world-tag ${l.self ? 'self' : ''}`} style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%` }}>
                {text && <div className="world-say">{text}</div>}
                <span>{l.self ? first : l.name || names.current[l.id]}</span>
              </div>
            );
          })}
      </div>

      <header className="world-top">
        <button type="button" className="lobby-round world-back" onClick={() => UIManager.back()} data-testid="world-back" aria-label="Sair do mundo">
          <Icon name="back" size={24} />
          <small>Sair</small>
        </button>
        <div className={`world-status ${status}`} data-testid="world-status">
          <i />
          {status === 'online' ? `Online · Sala ${room} · ${count} ${count === 1 ? 'jogador' : 'jogadores'}` : status === 'connecting' ? 'Conectando...' : 'Sem conexão · modo solo'}
          {status === 'offline' && (
            <button type="button" onClick={() => location.reload()}>
              Tentar de novo
            </button>
          )}
        </div>
        <span className="world-beta">BETA</span>
      </header>

      {panel === 'say' && (
        <div className="world-panel" data-testid="world-say-panel">
          {PHRASES.map((p, i) => (
            <button key={p} type="button" onClick={() => say(i)} data-testid={`say-${i}`}>
              {p}
            </button>
          ))}
        </div>
      )}
      {panel === 'emote' && (
        <div className="world-panel world-panel-emotes" data-testid="world-emote-panel">
          {EMOTES.map((e) => (
            <button key={e.id} type="button" onClick={() => emote(e.id)} data-testid={`emote-${e.id}`}>
              {e.label}
            </button>
          ))}
        </div>
      )}

      <div
        className="world-stick"
        ref={pad}
        data-testid="world-stick"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onStick(e);
        }}
        onPointerMove={(e) => e.buttons && onStick(e)}
        onPointerUp={endStick}
        onPointerCancel={endStick}
      >
        <div className="world-stick-knob" style={{ transform: `translate(${stick.x * 34}px, ${stick.y * 34}px)` }} />
      </div>

      <div className="world-actions">
        <button type="button" className="lobby-round" onClick={() => setPanel(panel === 'emote' ? null : 'emote')} data-testid="world-emote" aria-label="Gestos">
          <Icon name="star" size={24} />
          <small>Gestos</small>
        </button>
        <button type="button" className="lobby-round world-say-btn" onClick={() => setPanel(panel === 'say' ? null : 'say')} data-testid="world-say" aria-label="Falar">
          <Icon name="sound" size={24} />
          <small>Falar</small>
        </button>
      </div>
    </div>
  );
}
