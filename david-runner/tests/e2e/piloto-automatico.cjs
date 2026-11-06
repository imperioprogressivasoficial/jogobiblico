const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { try { if (!localStorage.getItem('davidrunner.save.v1')) localStorage.setItem('davidrunner.save.v1', JSON.stringify({ profile: { childName: 'Teste', age: 7, avatar: 'davi', parentEmail: 't@t.com', pin: '1234', consent: true, createdAt: '' } })); } catch {} });
  await page.goto((process.env.URL || 'http://localhost:4173/'));
  await page.waitForFunction(() => window.__davidRunner && window.__davidRunner.engine);
  const results = await page.evaluate(() => {
    const { engine } = window.__davidRunner;
    const out = [];
    for (const mapId of ['jerusalem', 'deserto', 'vale', 'egito', 'babilonia']) {
      for (const seed of [11, 22, 33]) {
        engine.startRun({ mapId, characterId: 'davi', skinId: 'padrao', baseMultiplier: 1, durations: { magnet: 10, double: 10, shield: 12 }, seed });
        engine.autopilot = true;
        const t = engine.simulate(400); // segundos de jogo
        const r = engine.getRunStats();
        out.push({ mapId, seed, mode: engine.mode, time: Math.round(t), distance: r.distance, coins: r.coins, jumps: r.jumps, slides: r.slides, stumbles: r.stumbles, scrolls: r.scrolls, relics: r.relics, powerups: r.powerups });
        engine.autopilot = false;
      }
    }
    return out;
  });
  console.table(results);
  const crashed = results.filter((r) => r.mode !== 'playing');
  if (crashed.length || errors.length) {
    console.log('FALHOU: o piloto automático bateu em', crashed.length, 'corridas', errors.join('\n'));
    process.exitCode = 1;
  } else console.log('ok  piloto automático completou ~10 km em todos os mapas sem colidir');
  await browser.close();
})();
