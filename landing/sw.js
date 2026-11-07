// Service worker "aposentado": o jogo agora mora em /jogar/. Este arquivo existe só para que
// aparelhos que instalaram a versão antiga (neste endereço) se limpem e passem a abrir a página nova.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).then(() => self.registration.unregister()).then(() => self.clients.matchAll({ type: 'window' })).then((cs) => cs.forEach((c) => c.navigate(c.url))),
  );
});
