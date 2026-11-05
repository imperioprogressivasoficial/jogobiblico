import { setAudioModeAsync } from 'expo-audio';

/**
 * No iPhone, o som de uma WebView segue o botão de silêncio do aparelho.
 * Este ajuste coloca o app na categoria "playback": o jogo toca mesmo no modo silencioso,
 * como todo jogo faz. Também evita que o som pause ao bloquear a tela.
 */
export async function configureGameAudio(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    });
  } catch {
    // Expo Go antigo ou plataforma sem suporte: o jogo funciona sem isso.
  }
}
