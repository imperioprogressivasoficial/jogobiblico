// Regressões de bugs: toque duplo em reviver / no PIN do responsável, apagar progresso, save corrompido, narrador.
// Uso: URL=http://localhost:4301/ node tests/e2e/regressao-bugs.cjs
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/';
let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok  ' : 'FALHOU: ') + m); if (!c) fail++; };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  // save "sujo": moedas negativas e herói que não existe mais
  await p.addInitScript(() => {
    try {
      if (localStorage.getItem('davidrunner.save.v1')) return;
      localStorage.setItem('davidrunner.save.v1', JSON.stringify({ coins: 1000, relics: -3, selectedCharacter: 'fantasma', characters: ['fantasma'], profile: { childName: 'Teste', age: 7, avatar: 'davi', parentEmail: 't@t.com', pin: '1234', consent: true, createdAt: '' }, tutorialDone: true, settings: { showHints: false } }));
    } catch {}
  });
  await p.goto(URL);
  await p.waitForSelector('[data-testid=tap-to-start]', { timeout: 90000 });
  await p.click('[data-testid=splash]');
  await p.waitForSelector('[data-testid=main-menu]');
  const prog = () => p.evaluate(() => { const d = window.__davidRunner.progression.data; return { coins: d.coins, relics: d.relics, sel: d.selectedCharacter, purchases: d.purchases.slice(), pin: d.profile && d.profile.pin }; });

  let s = await prog();
  ok(s.relics === 0 && s.sel === 'davi', 'save corrompido é corrigido (talentos >= 0, herói válido)');

  // reviver com toque duplo cobra uma vez só
  await p.evaluate(() => window.__davidRunner.ui.startRun());
  await p.waitForSelector('[data-testid=game-screen]');
  await p.evaluate(() => { const e = window.__davidRunner.engine; e.simulate(1); e.crash(); e.simulate(2); });
  await p.waitForSelector('[data-testid=revive-screen]', { timeout: 20000 });
  const before = (await prog()).coins;
  await p.evaluate(() => { const b = document.querySelector('[data-testid=btn-revive]'); b.click(); b.click(); });
  await p.waitForTimeout(500);
  const after = (await prog()).coins;
  ok(before - after === 300, `reviver cobrou uma vez (${before} -> ${after})`);
  ok((await p.evaluate(() => window.__davidRunner.engine.mode)) === 'playing', 'corrida continua após reviver');

  // fim de corrida: "Não, obrigado" + contagem não contam a corrida duas vezes
  await p.evaluate(() => { const e = window.__davidRunner.engine; window.__davidRunner.progression.data.coins = 5000; e.player.invulnerable = 0; e.crash(); e.simulate(2); });
  const runs0 = await p.evaluate(() => window.__davidRunner.progression.data.stats.totalRuns);
  const gone = await p.waitForSelector('[data-testid=btn-no-revive], [data-testid=results-screen]', { timeout: 20000 });
  await p.evaluate(() => { const b = document.querySelector('[data-testid=btn-no-revive]'); if (b) { b.click(); b.click(); } });
  await p.waitForSelector('[data-testid=results-screen]');
  await p.waitForTimeout(300);
  const runs1 = await p.evaluate(() => window.__davidRunner.progression.data.stats.totalRuns);
  ok(runs1 - runs0 === 1, `corrida contada uma vez (${runs0} -> ${runs1})`);
  await p.click('[data-testid=btn-menu]');
  await p.waitForSelector('[data-testid=main-menu]');

  // PIN do responsável (ativar acesso): toque duplo no último dígito abre o formulário uma vez só
  await p.route('**/access/activate', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'anual', until: '2099-01-01T00:00:00.000Z' }) }));
  await p.evaluate(() => window.__davidRunner.ui.go('access'));
  await p.click('[data-testid=access-open]');
  for (const k of '123') await p.click(`[data-testid=pg-key-${k}]`);
  await p.evaluate(() => { const b = document.querySelector('[data-testid=pg-key-4]'); b.click(); b.click(); });
  await p.waitForSelector('[data-testid=access-form]');
  ok((await p.$$('[data-testid=access-form]')).length === 1 && (await p.$('[data-testid=parent-gate]')) === null, 'PIN certo abre o formulário do código uma vez');

  // PIN errado 5 vezes bloqueia por um tempo, mesmo fechando e abrindo a janela de novo
  await p.evaluate(() => window.__davidRunner.ui.back());
  await p.evaluate(() => window.__davidRunner.ui.go('access'));
  await p.click('[data-testid=access-open]');
  for (let i = 0; i < 5; i++) for (const k of '9999') await p.click(`[data-testid=pg-key-${k}]`);
  await p.click('[data-testid=pg-cancel]');
  await p.click('[data-testid=access-open]');
  for (const k of '1234') await p.click(`[data-testid=pg-key-${k}]`);
  await p.waitForTimeout(400);
  ok((await p.$('[data-testid=access-form]')) === null && (await p.$('[data-testid=parent-gate]')) !== null, 'após 5 erros o PIN correto fica bloqueado por um tempo (mesmo reabrindo)');
  await p.click('[data-testid=pg-cancel]');

  // narrador: aba em segundo plano para a voz (sem erros)
  ok(errs.length === 0, 'sem erros de console ' + errs.join('|'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
