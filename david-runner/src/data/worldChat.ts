/**
 * Frases e gestos do Mundo Aberto. NÃO existe chat livre: a criança só escolhe entre estas opções.
 * Mantenha a mesma ordem de world-server/server.js (PHRASES / EMOTES): o servidor recebe só o número.
 */
export const PHRASES = [
  'Oi! Vamos brincar?',
  'Que legal!',
  'Obrigado!',
  'Deus ama você!',
  'Vamos jogar juntos?',
  'Parabéns!',
  'Tchau, até logo!',
  'Estou aprendendo a Bíblia!',
] as const;

export const EMOTES: { id: 'wave' | 'dance' | 'jump' | 'pray'; label: string }[] = [
  { id: 'wave', label: 'Acenar' },
  { id: 'dance', label: 'Dançar' },
  { id: 'jump', label: 'Pular' },
  { id: 'pray', label: 'Orar' },
];
