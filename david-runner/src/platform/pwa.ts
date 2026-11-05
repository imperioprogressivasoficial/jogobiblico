import { isNative } from './native';

/** Registra o service worker (instalação pela tela inicial e uso offline) só na versão web publicada. */
export function registerServiceWorker(): void {
  if (isNative || import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* sem suporte: o jogo funciona normalmente */
    });
  });
}
