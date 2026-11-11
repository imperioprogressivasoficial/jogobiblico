#!/usr/bin/env node
/*
 * Gera landing/img/og.jpg (1200x630), a imagem que aparece quando o link é compartilhado.
 * Usa as telas reais (img/lobby.webp e img/corrida.webp) e as fontes da página.
 *   node landing/tools/og.cjs ["Nome do app"]
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const L = path.resolve(__dirname, '..');
const u = (f) => pathToFileURL(path.join(L, f)).href;
const NOME = process.argv[2] || 'Jogo Bíblico';

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Fraunces;src:url(${u('fonts/fraunces.woff2')});font-weight:100 900}
@font-face{font-family:Nunito;src:url(${u('fonts/nunito.woff2')});font-weight:200 1000}
@font-face{font-family:Lilita;src:url(${u('fonts/lilita.woff2')})}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#FBF7EF;font-family:Nunito;color:#1D2340;position:relative}
.sun{position:absolute;right:-90px;top:-120px;width:820px;height:820px;border-radius:46% 54% 52% 48%/50% 46% 54% 50%;background:radial-gradient(circle at 50% 40%,#FBE9BE 0,#F8DCC2 62%,#F3D3C4 100%)}
.dune{position:absolute;left:0;right:0;bottom:0;height:120px}
.txt{position:absolute;left:72px;top:64px;width:600px}
.brand{display:flex;align-items:center;gap:14px;font:400 34px Lilita}
.brand img{width:56px;height:56px;border-radius:15px}
h1{margin-top:44px;font:600 58px/1.06 Fraunces;font-variation-settings:'SOFT' 100;letter-spacing:-.025em}
h1 span{color:#BF4A2A;white-space:nowrap}
p{margin-top:24px;font:700 26px/1.35 Nunito;color:#444B69;max-width:480px}
.pill{display:inline-block;margin-top:30px;padding:12px 24px;border-radius:99px;background:#1D2340;color:#fff;font:800 22px Nunito}
.ph{position:absolute;padding:11px;border-radius:56px;background:linear-gradient(145deg,#3A3F5C,#14172B 38%,#0B0D1C);box-shadow:0 50px 70px -30px rgba(29,35,64,.55)}
.ph img{display:block;width:100%;border-radius:46px}
.a{right:56px;top:64px;width:300px;transform:rotate(4deg)}
.b{right:316px;top:150px;width:236px;transform:rotate(-8deg)}
</style>
<div class="sun"></div>
<svg class="dune" viewBox="0 0 1200 120" preserveAspectRatio="none"><path fill="#F5EDDD" d="M0 70c150-46 275-58 433-30 142 25 250 62 392 52s250-58 375-62v90H0z"/></svg>
<div class="ph b"><img src="${u('img/corrida.webp')}"></div>
<div class="ph a"><img src="${u('img/lobby.webp')}"></div>
<div class="txt">
  <div class="brand"><img src="${u('img/icon-192.png')}">${NOME}</div>
  <h1>Seu filho joga.<br>E <span>aprende a Bíblia.</span></h1>
  <p>68 histórias bíblicas em ordem, para crianças de 4 a 12 anos.</p>
  <span class="pill">Sem anúncios · Compras só com PIN</span>
</div>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'og-')), 'og.html'); // file:// para poder ler as fontes e imagens locais
  fs.writeFileSync(tmp, html);
  await p.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(L, 'img', 'og.jpg'), type: 'jpeg', quality: 86 });
  await b.close();
  console.log('ok  img/og.jpg');
})();
