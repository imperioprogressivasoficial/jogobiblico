// Capturas de tela padronizadas para revisão visual.
// Uso: URL=http://localhost:4173/ node tests/e2e/capturas.cjs <pasta-de-saida> [filtro]
// filtro opcional: menu | herois | mapas | acoes | celular (padrão: tudo)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || 'capturas';
const ONLY = process.argv[3] || 'all';
const URL = process.env.URL || 'http://localhost:4173/';
const want = (k) => ONLY === 'all' || ONLY === k;
fs.mkdirSync(OUT, { recursive: true });
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const RUN = (mapId, characterId, seed) => ({ mapId, characterId, skinId: 'padrao', baseMultiplier: 1, durations: { magnet: 10, double: 10, shield: 12 }, seed });

async function enter(page) {
  await page.goto(URL);
  await page.waitForSelector('[data-testid=tap-to-start]', { timeout: 30000 });
  await page.click('[data-testid=splash]');
  await page.waitForSelector('[data-testid=main-menu]');
}

(async () => {
  const browser = await chromium.launch({ args: ARGS });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await enter(page);
  const shot = async (name, wait = 900) => {
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${OUT}/${name}.png` });
  };
  if (want('menu')) await shot('01-menu', 1500);
  if (want('herois')) {
    await page.click('[data-testid=btn-characters]');
    for (let i = 0; i < 6; i++) {
      await shot(`02-heroi-${i}`, 1100);
      await page.click('[data-testid=char-next]');
    }
    await page.click('[data-testid=back]');
  }
  if (want('mapas') || want('acoes')) {
    await page.evaluate(() => window.__davidRunner.ui.go('game', true));
    const maps = ['jerusalem', 'deserto', 'vale', 'egito', 'babilonia'];
    for (let i = 0; i < maps.length && want('mapas'); i++) {
      await page.evaluate(({ o }) => {
        const e = window.__davidRunner.engine;
        e.startRun(o);
        e.autopilot = true;
        e.simulate(12);
      }, { o: RUN(maps[i], ['davi', 'moises', 'noe', 'jose', 'daniel'][i], 50 + i) });
      await shot(`03-mapa-${maps[i]}`, 1200);
    }
    if (want('acoes')) {
      await page.evaluate(({ o }) => {
        const e = window.__davidRunner.engine;
        e.startRun(o);
        e.godMode = true;
        e.simulate(6);
        e.action('jump');
        e.simulate(0.2);
      }, { o: RUN('jerusalem', 'davi', 7) });
      await shot('04-pulo', 300);
      await page.evaluate(() => { const e = window.__davidRunner.engine; e.simulate(1); e.action('slide'); e.simulate(0.15); });
      await shot('05-deslize', 300);
      await page.evaluate(() => { const e = window.__davidRunner.engine; e.godMode = false; e.simulate(60); });
      await shot('06-colisao', 500);
    }
  }
  const stats = await page.evaluate(() => window.__davidRunner.engine.getStats());
  await ctx.close();
  if (want('celular')) {
    const m = await browser.newContext({ ...devices['iPhone 13'] });
    const mp = await m.newPage();
    mp.on('pageerror', (e) => errors.push(e.message));
    await enter(mp);
    await mp.waitForTimeout(1500);
    await mp.screenshot({ path: `${OUT}/07-celular-menu.png` });
    await mp.click('[data-testid=btn-play]', { force: true });
    await mp.waitForTimeout(600);
    await mp.evaluate(() => { const e = window.__davidRunner.engine; e.autopilot = true; e.simulate(10); });
    await mp.waitForTimeout(1000);
    await mp.screenshot({ path: `${OUT}/08-celular-corrida.png` });
    await m.close();
  }
  console.log(JSON.stringify({ stats, errors }));
  await browser.close();
})();
