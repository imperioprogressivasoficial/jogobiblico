import { beforeEach, describe, expect, it, vi } from 'vitest';

class FakeWS {
  static all: FakeWS[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) {
    FakeWS.all.push(this);
  }
  send(s: string) {
    this.sent.push(s);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  msg(s: string) {
    this.onmessage?.({ data: s });
  }
}

const g = globalThis as unknown as Record<string, unknown>;
g.window = globalThis;
g.WebSocket = FakeWS;
g.location = { search: '' };
g.localStorage = { getItem: () => null };

import { WorldClient } from '../src/net/worldClient';

function mk() {
  const h = { status: vi.fn(), welcome: vi.fn(), join: vi.fn(), leave: vi.fn(), snap: vi.fn(), say: vi.fn(), emote: vi.fn() };
  const c = new WorldClient(h, { name: 'Ana', hero: 'davi', skin: 'padrao' }, 'ws://x');
  return { h, c };
}

beforeEach(() => {
  FakeWS.all = [];
});

describe('WorldClient', () => {
  it('mensagens malformadas ("null", lista, welcome sem jogadores) não lançam erro', () => {
    const { h, c } = mk();
    c.connect();
    const ws = FakeWS.all[0];
    ws.open();
    for (const raw of ['null', '5', '"x"', '{', '[]', '{"t":"welcome","id":2}', '{"t":"join"}', '{"t":"snap"}', '{"t":"snap","p":5}']) {
      expect(() => ws.msg(raw)).not.toThrow();
    }
    expect(h.welcome).toHaveBeenCalledWith(2, []);
    expect(h.join).not.toHaveBeenCalled();
    expect(h.snap).not.toHaveBeenCalled();
  });

  it('depois de close() nenhuma mensagem chega à interface', () => {
    const { h, c } = mk();
    c.connect();
    const ws = FakeWS.all[0];
    ws.open();
    c.close();
    ws.msg('{"t":"leave","id":3}');
    expect(h.leave).not.toHaveBeenCalled();
  });

  it('reconectar solta a conexão antiga sem avisar "offline"', () => {
    const { h, c } = mk();
    c.connect();
    const first = FakeWS.all[0];
    c.connect();
    expect(FakeWS.all.length).toBe(2);
    expect(first.readyState).toBe(3);
    expect(h.status).not.toHaveBeenCalledWith('offline');
    first.msg('{"t":"leave","id":1}');
    expect(h.leave).not.toHaveBeenCalled();
  });
});
