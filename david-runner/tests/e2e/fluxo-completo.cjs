const { chromium } = require('playwright');
const SP = process.argv[2] || require('os').tmpdir();
const assert = (c, m) => { if (!c) { console.log('FALHOU: ' + m); process.exitCode = 1; } else console.log('ok  ' + m); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { try { if (!localStorage.getItem('davidrunner.save.v1')) localStorage.setItem('davidrunner.save.v1', JSON.stringify({ profile: { childName: 'Teste', age: 7, avatar: 'davi', parentEmail: 't@t.com', pin: '1234', consent: true, createdAt: '' } })); } catch {} });
  await page.goto((process.env.URL || 'http://localhost:4173/'));
  await page.waitForSelector('[data-testid=tap-to-start]');
  await page.click('[data-testid=splash]');
  await page.waitForSelector('[data-testid=main-menu]');

  // 1) Teclado: Enter inicia a corrida; setas movem o jogador
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-testid=game-screen]');
  await page.waitForTimeout(600);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(400);
  let x = await page.evaluate(() => window.__davidRunner.engine.player.lane);
  assert(x === 0, 'seta esquerda troca para a pista 0');
  await page.keyboard.press('KeyD'); await page.keyboard.press('KeyD');
  await page.waitForTimeout(400);
  x = await page.evaluate(() => window.__davidRunner.engine.player.lane);
  assert(x === 2, 'tecla D troca para a pista 2');
  await page.keyboard.press('Space');
  const jumped = await page.waitForFunction(() => window.__davidRunner.engine.player.y > 0.2, null, { timeout: 1500 }).then(() => true, () => false);
  assert(jumped, 'espaço faz pular');
  // 2) Gesto de deslizar (mouse/touch via pointer events)
  await page.waitForTimeout(800);
  await page.mouse.move(500, 400); await page.mouse.down(); await page.mouse.move(380, 400, { steps: 4 }); await page.mouse.up();
  await page.waitForTimeout(400);
  x = await page.evaluate(() => window.__davidRunner.engine.player.lane);
  assert(x === 1, 'gesto para a esquerda troca de pista');
  await page.mouse.move(500, 400); await page.mouse.down(); await page.mouse.move(500, 470, { steps: 4 }); await page.mouse.up();
  await page.waitForTimeout(60);
  assert(await page.evaluate(() => window.__davidRunner.engine.player.sliding), 'gesto para baixo faz deslizar');
  // 3) Pausa com Esc
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-testid=pause-screen]');
  assert(true, 'Esc abre a pausa');
  const d0 = await page.evaluate(() => window.__davidRunner.engine.distance);
  await page.waitForTimeout(500);
  const d1 = await page.evaluate(() => window.__davidRunner.engine.distance);
  assert(d0 === d1, 'jogo parado durante a pausa');
  await page.click('[data-testid=btn-resume]');
  await page.waitForTimeout(2600);
  assert(await page.evaluate(() => window.__davidRunner.engine.mode === 'playing'), 'continuar após contagem regressiva');

  // 4) Reviver com moedas
  await page.evaluate(() => { window.__davidRunner.progression.data.coins = 1000; });
  await page.evaluate(() => window.__davidRunner.engine.simulate(90));
  await page.waitForSelector('[data-testid=revive-screen]', { timeout: 8000 });
  assert(true, 'oferta de reviver aparece');
  await page.click('[data-testid=btn-revive]');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ mode: window.__davidRunner.engine.mode, coins: window.__davidRunner.progression.data.coins }));
  assert(after.mode === 'playing' && after.coins === 700, 'reviver cobra 300 moedas e retoma a corrida');
  await page.evaluate(() => window.__davidRunner.engine.simulate(120));
  await page.waitForSelector('[data-testid=revive-screen], [data-testid=results-screen]', { timeout: 8000 });
  if (await page.$('[data-testid=btn-no-revive]')) await page.click('[data-testid=btn-no-revive]');
  await page.waitForSelector('[data-testid=results-screen]');
  const res = await page.evaluate(() => ({ runs: window.__davidRunner.progression.data.stats.totalRuns, records: window.__davidRunner.progression.data.records.length, ach: Object.keys(window.__davidRunner.progression.data.achievements) }));
  assert(res.runs === 1 && res.records === 1, 'corrida registrada nos recordes');
  assert(res.ach.includes('a_primeira'), 'conquista "Primeiros Passos" desbloqueada');
  await page.screenshot({ path: SP + '/e2e-results.png' });

  // 5) Jogar novamente
  await page.click('[data-testid=btn-play-again]', { force: true });
  await page.waitForTimeout(500);
  assert(await page.evaluate(() => window.__davidRunner.engine.mode === 'playing'), 'jogar novamente reinicia a corrida');
  await page.click('[data-testid=btn-pause]');
  await page.click('[data-testid=btn-quit]');
  await page.waitForSelector('[data-testid=main-menu]');
  assert(true, 'sair para o menu');

  // 6) Loja: comprar Moisés e uma melhoria
  await page.evaluate(() => { window.__davidRunner.progression.data.coins = 5000; window.__davidRunner.progression.updateSettings({}); });
  await page.click('[data-testid=btn-shop]');
  await page.$eval('[data-testid=tab-herois]', (e) => e.click());
  await page.click('[data-testid=buy-moises]');
  await page.$eval('[data-testid=tab-melhorias]', (e) => e.click());
  await page.click('[data-testid=upgrade-magnet]');
  let p = await page.evaluate(() => { const d = window.__davidRunner.progression.data; return { chars: d.characters, mag: d.upgrades.magnet, coins: d.coins, sel: d.selectedCharacter }; });
  assert(p.chars.includes('moises') && p.mag === 1 && p.coins === 5000 - 2500 + 300 - 400 && p.sel === 'moises', 'compra de herói e melhoria debitam moedas (+300 da conquista Novo Herói)');
  await page.click('[data-testid=back]');
  // 7) Mapas: desbloquear o Deserto com moedas e selecionar
  await page.click('[data-testid=btn-more]');
  await page.click('[data-testid=btn-maps]');
  await page.click('[data-testid=unlock-deserto]');
  p = await page.evaluate(() => window.__davidRunner.progression.data.selectedMap);
  assert(p === 'deserto', 'mapa Deserto desbloqueado e selecionado');
  await page.click('[data-testid=back]');
  // 8) Missão: completar e resgatar
  await page.evaluate(() => { const m = window.__davidRunner.progression.data.missions.list; m.forEach((x) => (x.progress = x.target)); window.__davidRunner.progression.updateSettings({}); });
  await page.click('[data-testid=btn-more]');
  await page.click('[data-testid=btn-missions]');
  for (let i = 0; i < 3; i++) await page.click(`[data-testid=claim-${i}]`);
  p = await page.evaluate(() => ({ mult: window.__davidRunner.progression.baseMultiplier, relics: window.__davidRunner.progression.data.relics }));
  assert(p.mult === 2 && p.relics >= 1, 'concluir as 3 missões aumenta o multiplicador para x2 e dá relíquia');
  await page.click('[data-testid=back]');
  // 9) Configurações persistem após recarregar
  await page.click('[data-testid=btn-more]');
  await page.click('[data-testid=btn-settings]');
  await page.locator('[data-testid=sensitivity] button', { hasText: 'Alta' }).click();
  await page.reload();
  await page.waitForSelector('[data-testid=tap-to-start]');
  p = await page.evaluate(() => { const d = window.__davidRunner.progression.data; return { s: d.settings.sensitivity, chars: d.characters, map: d.selectedMap, th: window.__davidRunner.engine.input.threshold }; });
  assert(p.s === 'alta' && p.th === 16 && p.chars.includes('moises') && p.map === 'deserto', 'progresso e configurações salvos localmente');
  // 10) correr com Moisés no Deserto
  await page.click('[data-testid=splash]');
  await page.click('[data-testid=btn-characters]');
  assert((await page.textContent('[data-testid=char-name]')).includes('Moisés'), 'carrossel mostra Moisés');
  if (await page.$('[data-testid=btn-select-char]')) await page.click('[data-testid=btn-select-char]');
  await page.click('[data-testid=back]');
  await page.click('[data-testid=btn-play]', { force: true });
  await page.waitForTimeout(1500);
  p = await page.evaluate(() => ({ r: window.__davidRunner.engine.getRunStats(), m: window.__davidRunner.engine.score.multiplier }));
  assert(p.r.characterId === 'moises' && p.r.mapId === 'deserto' && p.m === 2, 'corrida com Moisés no Deserto e multiplicador x2');
  await page.screenshot({ path: SP + '/e2e-moises.png' });
  console.log('erros de console:', errors.length ? errors.join('\n') : 'nenhum');
  await browser.close();
})();
