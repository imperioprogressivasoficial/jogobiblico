/**
 * JORNADA BÍBLICA — as histórias da Bíblia, do começo ao fim, em ordem cronológica.
 *
 * Cada pergaminho coletado na corrida revela a PRÓXIMA história desta lista.
 * O jogo não depende de um número fixo de episódios: basta acrescentar itens em STORY.
 *
 * Regras para editar:
 * - `id` é gravado no salvamento do jogador: não mude o id de uma história já publicada.
 * - `number` é a posição na jornada (1, 2, 3...). A ordem da lista é a ordem de desbloqueio.
 * - `mapId` é um dos mapas do jogo (jerusalem, deserto, vale, egito, babilonia).
 * - `scene` são emojis separados por espaço; o primeiro é o destaque da ilustração.
 * - `pages` são as páginas do livro: frases curtas, em linguagem de criança, fiéis ao texto bíblico.
 * - `quiz.answer` é o índice (0, 1 ou 2) da opção correta.
 */

export type StoryEra = 'Criação' | 'Patriarcas' | 'Êxodo' | 'Juízes' | 'Reis' | 'Profetas' | 'Jesus' | 'Igreja';

export interface StoryEpisode {
  id: string;
  number: number;
  title: string;
  reference: string;
  era: StoryEra;
  mapId: string;
  scene: string;
  pages: string[];
  lesson: string;
  verse: string;
  fact: string;
  quiz: { question: string; options: string[]; answer: number };
}

export interface EraInfo {
  id: StoryEra;
  emoji: string;
  /** Cor principal (selos, bordas). */
  color: string;
  /** Fundo das ilustrações e dos cabeçalhos da era. */
  gradient: string;
  /** Resumo curto para a linha do tempo. */
  subtitle: string;
}

/** As eras da história bíblica, na ordem em que aparecem na jornada. */
export const ERAS: EraInfo[] = [
  {
    id: 'Criação',
    emoji: '🌍',
    color: '#2f8a4a',
    gradient: 'linear-gradient(165deg, #c9f3ff 0%, #8fdc9c 52%, #2f8a4a 100%)',
    subtitle: 'O começo de tudo',
  },
  {
    id: 'Patriarcas',
    emoji: '⛺',
    color: '#b8691f',
    gradient: 'linear-gradient(165deg, #ffe9b8 0%, #f0b45c 52%, #a85a1c 100%)',
    subtitle: 'Noé, Abraão, Isaque, Jacó e José',
  },
  {
    id: 'Êxodo',
    emoji: '🌊',
    color: '#1f6fb8',
    gradient: 'linear-gradient(165deg, #fff0c4 0%, #7cc4f0 50%, #1f5fa8 100%)',
    subtitle: 'Moisés e a saída do Egito',
  },
  {
    id: 'Juízes',
    emoji: '🛡️',
    color: '#8a4f2a',
    gradient: 'linear-gradient(165deg, #ffe6c9 0%, #d99a68 52%, #7a3f1f 100%)',
    subtitle: 'Josué, Gideão, Sansão e Rute',
  },
  {
    id: 'Reis',
    emoji: '👑',
    color: '#b8860b',
    gradient: 'linear-gradient(165deg, #fff6c9 0%, #ffd23f 50%, #b07400 100%)',
    subtitle: 'Samuel, Saul, Davi e Salomão',
  },
  {
    id: 'Profetas',
    emoji: '🔥',
    color: '#7a3fb0',
    gradient: 'linear-gradient(165deg, #f3dcff 0%, #b98ae6 50%, #5a2a8a 100%)',
    subtitle: 'Elias, Jonas, Daniel e outros',
  },
  {
    id: 'Jesus',
    emoji: '✝️',
    color: '#c43f2f',
    gradient: 'linear-gradient(165deg, #fff3d6 0%, #ffb37a 50%, #c43f2f 100%)',
    subtitle: 'O nascimento, a vida e a ressurreição de Jesus',
  },
  {
    id: 'Igreja',
    emoji: '🕊️',
    color: '#2a7fa0',
    gradient: 'linear-gradient(165deg, #e6fbff 0%, #8fd6e6 50%, #2a6f9a 100%)',
    subtitle: 'Os apóstolos, a igreja e o Apocalipse',
  },
];

export const STORY: StoryEpisode[] = [
  {
    id: 'criacao',
    number: 1,
    title: 'A Criação do mundo',
    reference: 'Gênesis 1–2',
    era: 'Criação',
    mapId: 'vale',
    scene: '🌍 ☀️ 🌙 ⭐ 🌊 🌳 🐟 🐦 🦁',
    pages: [
      'No começo, não existia nada: nem céu, nem mar, nem bichos. Tudo era escuro e vazio. Mas Deus já existia — e o Espírito de Deus pairava sobre as águas.',
      'No primeiro dia, Deus disse: “Haja luz!” E a luz apareceu! Deus chamou a luz de dia e a escuridão de noite.',
      'No segundo dia, Deus fez o céu lá no alto. No terceiro dia, juntou as águas nos mares e fez aparecer a terra seca, cheia de plantas, flores e árvores com frutas.',
      'No quarto dia, Deus colocou no céu o sol para brilhar de dia, e a lua e as estrelas para brilharem de noite. No quinto dia, encheu o mar de peixes e o céu de passarinhos.',
      'No sexto dia, Deus fez os animais da terra: grandes, pequenos e até as formiguinhas. Depois, fez o homem e a mulher, parecidos com Ele, para cuidarem de tudo com amor.',
      'Deus olhou tudo o que tinha feito e viu que era muito bom! No sétimo dia, Deus descansou e abençoou esse dia como um dia especial.',
    ],
    lesson:
      'Deus criou tudo com amor e sabedoria — inclusive você! Por isso, podemos agradecer a Deus e cuidar bem da natureza, dos animais e das pessoas.',
    verse: '“No princípio, Deus criou os céus e a terra.” — Gênesis 1:1',
    fact: 'A Bíblia conta que Deus fez tudo em seis dias e descansou no sétimo. Por isso o povo de Deus guardava um dia de descanso a cada sete dias (Êxodo 20:11).',
    quiz: {
      question: 'O que Deus criou no primeiro dia?',
      options: ['Os peixes', 'A luz', 'As estrelas'],
      answer: 1,
    },
  },
  {
    id: 'eden',
    number: 2,
    title: 'Adão e Eva no jardim do Éden',
    reference: 'Gênesis 2–3',
    era: 'Criação',
    mapId: 'vale',
    scene: '🌳 👫 🐍 🌿 🦌 🌸 🦋 🌊',
    pages: [
      'Deus formou o primeiro homem do pó da terra e soprou nele o fôlego da vida. O nome dele era Adão. Deus plantou um jardim lindo, chamado Éden, cheio de árvores, frutas e rios.',
      'Adão deu nome a todos os animais. Mas ele não tinha alguém como ele para ser sua companheira. Então Deus fez Adão dormir, tirou uma de suas costelas e dela formou a mulher. Ela se chamou Eva.',
      'Deus disse: “Vocês podem comer de todas as árvores do jardim, menos da árvore do conhecimento do bem e do mal.” Era só uma regra!',
      'Um dia, a serpente, muito esperta, enganou Eva: “Coma! Vocês vão ficar iguais a Deus.” Eva comeu do fruto e deu também a Adão, que comeu. Na mesma hora, sentiram vergonha e se esconderam de Deus.',
      'Deus chamou: “Onde você está?” Por terem desobedecido, Adão e Eva tiveram que sair do jardim. Mas Deus continuou cuidando deles: fez roupas para os dois e prometeu que um dia o mal seria vencido.',
    ],
    lesson:
      'Obedecer a Deus é sempre o melhor caminho. Quando erramos, não precisamos nos esconder: podemos contar a verdade e pedir perdão, porque Deus continua nos amando.',
    verse: '“Se confessarmos os nossos pecados, ele é fiel e justo para nos perdoar.” — 1 João 1:9',
    fact: 'A Bíblia não diz que o fruto proibido era uma maçã! Ela fala só do “fruto da árvore”. A ideia da maçã apareceu muito tempo depois, em pinturas e histórias.',
    quiz: {
      question: 'De qual árvore Adão e Eva não podiam comer?',
      options: ['Da árvore mais alta do jardim', 'Da palmeira perto do rio', 'Da árvore do conhecimento do bem e do mal'],
      answer: 2,
    },
  },
  {
    id: 'caim-abel',
    number: 3,
    title: 'Caim e Abel',
    reference: 'Gênesis 4:1-16',
    era: 'Criação',
    mapId: 'vale',
    scene: '🐑 👦 🌾 🔥 ⛰️ 🌄',
    pages: [
      'Adão e Eva tiveram dois filhos: Caim e Abel. Caim plantava e cuidava da terra. Abel era pastor e cuidava das ovelhas.',
      'Um dia, os dois levaram ofertas a Deus. Caim trouxe frutos da terra. Abel trouxe os primeiros e melhores cordeirinhos do seu rebanho. Deus se agradou de Abel e da sua oferta, mas não da oferta de Caim.',
      'Caim ficou com muita raiva e inveja do irmão. Deus falou com ele: “Por que você está com raiva? Se fizer o bem, será aceito. Cuidado: o pecado quer te dominar, mas você deve vencê-lo.”',
      'Mas Caim não ouviu. Levou Abel para o campo e lá atacou e matou o seu irmão. Deus perguntou: “Onde está Abel, seu irmão?” Caim respondeu: “Não sei. Por acaso sou eu o guarda do meu irmão?”',
      'Deus sabia de tudo. Como castigo, Caim teria que viver longe, andando de um lugar para outro. Mesmo assim, Deus colocou um sinal em Caim para que ninguém o matasse. Deus é justo e também cuida.',
    ],
    lesson:
      'A raiva e a inveja podem nos levar a fazer coisas muito ruins. Quando sentir raiva, converse com Deus e com alguém que você ama. Devemos amar e cuidar dos nossos irmãos!',
    verse: '“Amados, amemos uns aos outros, porque o amor vem de Deus.” — 1 João 4:7',
    fact: 'Abel foi o primeiro pastor de ovelhas da Bíblia. Muitos anos depois, Davi — o herói deste jogo — também cuidaria de ovelhas!',
    quiz: {
      question: 'Qual era o trabalho de Abel?',
      options: ['Pastor de ovelhas', 'Pescador', 'Construtor de barcos'],
      answer: 0,
    },
  },
];
