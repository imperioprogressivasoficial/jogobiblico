export type HairStyle = 'curly' | 'long' | 'short' | 'braids' | 'wavy';
export type BeardStyle = 'none' | 'short' | 'long';
export type Headwear = 'none' | 'headband' | 'hood' | 'turban';
export type Accessory = 'staff' | 'longStaff' | 'dove' | 'scroll' | 'none';

export interface CharacterLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  beard: BeardStyle;
  beardColor?: string;
  tunic: string;
  tunicTrim: string;
  /** Faixas coloridas na túnica (José). */
  stripes?: string[];
  belt: string;
  longSleeves: boolean;
  robeLength: 'short' | 'long';
  bag: boolean;
  bagColor: string;
  headwear: Headwear;
  headwearColor: string;
  accessory: Accessory;
  cape?: string;
  sandal: string;
  /** Escala dos ombros/braços (Sansão é mais forte). */
  bulk: number;
  /** Proporção da cabeça (mais jovem = cabeça maior). */
  headScale: number;
}

export type UnlockCondition =
  | { type: 'free' }
  | { type: 'coins'; amount: number }
  | { type: 'distance'; meters: number }
  | { type: 'scrolls'; count: number }
  | { type: 'relics'; count: number };

export interface SkinDef {
  id: string;
  name: string;
  /** Custo em relíquias (0 = padrão). */
  relicCost: number;
  look: Partial<CharacterLook>;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  description: string;
  reference: string;
  unlock: UnlockCondition;
  look: CharacterLook;
  skins: SkinDef[];
  /** Pequena vantagem de estilo para cada herói. */
  perk: string;
  /** Para a escolha no cadastro (menino / menina). */
  gender: 'm' | 'f';
}

const baseSandal = '#6b3f1f';

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'davi',
    name: 'Davi',
    title: 'O jovem pastor',
    description: 'Filho mais novo de Jessé, pastor de ovelhas em Belém. Corajoso, ágil e cheio de fé.',
    reference: '1 Samuel 16–17',
    unlock: { type: 'free' },
    gender: 'm',
    perk: 'Equilibrado em tudo.',
    look: {
      skin: '#e8b48a',
      hair: '#5a3418',
      hairStyle: 'curly',
      beard: 'none',
      tunic: '#e9dcc0',
      tunicTrim: '#c8b48c',
      belt: '#7a4a26',
      longSleeves: false,
      robeLength: 'short',
      bag: true,
      bagColor: '#8a5530',
      headwear: 'none',
      headwearColor: '#000',
      accessory: 'staff',
      sandal: baseSandal,
      bulk: 1,
      headScale: 1.08,
    },
    skins: [
      { id: 'padrao', name: 'Pastor', relicCost: 0, look: {} },
      { id: 'real', name: 'Manto Real', relicCost: 2, look: { tunic: '#7d3cc0', tunicTrim: '#f2c94c', belt: '#f2c94c', bagColor: '#5b2a8a' } },
      { id: 'harpista', name: 'Harpista', relicCost: 1, look: { tunic: '#4fa3d9', tunicTrim: '#ffffff', belt: '#2d5f8a' } },
    ],
  },
  {
    id: 'moises',
    name: 'Moisés',
    title: 'O libertador',
    description: 'Conduziu o povo de Israel para fora do Egito e recebeu as tábuas da Lei no monte Sinai.',
    reference: 'Êxodo 3–20',
    unlock: { type: 'coins', amount: 2500 },
    perk: 'Seu cajado é inconfundível.',
    gender: 'm',
    look: {
      skin: '#d9a47c',
      hair: '#efeae0',
      hairStyle: 'long',
      beard: 'long',
      beardColor: '#f4f0e6',
      tunic: '#a4462e',
      tunicTrim: '#f0e2c2',
      belt: '#5a3a20',
      longSleeves: true,
      robeLength: 'long',
      bag: false,
      bagColor: '#000',
      headwear: 'none',
      headwearColor: '#000',
      accessory: 'longStaff',
      sandal: baseSandal,
      bulk: 1,
      headScale: 1,
    },
    skins: [
      { id: 'padrao', name: 'Peregrino', relicCost: 0, look: {} },
      { id: 'sinai', name: 'Monte Sinai', relicCost: 2, look: { tunic: '#e6e1d3', tunicTrim: '#3b6fb6', belt: '#3b6fb6' } },
    ],
  },
  {
    id: 'noe',
    name: 'Noé',
    title: 'O construtor da arca',
    description: 'Homem justo que construiu a arca e preservou sua família e os animais durante o dilúvio.',
    reference: 'Gênesis 6–9',
    unlock: { type: 'distance', meters: 3000 },
    perk: 'Sempre acompanhado da pomba.',
    gender: 'm',
    look: {
      skin: '#e0ad84',
      hair: '#b9b4ad',
      hairStyle: 'short',
      beard: 'long',
      beardColor: '#cfcac2',
      tunic: '#3f7d6e',
      tunicTrim: '#d8c79a',
      belt: '#6e4a2a',
      longSleeves: true,
      robeLength: 'long',
      bag: false,
      bagColor: '#000',
      headwear: 'hood',
      headwearColor: '#8a6a45',
      accessory: 'dove',
      sandal: baseSandal,
      bulk: 1.02,
      headScale: 1,
    },
    skins: [
      { id: 'padrao', name: 'Carpinteiro', relicCost: 0, look: {} },
      { id: 'arcoiris', name: 'Arco-íris', relicCost: 2, look: { tunic: '#3a69c4', tunicTrim: '#f7d046', headwearColor: '#e2574c' } },
    ],
  },
  {
    id: 'jose',
    name: 'José',
    title: 'O sonhador',
    description: 'Recebeu de Jacó uma túnica especial. Interpretou os sonhos do faraó e governou o Egito.',
    reference: 'Gênesis 37–41',
    unlock: { type: 'coins', amount: 6000 },
    perk: 'A túnica mais colorida da história.',
    gender: 'm',
    look: {
      skin: '#e4b08a',
      hair: '#2b1a10',
      hairStyle: 'wavy',
      beard: 'none',
      tunic: '#d94f3d',
      tunicTrim: '#f6d24a',
      stripes: ['#d94f3d', '#f6a33a', '#f6d24a', '#5fb85a', '#3f8fd6', '#8a5ac9'],
      belt: '#6b3f1f',
      longSleeves: true,
      robeLength: 'long',
      bag: false,
      bagColor: '#000',
      headwear: 'none',
      headwearColor: '#000',
      accessory: 'none',
      sandal: baseSandal,
      bulk: 1,
      headScale: 1.04,
    },
    skins: [
      { id: 'padrao', name: 'Túnica Especial', relicCost: 0, look: {} },
      { id: 'governador', name: 'Governador do Egito', relicCost: 3, look: { stripes: undefined, tunic: '#f4f1e8', tunicTrim: '#e0b23a', belt: '#e0b23a', headwear: 'headband', headwearColor: '#e0b23a' } },
    ],
  },
  {
    id: 'daniel',
    name: 'Daniel',
    title: 'O fiel na Babilônia',
    description: 'Serviu na corte da Babilônia sem abandonar sua fé e saiu ileso da cova dos leões.',
    reference: 'Daniel 1–6',
    unlock: { type: 'scrolls', count: 8 },
    perk: 'Sábio e destemido.',
    gender: 'm',
    look: {
      skin: '#d39e76',
      hair: '#1f140c',
      hairStyle: 'short',
      beard: 'short',
      beardColor: '#1f140c',
      tunic: '#5b3a8c',
      tunicTrim: '#e8bf4a',
      belt: '#e8bf4a',
      longSleeves: true,
      robeLength: 'long',
      bag: false,
      bagColor: '#000',
      headwear: 'turban',
      headwearColor: '#e9dfc9',
      accessory: 'scroll',
      sandal: baseSandal,
      bulk: 1,
      headScale: 1.02,
    },
    skins: [
      { id: 'padrao', name: 'Conselheiro', relicCost: 0, look: {} },
      { id: 'leao', name: 'Juba de Leão', relicCost: 2, look: { tunic: '#c98a2e', tunicTrim: '#7a4a1a', belt: '#7a4a1a', headwearColor: '#c98a2e' } },
    ],
  },
  {
    id: 'sansao',
    name: 'Sansão',
    title: 'O mais forte',
    description: 'Nazireu de força extraordinária, cujos cabelos nunca haviam sido cortados.',
    reference: 'Juízes 13–16',
    unlock: { type: 'relics', count: 3 },
    perk: 'Braços de aço e sete tranças.',
    gender: 'm',
    look: {
      skin: '#c98d62',
      hair: '#2a170b',
      hairStyle: 'braids',
      beard: 'short',
      beardColor: '#2a170b',
      tunic: '#8a5a2b',
      tunicTrim: '#5a3a1a',
      belt: '#3b2410',
      longSleeves: false,
      robeLength: 'short',
      bag: false,
      bagColor: '#000',
      headwear: 'none',
      headwearColor: '#000',
      accessory: 'none',
      sandal: '#4a2a12',
      bulk: 1.28,
      headScale: 1,
    },
    skins: [
      { id: 'padrao', name: 'Nazireu', relicCost: 0, look: {} },
      { id: 'juiz', name: 'Juiz de Israel', relicCost: 3, look: { tunic: '#b7342b', tunicTrim: '#f0c24a', belt: '#f0c24a' } },
    ],
  },
  {
    id: 'ester',
    name: 'Ester',
    title: 'A rainha corajosa',
    description: 'Uma jovem judia que se tornou rainha da Pérsia e arriscou a vida para salvar o seu povo.',
    reference: 'Ester 4–7',
    unlock: { type: 'coins', amount: 2500 },
    perk: 'Coragem: as moedas da corrida brilham mais perto.',
    gender: 'f',
    look: {
      skin: '#e6b58c',
      hair: '#2e1a0e',
      hairStyle: 'long',
      beard: 'none',
      tunic: '#8a3fc9',
      tunicTrim: '#f2c94c',
      belt: '#f2c94c',
      longSleeves: true,
      robeLength: 'long',
      bag: false,
      bagColor: '#000',
      headwear: 'headband',
      headwearColor: '#f2c94c',
      accessory: 'none',
      cape: '#d94a8c',
      sandal: baseSandal,
      bulk: 0.9,
      headScale: 1.08,
    },
    skins: [
      { id: 'padrao', name: 'Rainha', relicCost: 0, look: {} },
      { id: 'festa', name: 'Festa de Purim', relicCost: 2, look: { tunic: '#2fa3d9', tunicTrim: '#ffffff', cape: '#ffd23f', belt: '#ffffff' } },
      { id: 'jardim', name: 'Jardim do Palácio', relicCost: 1, look: { tunic: '#4cbf7a', tunicTrim: '#f6efe0', cape: '#f6efe0' } },
    ],
  },
  {
    id: 'rute',
    name: 'Rute',
    title: 'A amiga fiel',
    description: 'Deixou a sua terra para cuidar de Noemi e colheu espigas no campo de Boaz.',
    reference: 'Rute 1–4',
    unlock: { type: 'coins', amount: 2500 },
    perk: 'Fidelidade: começa a corrida com um escudo.',
    gender: 'f',
    look: {
      skin: '#d9a070',
      hair: '#6b3a1c',
      hairStyle: 'wavy',
      beard: 'none',
      tunic: '#7fae4a',
      tunicTrim: '#f6efe0',
      belt: '#a8703f',
      longSleeves: true,
      robeLength: 'long',
      bag: true,
      bagColor: '#c8a060',
      headwear: 'hood',
      headwearColor: '#f6efe0',
      accessory: 'none',
      sandal: baseSandal,
      bulk: 0.9,
      headScale: 1.08,
    },
    skins: [
      { id: 'padrao', name: 'Colhedora', relicCost: 0, look: {} },
      { id: 'moabita', name: 'Vestido de Moabe', relicCost: 2, look: { tunic: '#d9473a', tunicTrim: '#ffd23f', headwearColor: '#ffd23f' } },
      { id: 'noiva', name: 'Casamento', relicCost: 3, look: { tunic: '#ffffff', tunicTrim: '#f2c94c', headwearColor: '#ffffff', belt: '#f2c94c' } },
    ],
  },
  {
    id: 'miria',
    name: 'Miriã',
    title: 'A irmã cantora',
    description: 'Irmã de Moisés: cuidou dele no rio Nilo e liderou o povo cantando após a travessia do mar.',
    reference: 'Êxodo 2; 15:20-21',
    unlock: { type: 'coins', amount: 2500 },
    perk: 'Cântico: a música dobra os pontos por mais tempo.',
    gender: 'f',
    look: {
      skin: '#c98a5e',
      hair: '#1f1208',
      hairStyle: 'braids',
      beard: 'none',
      tunic: '#2f8fe0',
      tunicTrim: '#ffd23f',
      belt: '#d9473a',
      longSleeves: false,
      robeLength: 'long',
      bag: false,
      bagColor: '#000',
      headwear: 'headband',
      headwearColor: '#d9473a',
      accessory: 'none',
      sandal: baseSandal,
      bulk: 0.9,
      headScale: 1.08,
    },
    skins: [
      { id: 'padrao', name: 'Cantora', relicCost: 0, look: {} },
      { id: 'nilo', name: 'Margem do Nilo', relicCost: 1, look: { tunic: '#f3e2b5', tunicTrim: '#2f8fe0', belt: '#2f8fe0' } },
      { id: 'festa', name: 'Dança da Vitória', relicCost: 2, look: { tunic: '#ff7eb3', tunicTrim: '#ffffff', headwearColor: '#ffd23f' } },
    ],
  },
];

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

export function resolveLook(charId: string, skinId: string): CharacterLook {
  const c = getCharacter(charId);
  const skin = c.skins.find((s) => s.id === skinId) ?? c.skins[0];
  return { ...c.look, ...skin.look };
}
