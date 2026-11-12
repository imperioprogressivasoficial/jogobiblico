import type { Screen } from '../ui/UIManager';
import type { IconName } from '../ui/art/icons';

/** Os modos de jogo do DAVID RUNNER (a corrida é o principal; os outros são jogos rápidos). */
export interface GameMode {
  id: string;
  screen: Screen | 'run';
  name: string;
  tagline: string;
  icon: IconName;
  /** Cores do cartão (degradê). */
  colors: [string, string];
  reference: string;
}

export const MODES: GameMode[] = [
  { id: 'corrida', screen: 'run', name: 'Corrida Bíblica', tagline: 'Corra, desvie e junte denários e pergaminhos', icon: 'run', colors: ['#ffb02e', '#e8590c'], reference: 'Hebreus 12:1' },
  { id: 'mundo', screen: 'world', name: 'Mundo Aberto', tagline: 'Explore Jerusalém e encontre outros jogadores (beta online)', icon: 'map', colors: ['#14b8a6', '#0b6e8a'], reference: 'Salmos 24:1' },
  { id: 'quiz', screen: 'mode-quiz', name: 'Show da Fé', tagline: 'Perguntas e respostas sobre a Bíblia', icon: 'quiz', colors: ['#6c5ce7', '#3b2fb5'], reference: 'Salmos 119:105' },
  { id: 'memoria', screen: 'mode-memory', name: 'Memória da Arca', tagline: 'Ache os pares e encha a arca de Noé', icon: 'memory', colors: ['#2ecc71', '#16865a'], reference: 'Gênesis 7' },
  { id: 'versiculo', screen: 'mode-verse', name: 'Monte o Versículo', tagline: 'Coloque as palavras na ordem certa', icon: 'verse', colors: ['#00b4d8', '#0868a8'], reference: 'Salmos 119:11' },
  { id: 'gideao', screen: 'mode-gideon', name: 'Exército de Gideão', tagline: 'Escolha o portão com a melhor conta e vença com 300!', icon: 'fire', colors: ['#f59f00', '#7a3e00'], reference: 'Juízes 7' },
  { id: 'funda', screen: 'mode-sling', name: 'Funda de Davi', tagline: 'Mire, puxe e acerte o alvo!', icon: 'sling', colors: ['#ff6b8b', '#c2185b'], reference: '1 Samuel 17' },
];
