/**
 * MOEDAS DO JOGO — com nomes do dinheiro do tempo da Bíblia.
 *
 * - Denário (moeda comum, ganha correndo e jogando): a moeda romana de prata do tempo de Jesus.
 *   Era o pagamento de um dia inteiro de trabalho (Mateus 20:2) e tinha a imagem de César (Mateus 22:19-21).
 * - Talento (moeda rara, para roupas e heróis especiais): a maior medida de dinheiro da Bíblia,
 *   cerca de 6.000 denários. É a moeda da Parábola dos Talentos (Mateus 25:14-30).
 *
 * Os campos internos do salvamento continuam `coins` (denários) e `relics` (talentos).
 */
export const CURRENCY = {
  coin: { one: 'denário', many: 'denários', One: 'Denário', Many: 'Denários', icon: '🪙' },
  premium: { one: 'talento', many: 'talentos', One: 'Talento', Many: 'Talentos', icon: '💎' },
} as const;

export const coinsLabel = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? CURRENCY.coin.one : CURRENCY.coin.many}`;
export const talentsLabel = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? CURRENCY.premium.one : CURRENCY.premium.many}`;

/** "Moedas da Bíblia": pequena enciclopédia para a criança aprender (da menor para a maior). */
export interface BibleCoin {
  id: string;
  name: string;
  metal: 'cobre' | 'bronze' | 'prata' | 'ouro' | 'peso';
  origin: string;
  value: string;
  story: string;
  reference: string;
  color: string;
}

export const BIBLE_COINS: BibleCoin[] = [
  {
    id: 'lepto',
    name: 'Lepto',
    metal: 'cobre',
    origin: 'Judeia',
    value: 'A menor moeda de todas: duas valiam um quadrante.',
    story: 'Uma viúva pobre deu duas moedinhas no templo. Jesus disse que ela deu mais do que todos, porque deu tudo o que tinha.',
    reference: 'Marcos 12:41-44',
    color: '#b8733a',
  },
  {
    id: 'quadrante',
    name: 'Quadrante',
    metal: 'bronze',
    origin: 'Roma',
    value: 'Moeda romana pequena, de bronze.',
    story: 'Jesus usou o quadrante para ensinar a fazer as pazes logo, antes que a briga fique maior.',
    reference: 'Mateus 5:25-26',
    color: '#a0743f',
  },
  {
    id: 'denario',
    name: 'Denário',
    metal: 'prata',
    origin: 'Roma',
    value: 'O pagamento de um dia inteiro de trabalho.',
    story: 'Mostraram a Jesus um denário com a imagem de César. Ele disse: “Deem a César o que é de César, e a Deus o que é de Deus.”',
    reference: 'Mateus 22:19-21',
    color: '#c9ced6',
  },
  {
    id: 'dracma',
    name: 'Dracma',
    metal: 'prata',
    origin: 'Grécia',
    value: 'Moeda grega de prata, mais ou menos um denário.',
    story: 'Uma mulher perdeu uma dracma, varreu a casa inteira até achar e fez festa com as amigas. Assim o céu se alegra quando alguém volta para Deus.',
    reference: 'Lucas 15:8-10',
    color: '#d5d9df',
  },
  {
    id: 'estater',
    name: 'Estáter',
    metal: 'prata',
    origin: 'Tiro',
    value: 'Valia quatro dracmas: dava para pagar o imposto do templo de duas pessoas.',
    story: 'Jesus mandou Pedro pescar: o primeiro peixe tinha uma moeda na boca, e com ela pagaram o imposto do templo.',
    reference: 'Mateus 17:24-27',
    color: '#dfe3e8',
  },
  {
    id: 'siclo',
    name: 'Siclo',
    metal: 'prata',
    origin: 'Israel',
    value: 'No começo era um peso de prata; depois virou moeda.',
    story: 'José foi vendido pelos irmãos por 20 siclos de prata. Anos depois, Deus usou José para salvar a família da fome.',
    reference: 'Gênesis 37:28',
    color: '#e6e8ec',
  },
  {
    id: 'mina',
    name: 'Mina',
    metal: 'peso',
    origin: 'Oriente',
    value: 'Cerca de 100 dracmas.',
    story: 'Na parábola das minas, o rei elogiou quem fez a sua mina render: “Muito bem, servo bom!”',
    reference: 'Lucas 19:11-27',
    color: '#c7b27a',
  },
  {
    id: 'talento',
    name: 'Talento',
    metal: 'ouro',
    origin: 'Oriente',
    value: 'A maior medida da Bíblia: cerca de 6.000 denários!',
    story: 'O senhor deu talentos aos servos. Quem usou bem o que recebeu ouviu: “Muito bem, servo bom e fiel!”',
    reference: 'Mateus 25:14-30',
    color: '#f2c230',
  },
];
