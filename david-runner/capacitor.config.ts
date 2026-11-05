import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.imperioprogressivas.davidrunner',
  appName: 'David Runner',
  webDir: 'dist',
  backgroundColor: '#3d9be9',
  android: {
    // o jogo usa toque contínuo: sem zoom nem rolagem
    allowMixedContent: false,
    captureInput: true,
  },
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
  },
};

export default config;
