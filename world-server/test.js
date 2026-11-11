// Testes do servidor: salas, nomes, frases prontas, velocidade e limites.
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createWorld, cleanName, PHRASES } from './server.js';

const PORT = 18787;
const w = createWorld({ port: PORT, host: '127.0.0.1' });
const open = () => new Promise((res) => { const s = new WebSocket(`ws://127.0.0.1:${PORT}`); s.msgs = []; s.on('message', (d) => s.msgs.push(JSON.parse(d))); s.on('open', () => res(s)); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

assert.equal(cleanName('  Lucas123!! '), 'Lucas');
assert.equal(cleanName('x'), 'Amigo');
assert.equal(cleanName('Porrada'), 'Amigo');
assert.equal(cleanName('Marcus'), 'Marcus', 'nome comum não é bloqueado por engano');
assert.equal(cleanName('Cuzao'), 'Amigo');
assert.equal(cleanName('ANA CLARA MARIA JOSE'), 'Anaclaramari');

const a = await open(); const b = await open();
a.send(JSON.stringify({ t: 'join', name: 'Ana', hero: 'ester', skin: 'padrao' })); await wait(80);
b.send(JSON.stringify({ t: 'join', name: 'Davi', hero: 'davi', skin: 'padrao' })); await wait(120);
assert.equal(a.msgs[0].t, 'welcome');
assert.ok(a.msgs.some((m) => m.t === 'join' && m.p.name === 'Davi'), 'A viu B entrar');
assert.equal(b.msgs[0].players.length, 1);

// frase pronta funciona; texto livre não
a.send(JSON.stringify({ t: 'say', id: 1 })); await wait(100);
assert.ok(b.msgs.some((m) => m.t === 'say' && m.i === 1));
const n = b.msgs.length;
a.send(JSON.stringify({ t: 'say', id: 999 })); a.send(JSON.stringify({ t: 'chat', text: 'oi' })); await wait(100);
assert.equal(b.msgs.filter((m) => m.t === 'say').length, 1, 'frase inválida ignorada');

// teletransporte é limitado
a.send(JSON.stringify({ t: 'pos', x: 40, z: 40, r: 0, a: 1 })); await wait(250);
const snap = b.msgs.filter((m) => m.t === 'snap').pop();
const pa = snap.p.find((p) => p[0] === a.msgs[0].id);
assert.ok(Math.hypot(pa[1], pa[2]) < 18, 'posição limitada: ' + JSON.stringify(pa));

// sair avisa os outros
a.close(); await wait(150);
assert.ok(b.msgs.some((m) => m.t === 'leave'));

// mensagens malformadas ("null", número, lista, r infinito) não derrubam o servidor
const bad = await open();
for (const raw of ['null', '5', '[]', '"oi"', '{']) bad.send(raw);
bad.send(JSON.stringify({ t: 'join', name: 'Bia', hero: 'ester', skin: 'padrao' })); await wait(100);
bad.send('{"t":"pos","x":1,"z":7,"r":1e999,"a":1}'); await wait(250);
assert.equal(bad.msgs[0].t, 'welcome', 'servidor continua vivo após lixo');
assert.ok(b.msgs.filter((m) => m.t === 'snap').pop().p.every((p) => p.every((v) => v !== null)), 'snapshot sem null');
bad.close();

// sala cheia abre outra sala
const many = []; for (let i = 0; i < 26; i++) { const s = await open(); s.send(JSON.stringify({ t: 'join', name: 'P' + i + 'x' })); many.push(s); }
await wait(300);
assert.equal(w.rooms.length, 2, 'segunda sala criada');
[b, ...many].forEach((s) => s.close()); await w.close();
console.log('ok  servidor do mundo: nomes, frases, velocidade, saída e salas');
