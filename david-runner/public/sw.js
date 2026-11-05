// Service worker: guarda o jogo no aparelho para abrir rápido e funcionar sem internet.
const CACHE = 'david-runner-v3';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

// Na instalação, guarda também os arquivos que o index.html referencia (JS, CSS e, via CSS, as fontes).
async function precache() {
  const c = await caches.open(CACHE);
  await c.addAll(CORE);
  const html = await (await fetch('./index.html', { cache: 'no-cache' })).text();
  const assets = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => m[1]);
  await c.addAll(assets);
  for (const css of assets.filter((a) => a.endsWith('.css'))) {
    const text = await (await c.match(css)).text();
    const base = new URL(css, self.location.href);
    const fonts = [...text.matchAll(/url\(([^)]+\.woff2)\)/g)].map((m) => new URL(m[1].replace(/["']/g, ''), base).href);
    await c.addAll(fonts);
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // páginas: rede primeiro (pega atualizações), cache se estiver offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreVary: true })),
    );
    return;
  }
  // arquivos do jogo (nomes com hash) e fontes: cache primeiro
  if (url.origin === self.location.origin || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com')) {
    e.respondWith(
      caches.match(req, { ignoreVary: true, ignoreSearch: true }).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok || res.type === 'opaque') {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
