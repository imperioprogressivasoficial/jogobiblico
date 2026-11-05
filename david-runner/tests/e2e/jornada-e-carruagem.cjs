// Jornada Bíblica, Carruagem de Fogo e Modo Criança.
// Uso: URL=http://localhost:4173/ node tests/e2e/jornada-e-carruagem.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/';
let failed = 0;
const assert = (c, m) => {
  if (!c) {
    console.log('FALHOU: ' + m);
    failed++;
  } else console.log('ok  ' + m);
};
const RUN = (seed, extra = {}) => ({
  mapId: 'jerusalem',
  characterId: 'davi',
  skinId: 'padrao',
  baseMultiplier: 1,
  durations: { magnet: 10, double: 10, shield: 12 },
  seed,
  ...extra,
});

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const skip = (sec) => page.evaluate((sec) => { const e = window.__davidRunner.engine; e.autopilot = true; e.simulate(sec); e.autopilot = false; }, sec);
  await page.goto(URL);
  await page.waitForSelector('[data-testid=tap-to-start]');
  await page.click('[data-testid=splash]');
  await page.waitForSelector('[data-testid=main-menu]');

  // ---------------------------------------------------------------- Jornada
  const total = null;
  await page.click('[data-testid=btn-journey]');
  await page.waitForSelector('[data-testid=journey-screen]');
  let count = await page.textContent('[data-testid=journey-count]');
  assert(/📖\s*0/.test(count), 'Jornada começa com 0 histórias reveladas');
  assert((await page.$('[data-testid=story-locked-criacao]')) !== null, 'primeira história aparece bloqueada');
  await page.click('[data-testid=back]');

  // corrida com um pergaminho: desbloqueia "A Criação"
  await page.click('[data-testid=btn-play]', { force: true });
  await page.waitForSelector('[data-testid=game-screen]');
  await page.evaluate(() => {
    const e = window.__davidRunner.engine;
    e.startRun({ mapId: 'jerusalem', characterId: 'davi', skinId: 'padrao', baseMultiplier: 1, durations: { magnet: 10, double: 10, shield: 12 }, seed: 5 });
    e.autopilot = true;
    e.simulate(25); // ~300 m: já passou o primeiro pergaminho (110–150 m)
    e.autopilot = false;
    e.simulate(40); // bate
  });
  const scrollsRun = await page.evaluate(() => window.__davidRunner.engine.getRunStats().scrolls);
  assert(scrollsRun >= 1, `pergaminho coletado na corrida (${scrollsRun})`);
  await page.waitForSelector('[data-testid=revive-screen], [data-testid=results-screen]', { timeout: 10000 });
  if (await page.$('[data-testid=btn-no-revive]')) await page.click('[data-testid=btn-no-revive]');
  await page.waitForSelector('[data-testid=results-screen]');
  assert((await page.$('[data-testid=new-story-criacao]')) !== null, 'fim de corrida mostra a nova história "A Criação"');
  const unlocked = await page.evaluate(() => window.__davidRunner.progression.data.scrolls);
  assert(unlocked[0] === 'criacao', 'história "criacao" desbloqueada no salvamento');

  // leitor a partir do fim de corrida
  await page.click('[data-testid=read-criacao]');
  await page.waitForSelector('[data-testid=story-reader]');
  assert(await page.$('[data-testid=reader-step-page]'), 'leitor abre na primeira página');
  const text1 = await page.textContent('[data-testid=reader-text]');
  await page.click('[data-testid=reader-next]');
  const text2 = await page.textContent('[data-testid=reader-text]');
  assert(text1 && text2 && text1 !== text2, 'Próxima muda a página');
  // avança até o quiz
  for (let i = 0; i < 12 && !(await page.$('[data-testid=reader-step-quiz]')); i++) await page.click('[data-testid=reader-next]');
  assert(await page.$('[data-testid=reader-step-quiz]'), 'chega ao quiz');
  const read = await page.evaluate(() => window.__davidRunner.progression.data.storiesRead.includes('criacao'));
  assert(read, 'história marcada como lida');
  const coinsBefore = await page.evaluate(() => window.__davidRunner.progression.data.coins);
  const answer = 2; // "No sétimo dia" (índice 2) na história da Criação
  const wrongIdx = (answer + 1) % 3;
  await page.click(`[data-testid=quiz-opt-${wrongIdx}]`);
  assert(await page.waitForSelector('[data-testid=quiz-try]', { timeout: 3000 }).then(() => true, () => false), 'resposta errada mostra "Tente de novo"');
  await page.click(`[data-testid=quiz-opt-${answer}]`);
  await page.waitForSelector('[data-testid=quiz-win]');
  const coinsAfter = await page.evaluate(() => window.__davidRunner.progression.data.coins);
  assert(coinsAfter - coinsBefore === 50, `acertar o quiz dá +50 moedas (${coinsAfter - coinsBefore})`);
  await page.click('[data-testid=reader-close]');
  await page.waitForSelector('[data-testid=story-reader]', { state: 'detached' });
  // segunda vez: sem moedas
  await page.click('[data-testid=btn-menu]', { force: true });
  await page.waitForSelector('[data-testid=main-menu]');
  await page.click('[data-testid=btn-journey]');
  await page.click('[data-testid=story-criacao]');
  await page.waitForSelector('[data-testid=story-reader]');
  for (let i = 0; i < 12 && !(await page.$('[data-testid=reader-step-quiz]')); i++) await page.click('[data-testid=reader-next]');
  // quiz já acertado: aparece resolvido, sem pedir de novo (e sem pagar de novo)
  if (!(await page.$('[data-testid=quiz-win]'))) {
    await page.click(`[data-testid=quiz-opt-${answer}]`);
    await page.waitForSelector('[data-testid=quiz-win]');
  }
  const coinsAgain = await page.evaluate(() => window.__davidRunner.progression.data.coins);
  assert(coinsAgain === coinsAfter, 'quiz repetido não dá moedas de novo');
  await page.click('[data-testid=reader-close]');
  count = await page.textContent('[data-testid=journey-count]');
  assert(/📖\s*1/.test(count), 'Jornada mostra 1 história revelada');
  if (total) assert(count.includes(`de ${total}`), `Jornada mostra o total de ${total} histórias`);
  await page.click('[data-testid=back]');

  // ---------------------------------------------------------------- Carruagem de Fogo
  const charges0 = await page.evaluate(() => window.__davidRunner.progression.data.chariot.charges);
  assert(charges0 === 3, `jogador começa com 3 cargas (${charges0})`);
  await page.click('[data-testid=btn-play]', { force: true });
  await page.waitForSelector('[data-testid=game-screen]');
  await page.waitForTimeout(400);
  // qualidade baixa deixa o navegador de teste (renderização por software) rápido o bastante para toques curtos
  await page.evaluate(() => window.__davidRunner.engine.setQuality('baixa'));
  // toque duplo no canvas (dois toques rápidos, dedo parado)
  const box = await page.locator('canvas').boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // dois toques seguidos (dedo parado), disparados na mesma tarefa: não dependem da latência do navegador de teste
  const tap = () => page.evaluate(({ x, y }) => {
    const c = document.querySelector('canvas');
    const ev = (type) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: x, clientY: y }));
    ev('pointerdown'); ev('pointerup'); ev('pointerdown'); ev('pointerup');
  }, { x: cx, y: cy });
  await tap();
  await page.waitForTimeout(300);
  let st = await page.evaluate(() => ({ active: window.__davidRunner.engine.chariot.active, charges: window.__davidRunner.engine.chariot.charges }));
  assert(st.active && st.charges === 2, `toque duplo ativa a Carruagem e gasta 1 carga (ativa=${st.active}, cargas=${st.charges})`);
  // durante a carruagem: atravessa obstáculos sem bater, mais rápido
  // (semente 3: há uma barraca na pista do meio logo no início; sem comandos o jogador bate nela)
  const r = await page.evaluate(() => {
    const e = window.__davidRunner.engine;
    e.startRun({ mapId: 'jerusalem', characterId: 'davi', skinId: 'padrao', baseMultiplier: 1, durations: { magnet: 10, double: 10, shield: 12 }, seed: 3, chariot: { charges: 2, duration: 8 } });
    e.activateBoost();
    e.simulate(5);
    return { mode: e.mode, smashed: e.getRunStats().smashed, mul: e.chariot.speedMul, charges: e.chariot.charges };
  });
  assert(r.mode === 'playing' && r.smashed > 0, `atravessa obstáculos sem colidir (destruídos=${r.smashed}, modo=${r.mode})`);
  assert(r.mul > 1.3, `velocidade aumentada durante a carruagem (x${r.mul.toFixed(2)})`);
  await page.evaluate(() => { window.__davidRunner.engine.chariot.charges = 2; });
  // não ativa de novo enquanto ativa
  await page.keyboard.press('KeyE');
  st = await page.evaluate(() => window.__davidRunner.engine.chariot.charges);
  assert(st === 2, 'tecla E não gasta carga enquanto a carruagem já está ativa');
  // espera acabar (8 s + proteção) e ativa com a tecla E
  await skip(6);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(100);
  st = await page.evaluate(() => ({ active: window.__davidRunner.engine.chariot.active, charges: window.__davidRunner.engine.chariot.charges }));
  assert(st.active && st.charges === 1, `tecla E ativa a Carruagem (cargas=${st.charges})`);
  // botão do HUD
  await skip(12);
  await page.waitForSelector('[data-testid=btn-chariot]:not(.active)', { timeout: 5000 });
  await page.click('[data-testid=btn-chariot]');
  await page.waitForTimeout(100);
  st = await page.evaluate(() => ({ active: window.__davidRunner.engine.chariot.active, charges: window.__davidRunner.engine.chariot.charges }));
  assert(st.active && st.charges === 0, `botão do HUD ativa a Carruagem (cargas=${st.charges})`);
  // sem cargas: não ativa
  await skip(12);
  await page.keyboard.press('KeyE');
  st = await page.evaluate(() => window.__davidRunner.engine.chariot.active);
  assert(!st, 'sem cargas, não ativa');
  // um gesto de deslizar não conta como toque
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx, cy + 80, { steps: 4 }); await page.mouse.up();
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx, cy + 80, { steps: 4 }); await page.mouse.up();
  const slides = await page.evaluate(() => window.__davidRunner.engine.getRunStats().slides);
  assert(slides >= 1, `gestos de deslizar continuam funcionando com o toque duplo ativo (deslizes=${slides})`);
  // cargas gastas são salvas ao terminar a corrida
  await page.evaluate(() => { const e = window.__davidRunner.engine; e.simulate(60); });
  await page.waitForSelector('[data-testid=revive-screen], [data-testid=results-screen]', { timeout: 10000 });
  if (await page.$('[data-testid=btn-no-revive]')) await page.click('[data-testid=btn-no-revive]');
  await page.waitForSelector('[data-testid=results-screen]');
  const saved = await page.evaluate(() => window.__davidRunner.progression.data.chariot.charges);
  assert(saved === 0, `cargas gastas ficam salvas (${saved})`);
  await page.click('[data-testid=btn-menu]', { force: true });
  await page.waitForSelector('[data-testid=main-menu]');

  // loja: comprar carga
  await page.evaluate(() => { window.__davidRunner.progression.data.coins = 1000; window.__davidRunner.progression.updateSettings({}); });
  await page.click('[data-testid=btn-shop]');
  await page.click('[data-testid=tab-poderes]');
  await page.click('[data-testid=buy-charge-chariot]');
  const bought = await page.evaluate(() => ({ c: window.__davidRunner.progression.data.powers.chariot.charges, coins: window.__davidRunner.progression.data.coins }));
  assert(bought.c === 1 && bought.coins === 750, `comprar carga na loja (cargas=${bought.c}, moedas=${bought.coins})`);

  // ---------------------------------------------------------------- outros poderes
  const RUNP = (id, charges, seed) => page.evaluate(({ id, charges, seed }) => {
    const e = window.__davidRunner.engine;
    e.startRun({ mapId: 'jerusalem', characterId: 'davi', skinId: 'padrao', baseMultiplier: 1, durations: { magnet: 10, double: 10, shield: 0 }, seed, chariot: { id, charges, duration: 7 } });
  }, { id, charges, seed });
  // Funda: a pedra destrói o obstáculo à frente (semente 3: barraca na pista do meio logo no início)
  await RUNP('funda', 5, 3);
  let r2 = await page.evaluate(() => { const e = window.__davidRunner.engine; while (e.distance < 30) e.simulate(0.1); const ok = e.activateBoost(); e.simulate(0.6); return { ok, charges: e.chariot.charges, smashed: e.getRunStats().smashed, mode: e.mode }; });
  assert(r2.ok && r2.charges === 4 && r2.smashed === 1, `Funda lança pedra e destrói 1 obstáculo (pedras=${r2.charges}, destruídos=${r2.smashed})`);
  // Manto: atravessa sem destruir
  await RUNP('manto', 2, 3);
  r2 = await page.evaluate(() => { const e = window.__davidRunner.engine; e.activateBoost(); e.simulate(5); return { mode: e.mode, smashed: e.getRunStats().smashed, dist: e.distance }; });
  assert(r2.mode === 'playing' && r2.smashed === 0 && r2.dist > 50, `Manto protege sem destruir (modo=${r2.mode}, destruídos=${r2.smashed})`);
  // Cajado: obstáculos se afastam e não batem
  await RUNP('cajado', 2, 3);
  r2 = await page.evaluate(() => { const e = window.__davidRunner.engine; e.activateBoost(); e.simulate(5); const far = e.obstacles.active.filter((o) => o.hit && Math.abs(o.mesh.position.x) > 4).length; return { mode: e.mode, far }; });
  assert(r2.mode === 'playing' && r2.far >= 1, `Cajado afasta os obstáculos do caminho (afastados=${r2.far}, modo=${r2.mode})`);
  // Harpa: moedas em dobro
  await RUNP('harpa', 2, 5);
  r2 = await page.evaluate(() => { const e = window.__davidRunner.engine; e.autopilot = true; e.simulate(2); const c0 = e.getRunStats().coins; e.activateBoost(); e.simulate(1); const c1 = e.getRunStats().coins; e.autopilot = false; return { c0, c1, mul: e.score.multiplier }; });
  assert(r2.c1 > r2.c0 && r2.mul === 2, `Harpa dobra moedas e pontos (x${r2.mul})`);
  // Sansão: destrói sem acelerar
  await RUNP('sansao', 2, 3);
  r2 = await page.evaluate(() => { const e = window.__davidRunner.engine; e.activateBoost(); e.simulate(5); return { mode: e.mode, smashed: e.getRunStats().smashed, mul: e.chariot.speedMul }; });
  assert(r2.mode === 'playing' && r2.smashed >= 1 && r2.mul === 1, `Força de Sansão derruba obstáculos sem acelerar (destruídos=${r2.smashed})`);
  // desbloqueio e equipar na loja
  await page.evaluate(() => { const p = window.__davidRunner.progression; p.data.coins = 5000; p.updateSettings({}); });
  await page.click('[data-testid=unlock-harpa]');
  await page.click('[data-testid=equip-harpa]');
  const eq = await page.evaluate(() => ({ eq: window.__davidRunner.progression.data.equippedPower, ch: window.__davidRunner.progression.data.powers.harpa.charges, coins: window.__davidRunner.progression.data.coins }));
  assert(eq.eq === 'harpa' && eq.ch === 2 && eq.coins === 4000, `desbloquear (1.000 moedas) e equipar a Harpa (cargas=${eq.ch})`);
  await page.evaluate(() => window.__davidRunner.progression.equipPower('chariot'));
  await page.click('[data-testid=back]');

  // ---------------------------------------------------------------- Modo Criança
  const speeds = await page.evaluate(() => {
    const { engine, ui, progression } = window.__davidRunner;
    const measure = () => { engine.autopilot = true; engine.simulate(20); engine.autopilot = false; return engine.speed; };
    progression.updateSettings({ difficulty: 'normal' });
    ui.startRun(); const normal = measure();
    progression.updateSettings({ difficulty: 'crianca' });
    ui.startRun(); const kid = measure();
    ui.showMenuScene(); ui.home();
    return { normal, kid };
  });
  assert(speeds.kid < speeds.normal * 0.9, `modo Criança é mais lento (${speeds.kid.toFixed(1)} vs ${speeds.normal.toFixed(1)} m/s)`);
  const def = await page.evaluate(() => window.__davidRunner.progression.data.settings.difficulty);
  assert(def === 'crianca', 'dificuldade padrão é Criança');

  console.log('erros de console:', errors.length ? errors.join('\n') : 'nenhum');
  if (errors.length) failed++;
  await browser.close();
  process.exitCode = failed ? 1 : 0;
})();
