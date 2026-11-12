// Acesso do Jogo Bíblico: a família compra FORA do app (site/checkout) e recebe um código.
// No app, o responsável digita o código (atrás do PIN) e o jogo completo é liberado.
//
// Rotas (o Traefik tira o prefixo /david-runner-world):
//   POST /access/activate  { code, device }  -> { ok, plan, until }  (liga o aparelho ao código)
//   POST /access/check     { code, device }  -> { ok, plan, until }  (o app confere ao abrir)
//   POST /access/issue     { plan, days, qty, note } + header x-admin-token -> { codes }
//        (para o checkout externo / webhook gerar códigos depois do pagamento)
//
// Os códigos ficam em ACCESS_FILE (no volume do servidor, fora do Git). Nada de dados da criança:
// só o código, o plano, a validade e ids aleatórios dos aparelhos.
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const ACCESS_FILE = process.env.ACCESS_FILE || path.resolve('dados/acessos.json');
// token do painel/webhook que gera códigos: variável de ambiente ou arquivo no servidor (fora do Git)
function adminToken() {
  if (process.env.ACCESS_ADMIN_TOKEN) return process.env.ACCESS_ADMIN_TOKEN;
  try {
    return fs.readFileSync(path.resolve('dados/admin-token'), 'utf8').trim();
  } catch {
    return '';
  }
}
const MAX_DEVICES = Number(process.env.ACCESS_MAX_DEVICES || 3);
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I, que confundem

let db = null;
function load(file) {
  if (db && db.file === file) return db;
  let codes = {};
  try {
    codes = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    codes = {};
  }
  db = { file, codes };
  return db;
}
function save() {
  fs.mkdirSync(path.dirname(db.file), { recursive: true });
  const tmp = db.file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db.codes, null, 1));
  fs.renameSync(tmp, db.file);
}

export function normCode(raw) {
  const s = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 12 ? `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}` : '';
}

export function newCode() {
  const b = randomBytes(12);
  let s = '';
  for (let i = 0; i < 12; i++) s += ALPHA[b[i] % ALPHA.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

/** Gera códigos novos. days = 0 é acesso sem prazo (vitalício). */
export function issue({ plan = 'anual', days = 365, qty = 1, note = '' } = {}, file = ACCESS_FILE) {
  const d = load(file);
  const n = Math.max(1, Math.min(500, Math.floor(Number(qty) || 1)));
  const out = [];
  for (let i = 0; i < n; i++) {
    let c = newCode();
    while (d.codes[c]) c = newCode();
    d.codes[c] = { plan: String(plan).slice(0, 20), days: Math.max(0, Math.floor(Number(days) || 0)), note: String(note).slice(0, 80), created: new Date().toISOString(), until: null, devices: [], revoked: false };
    out.push(c);
  }
  save();
  return out;
}

function view(e) {
  return { ok: true, plan: e.plan, until: e.until };
}

/** Liga o aparelho ao código (a validade começa a contar na primeira ativação). */
export function activate(code, device, file = ACCESS_FILE, now = Date.now()) {
  const d = load(file);
  const c = normCode(code);
  const dev = String(device ?? '').slice(0, 64);
  const e = c && d.codes[c];
  if (!e || e.revoked) return { ok: false, error: 'codigo' };
  if (!dev) return { ok: false, error: 'aparelho' };
  if (e.until && Date.parse(e.until) < now) return { ok: false, error: 'expirado' };
  if (!e.devices.includes(dev)) {
    if (e.devices.length >= MAX_DEVICES) return { ok: false, error: 'limite' };
    e.devices.push(dev);
  }
  if (!e.until && e.days > 0) e.until = new Date(now + e.days * 86_400_000).toISOString();
  save();
  return view(e);
}

/** O app confere ao abrir: o código ainda vale para este aparelho? */
export function check(code, device, file = ACCESS_FILE, now = Date.now()) {
  const e = load(file).codes[normCode(code)];
  if (!e || e.revoked || !e.devices.includes(String(device ?? ''))) return { ok: false, error: 'codigo' };
  if (e.until && Date.parse(e.until) < now) return { ok: false, error: 'expirado' };
  return view(e);
}

// ------------------------------------------------------------ HTTP
const hits = new Map(); // ip -> [inicio da janela, tentativas]
function limited(ip) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h[0] > 60_000) {
    hits.set(ip, [now, 1]);
    return false;
  }
  h[1]++;
  return h[1] > 12; // 12 tentativas por minuto por IP: impede adivinhar códigos
}

function body(req) {
  return new Promise((res) => {
    let s = '';
    req.on('data', (c) => {
      s += c;
      if (s.length > 4096) req.destroy();
    });
    req.on('end', () => {
      try {
        res(JSON.parse(s || '{}') ?? {});
      } catch {
        res({});
      }
    });
    req.on('error', () => res({}));
  });
}

/** Trata as rotas /access/*; devolve false se a rota não for de acesso. */
export function handleAccess(req, res, file = ACCESS_FILE) {
  const url = (req.url || '').split('?')[0];
  if (!url.startsWith('/access/')) return false;
  const reply = (code, o) => {
    res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, x-admin-token', 'access-control-allow-methods': 'POST, OPTIONS', 'cache-control': 'no-store' });
    res.end(JSON.stringify(o));
  };
  if (req.method === 'OPTIONS') return reply(204, {}), true;
  if (req.method !== 'POST') return reply(405, { ok: false }), true;
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return reply(429, { ok: false, error: 'espere' }), true;
  body(req).then((b) => {
    try {
      if (url === '/access/activate') return reply(200, activate(b.code, b.device, file));
      if (url === '/access/check') return reply(200, check(b.code, b.device, file));
      if (url === '/access/issue') {
        const admin = adminToken();
        if (!admin || admin.length < 24 || req.headers['x-admin-token'] !== admin) return reply(403, { ok: false });
        return reply(200, { ok: true, codes: issue(b, file) });
      }
      reply(404, { ok: false });
    } catch {
      reply(500, { ok: false });
    }
  });
  return true;
}

// Uso pelo terminal do servidor:  node access.js novo anual 365 10 "lote de teste"
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, plan, days, qty, note] = process.argv.slice(2);
  if (cmd === 'novo') console.log(issue({ plan, days: days ?? 365, qty: qty ?? 1, note: note ?? '' }).join('\n'));
  else console.log('uso: node access.js novo <plano> <dias, 0 = sem prazo> <quantidade> ["nota"]');
}
