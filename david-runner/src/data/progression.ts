/** Conquistas, missões diárias e melhorias da loja. */
import { STORY } from './story';

export type StatKey =
  | 'totalRuns'
  | 'totalDistance'
  | 'totalCoins'
  | 'totalJumps'
  | 'totalSlides'
  | 'totalScrolls'
  | 'totalRelics'
  | 'totalPowerups'
  | 'bestDistance'
  | 'bestScore'
  | 'bestCoinsRun'
  | 'charactersOwned'
  | 'mapsUnlocked'
  | 'missionSets'
  | 'totalBoosts'
  | 'storiesUnlocked'
  | 'storiesRead'
  | 'quizzesDone';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  stat: StatKey;
  goal: number;
  reward: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'a_primeira', name: 'Primeiros Passos', description: 'Complete sua primeira corrida.', icon: '👣', stat: 'totalRuns', goal: 1, reward: 50 },
  { id: 'a_10corridas', name: 'Corredor Fiel', description: 'Complete 10 corridas.', icon: '🏃', stat: 'totalRuns', goal: 10, reward: 200 },
  { id: 'a_50corridas', name: 'Perseverança', description: 'Complete 50 corridas.', icon: '🔥', stat: 'totalRuns', goal: 50, reward: 800 },
  { id: 'a_500m', name: 'Pés Ligeiros', description: 'Alcance 500 m em uma corrida.', icon: '🥉', stat: 'bestDistance', goal: 500, reward: 100 },
  { id: 'a_1500m', name: 'Fôlego de Pastor', description: 'Alcance 1.500 m em uma corrida.', icon: '🥈', stat: 'bestDistance', goal: 1500, reward: 300 },
  { id: 'a_4000m', name: 'Maratonista da Fé', description: 'Alcance 4.000 m em uma corrida.', icon: '🥇', stat: 'bestDistance', goal: 4000, reward: 1000 },
  { id: 'a_100moedas', name: 'Bolsa Cheia', description: 'Colete 100 denários em uma corrida.', icon: '👛', stat: 'bestCoinsRun', goal: 100, reward: 150 },
  { id: 'a_400moedas', name: 'Tesouro do Rei', description: 'Colete 400 denários em uma corrida.', icon: '👑', stat: 'bestCoinsRun', goal: 400, reward: 600 },
  { id: 'a_5000total', name: 'Mercador de Jerusalém', description: 'Acumule 5.000 denários coletadas.', icon: '💰', stat: 'totalCoins', goal: 5000, reward: 500 },
  { id: 'a_pontos', name: 'Pontuação de Gigante', description: 'Faça 25.000 pontos em uma corrida.', icon: '⭐', stat: 'bestScore', goal: 25000, reward: 500 },
  { id: 'a_pergaminho', name: 'Estudioso', description: 'Encontre seu primeiro pergaminho.', icon: '📜', stat: 'totalScrolls', goal: 1, reward: 100 },
  {
    id: 'a_biblioteca',
    name: 'Biblioteca Sagrada',
    description: `Revele todas as ${STORY.length} histórias da Jornada Bíblica.`,
    icon: '📚',
    stat: 'storiesUnlocked',
    goal: STORY.length,
    reward: 1500,
  },
  { id: 'a_leitor', name: 'Pequeno Leitor', description: 'Leia sua primeira história da Jornada Bíblica.', icon: '📖', stat: 'storiesRead', goal: 1, reward: 100 },
  {
    id: 'a_sabio',
    name: 'Sábio como Salomão',
    description: `Acerte o quiz de ${Math.min(10, STORY.length)} histórias.`,
    icon: '🦉',
    stat: 'quizzesDone',
    goal: Math.min(10, STORY.length),
    reward: 400,
  },
  { id: 'a_carruagem', name: 'Carro de Fogo', description: 'Chame a Carruagem de Fogo pela primeira vez.', icon: '🔥', stat: 'totalBoosts', goal: 1, reward: 100 },
  { id: 'a_reliquia', name: 'Achado Raro', description: 'Encontre um talento.', icon: '💎', stat: 'totalRelics', goal: 1, reward: 200 },
  { id: 'a_pulos', name: 'Saltador', description: 'Pule 300 vezes.', icon: '🦘', stat: 'totalJumps', goal: 300, reward: 250 },
  { id: 'a_deslizes', name: 'Escorregadio', description: 'Deslize 200 vezes.', icon: '🛷', stat: 'totalSlides', goal: 200, reward: 250 },
  { id: 'a_poderes', name: 'Bênçãos em Dobro', description: 'Pegue 25 power-ups.', icon: '✨', stat: 'totalPowerups', goal: 25, reward: 300 },
  { id: 'a_heroi', name: 'Novo Herói', description: 'Desbloqueie um segundo personagem.', icon: '🧔', stat: 'charactersOwned', goal: 2, reward: 300 },
  { id: 'a_explorador', name: 'Explorador', description: 'Desbloqueie 3 mapas.', icon: '🗺️', stat: 'mapsUnlocked', goal: 3, reward: 500 },
  { id: 'a_missoes', name: 'Disciplina Diária', description: 'Complete 3 conjuntos de missões diárias.', icon: '📅', stat: 'missionSets', goal: 3, reward: 600 },
];

export type MissionMetric =
  | 'coinsRun'
  | 'coinsTotal'
  | 'distanceRun'
  | 'distanceTotal'
  | 'jumpsTotal'
  | 'slidesTotal'
  | 'runsTotal'
  | 'scoreRun'
  | 'scrollsTotal'
  | 'powerupsTotal'
  | 'laneTotal';

export interface MissionTemplate {
  id: string;
  metric: MissionMetric;
  /** Valor base; cresce com o nível do multiplicador. */
  base: number;
  step: number;
  text: (n: number) => string;
  reward: number;
}

const fmt = (n: number) => n.toLocaleString('pt-BR');

export const MISSION_POOL: MissionTemplate[] = [
  { id: 'm_coins_run', metric: 'coinsRun', base: 60, step: 25, text: (n) => `Colete ${fmt(n)} denários em uma corrida`, reward: 150 },
  { id: 'm_coins_total', metric: 'coinsTotal', base: 250, step: 100, text: (n) => `Colete ${fmt(n)} denários no total`, reward: 200 },
  { id: 'm_dist_run', metric: 'distanceRun', base: 600, step: 250, text: (n) => `Corra ${fmt(n)} m em uma corrida`, reward: 200 },
  { id: 'm_dist_total', metric: 'distanceTotal', base: 2000, step: 800, text: (n) => `Corra ${fmt(n)} m no total`, reward: 200 },
  { id: 'm_jumps', metric: 'jumpsTotal', base: 25, step: 10, text: (n) => `Pule ${fmt(n)} vezes`, reward: 120 },
  { id: 'm_slides', metric: 'slidesTotal', base: 20, step: 8, text: (n) => `Deslize ${fmt(n)} vezes`, reward: 120 },
  { id: 'm_runs', metric: 'runsTotal', base: 3, step: 1, text: (n) => `Jogue ${fmt(n)} partidas`, reward: 100 },
  { id: 'm_score', metric: 'scoreRun', base: 4000, step: 2500, text: (n) => `Faça ${fmt(n)} pontos em uma corrida`, reward: 220 },
  { id: 'm_scrolls', metric: 'scrollsTotal', base: 1, step: 1, text: (n) => `Encontre ${fmt(n)} pergaminho${n > 1 ? 's' : ''}`, reward: 220 },
  { id: 'm_power', metric: 'powerupsTotal', base: 2, step: 1, text: (n) => `Pegue ${fmt(n)} power-ups`, reward: 150 },
  { id: 'm_lane', metric: 'laneTotal', base: 60, step: 25, text: (n) => `Troque de pista ${fmt(n)} vezes`, reward: 100 },
];

export const MAX_MULTIPLIER = 30;

export interface UpgradeDef {
  id: 'magnet' | 'double' | 'shield';
  name: string;
  description: string;
  icon: string;
  baseDuration: number;
  perLevel: number;
  costs: number[];
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'magnet', name: 'Ímã de Denários', description: 'Atrai os denários das três pistas.', icon: '🧲', baseDuration: 10, perLevel: 2.5, costs: [400, 900, 1800, 3500, 6000] },
  { id: 'double', name: 'Harpa Dourada', description: 'Pontuação em dobro enquanto ativa.', icon: '🎵', baseDuration: 10, perLevel: 2.5, costs: [500, 1100, 2200, 4000, 7000] },
  { id: 'shield', name: 'Escudo da Fé', description: 'Protege de uma colisão.', icon: '🛡️', baseDuration: 12, perLevel: 3, costs: [500, 1100, 2200, 4000, 7000] },
];

export const REVIVE_COST = [300, 750];
