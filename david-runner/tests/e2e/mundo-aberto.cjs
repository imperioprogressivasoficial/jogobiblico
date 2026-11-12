// Mundo Aberto (beta online): dois jogadores, uma sala, frase pronta e saída.
// Uso: URL=http://localhost:4173/ node tests/e2e/mundo-aberto.cjs   (sobe o servidor do mundo sozinho)
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const URL = process.env.URL || 'http://localhost:4173/';
const WS_PORT = 18790;
let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok  ' : 'FALHOU: ') + m); if (!c) fail++; };

async function player(b, name, avatar) {
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  p.setDefaultTimeout(120000); // dois WebGL em software (SwiftShader) deixam a 2ª página bem lenta
  p.errs = [];
  p.on('pageerror', (e) => p.errs.push(e.message));
  await p.addInitScript(([n, a]) => localStorage.setItem('davidrunner.save.v1', JSON.stringify({ selectedCharacter: a, characters: [a], profile: { childName: n, age: 7, gender: 'm', avatar: a, parentEmail: 'x@y.com', pin: '1234', consent: true, createdAt: '' }, tutorialDone: true, settings: { showHints: false } })), [name, avatar]);
  await p.goto(`${URL}?ws=ws://localhost:${WS_PORT}`);
  await p.waitForSelector('[data-testid=tap-to-start]', { timeout: 90000 });
  await p.click('[data-testid=splash]');
  await p.waitForSelector('[data-testid=main-menu]');
  await p.evaluate(() => window.__davidRunner.ui.go('world'));
  await p.waitForSelector('[data-testid=world-screen]');
  return p;
}

(async () => {
  const srv = spawn('node', ['server.js'], { cwd: path.join(__dirname, '../../../world-server'), env: { ...process.env, PORT: String(WS_PORT), MAX_ROOM: '24' }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const a = await player(b, 'Lucas', 'davi');
    const c = await player(b, 'Ana', 'ester');
    await c.waitForTimeout(2500);
    ok(/Online · Sala 1 · 2 jogadores/.test(await a.textContent('[data-testid=world-status]')), 'Lucas vê 2 jogadores na sala');
    ok(/2 jogadores/.test(await c.textContent('[data-testid=world-status]')), 'Ana vê 2 jogadores na sala');
    const w = await c.evaluate(() => window.__davidRunner.engine.world.remoteCount);
    ok(w === 1, 'Ana tem 1 jogador remoto no mundo 3D');
    // andar muda a posição
    const x0 = await a.evaluate(() => window.__davidRunner.engine.world.state().z);
    await a.evaluate(() => window.__davidRunner.engine.world.setMove(0, 1));
    await a.waitForTimeout(3000);
    await a.evaluate(() => window.__davidRunner.engine.world.setMove(0, 0));
    const x1 = await a.evaluate(() => window.__davidRunner.engine.world.state().z);
    ok(x0 - x1 > 0.5, `joystick move o herói para a frente (${x0.toFixed(1)} -> ${x1.toFixed(1)})`);
    // frase pronta aparece para o outro jogador
    await a.click('[data-testid=world-say]');
    await a.click('[data-testid=say-3]');
    await c.waitForSelector('.world-say', { timeout: 5000 });
    ok((await c.textContent('.world-say')).includes('Deus ama você!'), 'Ana vê a frase pronta do Lucas');
    ok((await c.evaluate(() => !document.querySelector('input[type=text], textarea'))), 'não existe campo de texto livre');
    // sair avisa o outro
    await a.click('[data-testid=world-back]');
    await c.waitForTimeout(1500);
    ok(/1 jogador\b/.test(await c.textContent('[data-testid=world-status]')), 'Ana vê que o Lucas saiu');
    ok(a.errs.length + c.errs.length === 0, 'sem erros de console');
  } catch (e) {
    console.log('FALHOU: ' + e.message);
    fail++;
  }
  await b.close();
  srv.kill();
  process.exit(fail ? 1 : 0);
})();
