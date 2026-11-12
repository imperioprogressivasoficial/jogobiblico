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
  { id: 'corrida', screen: 'run', name: 'Corrida Bíblica', tagline: 'Corra, desvie e junte denários e pergaminhos', icon: 'run', colors: ['#ff9f2e', '#ff9f2e'], reference: 'Hebreus 12:1' },
  { id: 'mundo', screen: 'world', name: 'Mundo Aberto', tagline: 'Passeie por Jerusalém e brinque com amigos', icon: 'map', colors: ['#b07cff', '#b07cff'], reference: 'Salmos 24:1' },
  { id: 'quiz', screen: 'mode-quiz', name: 'Show da Fé', tagline: 'Perguntas e respostas sobre a Bíblia', icon: 'quiz', colors: ['#6c7bff', '#6c7bff'], reference: 'Salmos 119:105' },
  { id: 'memoria', screen: 'mode-memory', name: 'Memória da Arca', tagline: 'Ache os pares e encha a arca de Noé', icon: 'memory', colors: ['#3fb548', '#3fb548'], reference: 'Gênesis 7' },
  { id: 'versiculo', screen: 'mode-verse', name: 'Monte o Versículo', tagline: 'Coloque as palavras na ordem certa', icon: 'verse', colors: ['#16a9bb', '#16a9bb'], reference: 'Salmos 119:11' },
  { id: 'gideao', screen: 'mode-gideon', name: 'Exército de Gideão', tagline: 'Escolha o portão com a melhor conta e vença com 300!', icon: 'fire', colors: ['#f07a2a', '#f07a2a'], reference: 'Juízes 7' },
  { id: 'funda', screen: 'mode-sling', name: 'Funda de Davi', tagline: 'Mire, puxe e acerte o alvo!', icon: 'sling', colors: ['#ff5c8a', '#ff5c8a'], reference: '1 Samuel 17' },
];
