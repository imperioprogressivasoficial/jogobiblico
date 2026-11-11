#!/usr/bin/env node
/*
 * Teste da página de vendas em 4 larguras (360, 390, 430 e 1280).
 * Monta a mesma estrutura do deploy (/david-runner/ com o jogo em /david-runner/jogar/),
 * serve por um servidor estático local e confere: sem rolagem horizontal, sem erros de console,
 * todas as imagens carregadas, links internos e arquivos existentes, peso transferido.
 *
 *   node landing/tools/testar.cjs [pasta-dos-screenshots]
 * (se david-runner/dist existir, o jogo é copiado para /jogar/; senão entra uma página de teste)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..', '..');
const SHOTS = process.argv[2] ? path.resolve(process.argv[2]) : null;
const LARGURAS = [[360, 740], [390, 844], [430, 932], [1280, 800]];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-'));
  const site = path.join(tmp, 'david-runner');
  fs.cpSync(path.join(RAIZ, 'landing'), site, { recursive: true });
  const dist = path.join(RAIZ, 'david-runner', 'dist');
  if (fs.existsSync(dist)) fs.cpSync(dist, path.join(site, 'jogar'), { recursive: true });
  else { fs.mkdirSync(path.join(site, 'jogar')); fs.writeFileSync(path.join(site, 'jogar', 'index.html'), '<!doctype html><title>jogo</title>jogo'); }

  const srv = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]);
    if (u.endsWith('/')) u += 'index.html';
    const f = path.join(tmp, u);
    if (!f.startsWith(tmp) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}/david-runner/`;
  const b = await chromium.launch();
  let falhas = 0;
  const ruim = (m) => { falhas++; console.error('  FALHA: ' + m); };

  for (const [w, h] of LARGURAS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 900 ? 2 : 1, isMobile: w < 900, hasTouch: w < 900 });
    const p = await ctx.newPage();
    const erros = [];
    let bytes = 0;
    p.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
    p.on('pageerror', (e) => erros.push(String(e)));
    p.on('response', async (r) => {
      if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`);
      else { try { bytes += (await r.body()).length; } catch (e) { /* redirecionamento */ } }
    });
    await p.goto(base, { waitUntil: 'load' });
    console.log(`\n== ${w}px ==`);
    if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.waitForTimeout(1600); await p.screenshot({ path: path.join(SHOTS, `dobra-${w}.png`) }); }
    // rola a página inteira (lazy-loading + animações de entrada) e a vitrine até o fim
    const total = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += Math.round(h * 0.6)) { await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(140); }
    await p.evaluate(() => { const c = document.getElementById('car'); c.scrollIntoView(); c.scrollTo({ left: c.scrollWidth, behavior: 'instant' }); });
    await p.waitForTimeout(600);
    await p.evaluate(() => document.getElementById('car').scrollTo({ left: 0, behavior: 'instant' }));
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForLoadState('networkidle');
    await p.waitForTimeout(900);

    const r = await p.evaluate(() => {
      const de = document.documentElement;
      return {
        rolagemX: Math.max(de.scrollWidth, document.body.scrollWidth) - de.clientWidth,
        imgs: [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.getAttribute('src')),
        nImgs: document.images.length,
        semAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
        semTamanho: [...document.images].filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).length,
        links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
        ids: [...document.querySelectorAll('[id]')].map((e) => e.id),
        ocultos: [...document.querySelectorAll('.reveal:not(.in)')].length,
        h1: document.querySelectorAll('h1').length,
      };
    });
    if (r.rolagemX > 0) ruim(`rolagem horizontal de ${r.rolagemX}px`);
    if (r.imgs.length) ruim(`imagens não carregadas: ${r.imgs.join(', ')}`);
    if (r.semAlt) ruim(`${r.semAlt} imagens sem alt`);
    if (r.semTamanho) ruim(`${r.semTamanho} imagens sem width/height`);
    if (r.ocultos) ruim(`${r.ocultos} blocos .reveal ficaram invisíveis`);
    if (r.h1 !== 1) ruim(`h1: ${r.h1}`);
    if (erros.length) ruim(`console/rede: ${[...new Set(erros)].join(' | ')}`);
    for (const l of new Set(r.links)) {
      if (l.startsWith('#')) { if (l.length > 1 && !r.ids.includes(l.slice(1))) ruim(`âncora sem destino: ${l}`); }
      else if (!/^(https?:|mailto:)/.test(l)) { const st = (await p.request.get(new URL(l, base).href)).status(); if (st !== 200) ruim(`link ${l} -> ${st}`); }
    }
    console.log(`  imagens: ${r.nImgs} | links: ${new Set(r.links).size} | transferido: ${(bytes / 1024).toFixed(0)} kB | altura: ${total}px`);
    if (SHOTS) {
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForTimeout(500);
      await p.screenshot({ path: path.join(SHOTS, `pagina-${w}.png`), fullPage: true });
    }
    await ctx.close();
  }
  // o botão principal abre o jogo de verdade?
  const p = await b.newPage();
  await p.goto(base);
  await Promise.all([p.waitForURL('**/david-runner/jogar/'), p.click('#ctaHero')]);
  console.log('\nCTA abre ' + p.url().replace(/^http:\/\/[^/]+/, ''));
  await b.close();
  srv.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
  process.exit(falhas ? 1 : 0);
})();
