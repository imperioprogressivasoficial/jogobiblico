// Testes dos códigos de acesso (compra feita fora do app).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { activate, check, issue, normCode } from './access.js';

const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'acesso-')), 'a.json');
const [c] = issue({ plan: 'anual', days: 365 }, file);
assert.match(c, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
assert.equal(normCode(c.toLowerCase().replace(/-/g, ' ')), c, 'aceita minúsculas e espaços');
assert.equal(activate('XXXX-XXXX-XXXX', 'a', file).ok, false, 'código inexistente');
const r = activate(c, 'aparelho-1', file);
assert.equal(r.ok, true);
assert.ok(Date.parse(r.until) > Date.now() + 360 * 86_400_000, 'validade começa na ativação');
assert.equal(check(c, 'aparelho-1', file).ok, true);
assert.equal(check(c, 'outro', file).ok, false, 'check só vale no aparelho ativado');
activate(c, 'aparelho-2', file);
activate(c, 'aparelho-3', file);
assert.equal(activate(c, 'aparelho-4', file).error, 'limite', 'no máximo 3 aparelhos');
assert.equal(activate(c, 'aparelho-1', file).ok, true, 'reativar no mesmo aparelho funciona');
assert.equal(check(c, 'aparelho-1', file, Date.now() + 400 * 86_400_000).error, 'expirado');
const [life] = issue({ plan: 'vitalicio', days: 0 }, file);
assert.equal(activate(life, 'x', file).until, null, 'sem prazo');
console.log('acesso: ok');
