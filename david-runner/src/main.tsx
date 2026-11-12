import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import './styles.css';
import './ui/jornada.css';
import './ui/lobby.css';
import './ui/tema-ceu.css';
import { initNative } from './platform/native';
import { UIManager } from './ui/UIManager';
import { registerServiceWorker } from './platform/pwa';

// Sem StrictMode: o motor WebGL deve ser criado uma única vez.
createRoot(document.getElementById('root')!).render(<App />);

void initNative({
  onBack: () => UIManager.handleBack(),
  onBackground: () => {
    const e = UIManager.engine;
    if (e && e.mode === 'playing') e.pause();
  },
});
registerServiceWorker();
