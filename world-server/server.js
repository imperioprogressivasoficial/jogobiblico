// Servidor do Mundo Aberto (beta) do Jogo Bíblico.
//
// Segurança para crianças (regras fixas, não configuráveis pelo cliente):
//  - NÃO existe chat livre: só frases prontas (PHRASES) e gestos (EMOTES), escolhidos por id.
//  - Nome exibido: só o primeiro nome, letras, até 12 caracteres, passado por filtro.
//  - Nada é gravado em disco; ao sair, a pessoa some. Não há IP, e-mail ou idade no servidor.
//  - Salas de até MAX_ROOM jogadores; limite de mensagens por segundo; posição validada.
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { handleAccess } from './access.js';

export const PORT = Number(process.env.PORT || 8787);
export const MAX_ROOM = Number(process.env.MAX_ROOM || 24);
const WORLD_RADIUS = 46;
const MAX_SPEED = 7; // m/s (corrida na praça); acima disso a posição é "puxada"
const TICK_MS = 100;

export const PHRASES = [
  'Oi! Vamos brincar?',
  'Que legal!',
  'Obrigado!',
  'Deus ama você!',
  'Vamos jogar juntos?',
  'Parabéns!',
  'Tchau, até logo!',
  'Estou aprendendo a Bíblia!',
];
export const EMOTES = ['wave', 'dance', 'jump', 'pray'];

const BAD = ['merd', 'porr', 'caralh', 'puta', 'fdp', 'cu', 'buceta', 'viad', 'cacete', 'foda', 'fuder', 'nazi', 'hitler', 'sexo', 'sex'];

export function cleanName(raw) {
  let s = String(raw ?? '').normalize('NFKD').replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 12);
  if (s.length < 2) return 'Amigo';
  const low = s.toLowerCase();
  // palavras curtas ("cu", "fdp", "sex") só valem no começo do nome: "Marcus" e "Lucas" são nomes comuns
  if (BAD.some((b) => (b.length <= 3 ? low.startsWith(b) : low.includes(b)))) return 'Amigo';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function createWorld({ port = PORT, host = '0.0.0.0', accessFile } = {}) {
  // um só servidor HTTP: rotas /access/* (códigos de acesso) e o WebSocket do mundo
  const server = http.createServer((req, res) => {
    if (handleAccess(req, res, accessFile)) return;
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('Mundo Aberto');
  });
  server.listen(port, host);
  const wss = new WebSocketServer({ server, maxPayload: 512 });
  const rooms = []; // cada sala: Map(id -> player)
  let nextId = 1;

  function roomFor() {
    for (const r of rooms) if (r.size < MAX_ROOM) return r;
    const r = new Map();
    r.num = rooms.length + 1;
    rooms.push(r);
    return r;
  }
  const send = (ws, o) => ws.readyState === 1 && ws.send(JSON.stringify(o));
  const pub = (p) => ({ id: p.id, name: p.name, hero: p.hero, skin: p.skin, x: p.x, z: p.z, r: p.r, a: p.a });

  wss.on('connection', (ws) => {
    const p = { id: 0, name: 'Amigo', hero: 'davi', skin: 'padrao', x: 0, z: 6, r: 0, a: 0, room: null, ws, last: Date.now(), msgs: 0, lastPos: Date.now(), phraseAt: 0 };
    ws.isAlive = true;
    ws.on('pong', () => (ws.isAlive = true));

    ws.on('message', (data) => {
      let m;
      try {
        m = JSON.parse(data.toString());
      } catch {
        return;
      }
      // "null", números e listas são JSON válidos, mas não são mensagens: ignora (antes derrubava o servidor)
      if (!m || typeof m !== 'object' || Array.isArray(m)) return;
      p.msgs++;
      if (p.msgs > 40) return; // limite por segundo (zera a cada 1 s)
      if (m.t === 'join' && !p.room) {
        p.id = nextId++;
        p.name = cleanName(m.name);
        p.hero = String(m.hero || 'davi').replace(/[^a-z]/g, '').slice(0, 12) || 'davi';
        p.skin = String(m.skin || 'padrao').replace(/[^a-z]/g, '').slice(0, 16) || 'padrao';
        p.x = (Math.random() - 0.5) * 6;
        p.z = 6 + Math.random() * 3;
        p.room = roomFor();
        p.room.set(p.id, p);
        send(ws, { t: 'welcome', id: p.id, room: p.room.num, players: [...p.room.values()].filter((o) => o !== p).map(pub) });
        for (const o of p.room.values()) if (o !== p) send(o.ws, { t: 'join', p: pub(p) });
        return;
      }
      if (!p.room) return;
      if (m.t === 'pos') {
        const now = Date.now();
        const dt = Math.min(0.5, Math.max(0.03, (now - p.lastPos) / 1000)); // teto: quem fica parado não "junta" distância para teletransportar
        p.lastPos = now;
        let x = Number(m.x), z = Number(m.z);
        if (!Number.isFinite(x) || !Number.isFinite(z)) return;
        // limite de velocidade: não deixa "teletransportar"
        const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz), max = MAX_SPEED * dt * 1.5 + 0.2;
        if (d > max) { x = p.x + (dx / d) * max; z = p.z + (dz / d) * max; }
        const rr = Math.hypot(x, z);
        if (rr > WORLD_RADIUS) { x = (x / rr) * WORLD_RADIUS; z = (z / rr) * WORLD_RADIUS; }
        p.x = x; p.z = z;
        const r = Number(m.r);
        p.r = Number.isFinite(r) ? Math.max(-100, Math.min(100, r)) : 0;
        p.a = [0, 1, 2, 3, 4].includes(m.a) ? m.a : 0; // 0 parado, 1 andando, 2 correndo, 3 gesto, 4 pulo
      } else if (m.t === 'say') {
        const i = Number(m.id);
        if (!Number.isInteger(i) || i < 0 || i >= PHRASES.length) return;
        if (Date.now() - p.phraseAt < 1200) return;
        p.phraseAt = Date.now();
        for (const o of p.room.values()) send(o.ws, { t: 'say', id: p.id, i });
      } else if (m.t === 'emote') {
        if (!EMOTES.includes(m.e)) return;
        for (const o of p.room.values()) send(o.ws, { t: 'emote', id: p.id, e: m.e });
      }
    });

    ws.on('close', () => {
      if (!p.room) return;
      p.room.delete(p.id);
      for (const o of p.room.values()) send(o.ws, { t: 'leave', id: p.id });
    });
    ws.on('error', () => ws.terminate());
  });

  const tick = setInterval(() => {
    for (const r of rooms) {
      if (r.size < 2) {
        for (const p of r.values()) p.msgs = 0;
        continue;
      }
      const snap = [...r.values()].map((p) => [p.id, +p.x.toFixed(2), +p.z.toFixed(2), +p.r.toFixed(2), p.a]);
      const msg = JSON.stringify({ t: 'snap', p: snap });
      for (const p of r.values()) {
        if (p.ws.readyState === 1) p.ws.send(msg);
      }
    }
  }, TICK_MS);
  const reset = setInterval(() => rooms.forEach((r) => r.forEach((p) => (p.msgs = 0))), 1000);
  const ping = setInterval(() => {
    wss.clients.forEach((c) => {
      if (!c.isAlive) return c.terminate();
      c.isAlive = false;
      c.ping();
    });
  }, 15000);

  return {
    wss,
    rooms,
    close: () => new Promise((res) => { clearInterval(tick); clearInterval(reset); clearInterval(ping); wss.clients.forEach((c) => c.terminate()); wss.close(() => server.close(() => res())); }),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createWorld();
  console.log(`Mundo Aberto no ar na porta ${PORT}`);
}
