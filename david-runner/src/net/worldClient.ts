import type { Emote, NetAnim } from '../game/World';

export interface NetPlayer {
  id: number;
  name: string;
  hero: string;
  skin: string;
  x: number;
  z: number;
  r: number;
  a: NetAnim;
}

export type NetStatus = 'connecting' | 'online' | 'offline';

export interface NetHandlers {
  status(s: NetStatus, room?: number): void;
  welcome(id: number, players: NetPlayer[]): void;
  join(p: NetPlayer): void;
  leave(id: number): void;
  snap(list: [number, number, number, number, NetAnim][]): void;
  say(id: number, phrase: number): void;
  emote(id: number, e: Emote): void;
}

/** Endereço do servidor do mundo (pode ser trocado com ?ws=... na URL, para testes). */
export function worldUrl(): string {
  try {
    const q = new URLSearchParams(location.search).get('ws');
    if (q) return q;
    const saved = localStorage.getItem('davidrunner.ws');
    if (saved) return saved;
  } catch {
    /* sem acesso à URL/armazenamento */
  }
  return 'wss://srv1969277.hstgr.cloud/david-runner-world';
}

/** Conexão com o Mundo Aberto. Se cair, avisa e o jogo segue em modo solo. */
export class WorldClient {
  private ws: WebSocket | null = null;
  private closed = false;
  id = 0;

  constructor(
    private h: NetHandlers,
    private join: { name: string; hero: string; skin: string },
    private url = worldUrl(),
  ) {}

  connect(): void {
    this.closed = false;
    this.h.status('connecting');
    let timeout = 0;
    try {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      timeout = window.setTimeout(() => ws.readyState !== 1 && ws.close(), 6000);
      ws.onopen = () => {
        window.clearTimeout(timeout);
        ws.send(JSON.stringify({ t: 'join', ...this.join }));
      };
      ws.onmessage = (e) => {
        let m: { t: string; [k: string]: unknown };
        try {
          m = JSON.parse(String(e.data));
        } catch {
          return;
        }
        switch (m.t) {
          case 'welcome':
            this.id = m.id as number;
            this.h.status('online', m.room as number);
            this.h.welcome(this.id, m.players as NetPlayer[]);
            break;
          case 'join':
            this.h.join(m.p as NetPlayer);
            break;
          case 'leave':
            this.h.leave(m.id as number);
            break;
          case 'snap':
            this.h.snap(m.p as [number, number, number, number, NetAnim][]);
            break;
          case 'say':
            this.h.say(m.id as number, m.i as number);
            break;
          case 'emote':
            this.h.emote(m.id as number, m.e as Emote);
            break;
        }
      };
      ws.onclose = () => {
        window.clearTimeout(timeout);
        if (!this.closed) this.h.status('offline');
      };
      ws.onerror = () => ws.close();
    } catch {
      this.h.status('offline');
    }
  }

  private send(o: unknown): void {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o));
  }

  pos(x: number, z: number, r: number, a: NetAnim): void {
    this.send({ t: 'pos', x: +x.toFixed(2), z: +z.toFixed(2), r: +r.toFixed(2), a });
  }

  say(i: number): void {
    this.send({ t: 'say', id: i });
  }

  emote(e: Emote): void {
    this.send({ t: 'emote', e });
  }

  close(): void {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }
}
