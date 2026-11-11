const { chromium, devices } = require('playwright');
const URL = process.env.URL;
const OUT = process.env.OUT;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push('console: ' + m.text().slice(0, 200)));
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await p.addInitScript(() => localStorage.setItem('davidrunner.save.v1', JSON.stringify({ coins: 5000, relics: 8, profile: { childName: 'Lucas', age: 7, gender: 'm', avatar: 'davi', parentEmail: 'x@y.com', pin: '1234', consent: true, createdAt: '' }, tutorialDone: true, settings: { showHints: false } })));
  await p.goto(URL);
  await p.waitForSelector('[data-testid=tap-to-start]', { timeout: 90000 });
  await p.click('[data-testid=splash]');
  await p.waitForSelector('[data-testid=main-menu]');
  const screens = ['menu', 'characters', 'maps', 'records', 'shop', 'achievements', 'missions', 'settings', 'journey', 'modes', 'coins-info', 'parents'];
  for (const s of screens) {
    await p.evaluate((s) => { window.__davidRunner.ui.home(); if (s !== 'menu') window.__davidRunner.ui.go(s); }, s);
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const bad = [];
      const W = innerWidth, H = innerHeight;
      for (const e of document.querySelectorAll('.ui-layer button, .ui-layer h1, .ui-layer h2, .ui-layer strong, .ui-layer small, .ui-layer p')) {
        const b = e.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        if (b.right > W + 1 || b.left < -1) bad.push(`${e.tagName}.${(e.className || '').toString().slice(0, 20)} "${(e.textContent || '').trim().slice(0, 25)}" x=${Math.round(b.left)}..${Math.round(b.right)}`);
        else if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible') bad.push(`CLIP ${e.tagName}.${(e.className || '').toString().slice(0, 20)} "${(e.textContent || '').trim().slice(0, 25)}"`);
      }
      return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 8) };
    });
    console.log(s, JSON.stringify(r));
    if (OUT) await p.screenshot({ path: `${OUT}/${s}.png` });
  }
  console.log('ERRS', JSON.stringify(errs));
  await b.close();
})();
