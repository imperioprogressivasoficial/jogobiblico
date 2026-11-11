#!/usr/bin/env node
/*
 * Captura as telas REAIS do app para a página de vendas (landing/img/*.webp).
 *
 * Como usar (na raiz do repositório):
 *   cd david-runner && npx vite build && npx vite preview --port 4303 &
 *   node landing/tools/capturar.cjs                      # todas as telas
 *   node landing/tools/capturar.cjs lobby pais            # só algumas
 *   URL=http://localhost:4303/ PNG=/tmp/telas node landing/tools/capturar.cjs
 *
 * Precisa de: playwright (Chromium) e ImageMagick (`convert`) com suporte a WebP.
 * As telas saem em 390x844 @2x e são reduzidas para 600 px de largura (WebP q80).
 * Depois de rodar, confira os tamanhos em landing/img e a página nas 4 larguras.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const URL_JOGO = process.env.URL || 'http://localhost:4303/';
const SAIDA = path.resolve(__dirname, '..', 'img');
const PNG = process.env.PNG || fs.mkdtempSync(path.join(os.tmpdir(), 'telas-'));
const LARGURA = 600; // px do .webp final (o mockup mostra no máximo ~300 px CSS)
const QUALIDADE = 80;
const SO = process.argv.slice(2);

// Perfil de demonstração: pula o cadastro e deixa o jogo com algum progresso.
const SAVE = {
  coins: 1200,
  relics: 4,
  profile: { childName: 'Lucas', age: 7, gender: 'm', avatar: 'davi', parentEmail: 'x@y.com', pin: '1234', consent: true, createdAt: '' },
  tutorialDone: true,
  settings: { showHints: false },
};

const espera = (p, ms) => p.waitForTimeout(ms);
const dr = (p, fn, arg) => p.evaluate(fn, arg);
const menu = async (p) => {
  await dr(p, () => { const d = window.__davidRunner; d.ui.home(); d.ui.showMenuScene(); });
  await p.waitForSelector('[data-testid=main-menu]');
  await espera(p, 900);
};

// Telas 2D: baixa a qualidade do 3D que fica atrás (no Chromium sem GPU a captura trava sem isso).
const leve = (p) => dr(p, () => { const e = window.__davidRunner.engine; e.autoQuality = false; e.setQuality('baixa'); });

/** Cada tela: nome do arquivo + como chegar nela. Ordem não importa: cada uma volta ao menu antes. */
const TELAS = {
  // Lobby: herói no cenário, Jornada do Dia e botão JOGAR.
  lobby: async (p) => { await espera(p, 1500); },

  // Folha da Jornada do Dia (história, desafio, corrida e baú).
  jornada: async (p) => {
    await p.click('[data-testid=daily-card]', { force: true });
    await p.waitForSelector('[data-testid=daily-sheet]');
    await espera(p, 700);
  },

  // Corrida Bíblica em andamento.
  corrida: async (p) => {
    await dr(p, () => { const d = window.__davidRunner; d.ui.startRun(); d.engine.autopilot = true; d.engine.simulate(9); });
    await p.waitForSelector('[data-testid=game-screen]');
    await espera(p, 1200);
  },

  // "Viver a história": corrida com a narração da história do dia.
  historia: async (p) => {
    await dr(p, () => { const d = window.__davidRunner; d.ui.startStoryRun(d.progression.dailyStory()); });
    await p.waitForSelector('[data-testid=story-caption]');
    await dr(p, () => { const e = window.__davidRunner.engine; e.autopilot = true; e.simulate(5); });
    await espera(p, 900);
  },

  // Lista de modos de jogo.
  modos: async (p) => {
    await leve(p);
    await dr(p, () => window.__davidRunner.ui.go('modes'));
    await p.waitForSelector('[data-testid=modes-screen]');
    await espera(p, 600);
  },

  // Show da Fé (quiz): a pergunta inteira, antes de responder (o cartão entra com animação).
  quiz: async (p) => {
    await leve(p);
    await dr(p, () => window.__davidRunner.ui.go('mode-quiz'));
    await p.waitForSelector('[data-testid=mq-question]');
    await espera(p, 2500);
  },

  // Memória da Arca com alguns pares virados.
  memoria: async (p) => {
    await leve(p);
    await dr(p, () => window.__davidRunner.ui.go('mode-memory'));
    await p.waitForSelector('.mm-card');
    await espera(p, 600);
    await dr(p, () => document.querySelectorAll('.mm-card').forEach((c, i) => i < 6 && c.classList.add('up')));
    await espera(p, 3000);
  },

  // Monte o Versículo com as primeiras palavras no lugar.
  versiculo: async (p) => {
    await leve(p);
    await dr(p, () => window.__davidRunner.ui.go('mode-verse'));
    await p.waitForSelector('[data-testid=mv-scroll]');
    await espera(p, 500);
    for (let i = 0; i < 3; i++) {
      const ok = await p.$(`[data-testid=mv-piece-${i}]`);
      if (ok) await ok.click({ force: true }).catch(() => {});
      await espera(p, 250);
    }
    await espera(p, 400);
  },

  // Funda de Davi.
  funda: async (p) => {
    await leve(p);
    await dr(p, () => window.__davidRunner.ui.go('mode-sling'));
    await p.waitForSelector('[data-testid=ms-canvas]');
    await espera(p, 1500);
  },

  // Jornada das 68 histórias (trilha).
  trilha: async (p) => {
    await leve(p);
    await dr(p, () => window.__davidRunner.ui.go('journey'));
    await p.waitForSelector('[data-testid=journey-screen]');
    await espera(p, 800);
  },

  // Loja (trajes, poderes).
  loja: async (p) => {
    await leve(p);
    await dr(p, () => window.__davidRunner.ui.go('shop'));
    await p.waitForSelector('[data-testid=shop-screen]');
    await espera(p, 800);
  },

  // Painel dos Pais (atrás do PIN), já com a história do dia lida.
  pais: async (p) => {
    await leve(p);
    await dr(p, () => { const d = window.__davidRunner; d.progression.markStoryRead(d.progression.dailyStory().id); d.ui.go('parents'); });
    await p.waitForSelector('[data-testid=parent-gate]');
    for (const k of '1234') await p.click(`[data-testid=pg-key-${k}]`);
    await p.waitForSelector('[data-testid=pp-question]');
    await espera(p, 600);
  },

  // Mundo Aberto (beta). Sem servidor no ar a tela mostra o modo offline: confira antes de usar.
  mundo: async (p) => {
    await dr(p, () => window.__davidRunner.ui.go('world'));
    await p.waitForSelector('[data-testid=world-screen]');
    await espera(p, 3500);
  },
};

/**
 * Retratos dos 9 heróis (heroi-<id>.webp, 256 px, fundo transparente).
 * O próprio jogo desenha cada retrato a partir do modelo 3D; aqui só pedimos um de cada e salvamos.
 */
const HEROIS = ['davi', 'moises', 'noe', 'jose', 'daniel', 'sansao', 'ester', 'rute', 'miria'];
async function retratos(p) {
  await leve(p);
  // A aba "Heróis" da Loja mostra um retrato por herói (aria-label = nome).
  await dr(p, () => { const u = window.__davidRunner.ui; u.shopTab = 'herois'; u.go('shop'); });
  await p.waitForSelector('[data-testid=shop-screen]');
  const aba = await p.$('[data-testid=tab-herois]');
  if (aba) await aba.evaluate((e) => e.click());
  await p.waitForFunction((n) => document.querySelectorAll('.shop-avatar img[src^="data:image"]').length >= n, HEROIS.length, { timeout: 120000 });
  const achados = await dr(p, () => [...document.querySelectorAll('.shop-avatar')].map((e) => ({ nome: e.getAttribute('aria-label'), src: (e.querySelector('img') || {}).src || '' })).filter((x) => x.src.startsWith('data:image')));
  const norm = (t) => t.normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase();
  let n = 0;
  for (const id of HEROIS) {
    const a = achados.find((x) => norm(x.nome || '') === id);
    if (!a) { console.error(`  retrato de ${id} não encontrado na tela`); continue; }
    const png = path.join(PNG, `heroi-${id}.png`);
    fs.writeFileSync(png, Buffer.from(a.src.split(',')[1], 'base64'));
    execFileSync('convert', [png, '-quality', '88', '-define', 'webp:method=6', path.join(SAIDA, `heroi-${id}.webp`)]);
    n++;
  }
  console.log(`ok  ${n}/${HEROIS.length} retratos`);
  if (n < HEROIS.length) throw new Error('faltaram retratos');
}

(async () => {
  fs.mkdirSync(PNG, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const nomes = [...Object.keys(TELAS), 'retratos'].filter((n) => !SO.length || SO.includes(n));
  const falhas = [];
  for (const nome of nomes) {
    // Um contexto novo por tela: nenhuma depende do estado deixado pela anterior.
    const ctx = await b.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'pt-BR',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const p = await ctx.newPage();
    try {
      await p.addInitScript((s) => localStorage.setItem('davidrunner.save.v1', JSON.stringify(s)), SAVE);
      await p.goto(URL_JOGO);
      await p.waitForSelector('[data-testid=tap-to-start]', { timeout: 60000 });
      await p.click('[data-testid=splash]');
      await p.waitForSelector('[data-testid=main-menu]');
      await espera(p, 1500);
      if (nome === 'retratos') { await retratos(p); await ctx.close(); continue; }
      await TELAS[nome](p);
      const png = path.join(PNG, `${nome}.png`);
      await p.screenshot({ path: png, timeout: 120000 });
      execFileSync('convert', [png, '-filter', 'Lanczos', '-resize', `${LARGURA}x`, '-quality', String(QUALIDADE), '-define', 'webp:method=6', path.join(SAIDA, `${nome}.webp`)]);
      const kb = Math.round(fs.statSync(path.join(SAIDA, `${nome}.webp`)).size / 1024);
      console.log(`ok  ${nome}.webp  ${kb} kB`);
    } catch (e) {
      falhas.push(nome);
      console.error(`FALHOU ${nome}: ${String(e.message).split('\n')[0]}`);
    }
    await ctx.close();
  }
  await b.close();
  console.log(`PNGs originais em ${PNG}`);
  if (falhas.length) { console.error(`Telas com falha: ${falhas.join(', ')}`); process.exit(1); }
})();
