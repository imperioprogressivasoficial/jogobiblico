import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// Sem StrictMode: o motor WebGL deve ser criado uma única vez.
createRoot(document.getElementById('root')!).render(<App />);
