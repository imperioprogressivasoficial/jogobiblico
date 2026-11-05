import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';

/** Integração com o aparelho quando o jogo roda como app instalado (Android/iOS). */
export const isNative = Capacitor.isNativePlatform();

export function vibrate(ms: number): void {
  if (isNative) {
    void Haptics.impact({ style: ms > 120 ? ImpactStyle.Heavy : ImpactStyle.Medium }).catch(() => {});
    return;
  }
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* sem suporte */
  }
}

export interface NativeHandlers {
  /** Botão "voltar" do Android. Retorna false quando o app deve ir para segundo plano. */
  onBack: () => boolean;
  onBackground: () => void;
}

export async function initNative(h: NativeHandlers): Promise<void> {
  if (!isNative) return;
  document.documentElement.classList.add('native');
  try {
    await StatusBar.hide();
  } catch {
    /* iOS antigo / sem barra */
  }
  try {
    await ScreenOrientation.lock({ orientation: 'portrait' });
  } catch {
    /* tablets podem recusar */
  }
  await App.addListener('backButton', () => {
    if (!h.onBack()) void App.minimizeApp();
  });
  await App.addListener('pause', () => h.onBackground());
}
