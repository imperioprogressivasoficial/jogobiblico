const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.addInitScript(() => { try { if (!localStorage.getItem('davidrunner.save.v1')) localStorage.setItem('davidrunner.save.v1', JSON.stringify({ profile: { childName: 'Teste', age: 7, avatar: 'davi', parentEmail: 't@t.com', pin: '1234', consent: true, createdAt: '' } })); } catch {} });
  await page.goto((process.env.URL || 'http://localhost:4173/'));
  await page.waitForFunction(() => window.__davidRunner && window.__davidRunner.engine);
  const res = await page.evaluate(() => {
    const { engine } = window.__davidRunner;
    const out = {};
    const noShield = { magnet: 10, double: 10, shield: 0 };
    let shieldBreaks = 0;
    engine.on('shieldBreak', () => shieldBreaks++);
    // 1) sem entrada: deve bater
    const idle = [];
    for (const seed of [1, 2, 3, 4, 5]) {
      engine.startRun({ mapId: 'jerusalem', characterId: 'davi', skinId: 'padrao', baseMultiplier: 1, durations: noShield, seed });
      engine.simulate(120);
      idle.push({ mode: engine.mode, distance: engine.getRunStats().distance });
    }
    out.idle = idle;
    // 2) piloto sem escudo
    const ap = [];
    for (const seed of [101, 202, 303]) {
      engine.startRun({ mapId: 'jerusalem', characterId: 'davi', skinId: 'padrao', baseMultiplier: 1, durations: noShield, seed });
      engine.autopilot = true;
      engine.simulate(300);
      ap.push({ mode: engine.mode, distance: engine.getRunStats().distance, stumbles: engine.getRunStats().stumbles });
      engine.autopilot = false;
    }
    out.autopilotNoShield = ap;
    out.shieldBreaks = shieldBreaks;
    // 3) pulo/deslize manuais respondem
    engine.startRun({ mapId: 'jerusalem', characterId: 'davi', skinId: 'padrao', baseMultiplier: 1, durations: noShield, seed: 9 });
    engine.godMode = true;
    engine.action('jump'); engine.simulate(0.15); const yJump = engine.player.y;
    engine.simulate(1);
    engine.action('slide'); engine.simulate(0.1); const sliding = engine.player.sliding;
    engine.simulate(1);
    engine.action('left'); engine.simulate(0.3); const xLeft = engine.player.x;
    engine.action('right'); engine.action('right'); engine.simulate(0.3); const xRight = engine.player.x;
    engine.action('jump'); engine.simulate(0.1); engine.action('slide'); engine.simulate(0.2); const fastFall = { y: engine.player.y, grounded: engine.player.grounded, sliding: engine.player.sliding };
    engine.godMode = false;
    out.controls = { yJump, sliding, xLeft, xRight, fastFall };
    return out;
  });
  console.log(JSON.stringify(res, null, 1));
  const ok = (c, m) => { console.log((c ? 'ok  ' : 'FALHOU: ') + m); if (!c) process.exitCode = 1; };
  ok(res.idle.every((r) => r.mode === 'over'), 'sem comandos, o jogador colide (colisões funcionam)');
  ok(res.autopilotNoShield.every((r) => r.mode === 'playing'), 'piloto sem escudo sobrevive (percurso sempre possível)');
  ok(res.shieldBreaks === 0, 'nenhuma colisão absorvida por escudo');
  ok(res.controls.yJump > 1, 'pulo');
  ok(res.controls.sliding, 'deslize');
  ok(res.controls.xLeft < -2 && res.controls.xRight > 2, 'troca de pista');
  ok(res.controls.fastFall.grounded && res.controls.fastFall.sliding, 'descida rápida no ar vira deslize');
  await browser.close();
})();
