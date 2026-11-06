import { useEffect, useState } from 'react';
import { audio } from '../../../game/AudioManager';
import { ModeFinish, ModeHeader } from './ModeFinish';

/** Figuras da Bíblia: cada par encontrado mostra uma curiosidade. */
const ITEMS = [
  { e: '🦁', name: 'Leão', fact: 'Deus fechou a boca dos leões e protegeu Daniel. (Daniel 6)' },
  { e: '🕊️', name: 'Pomba', fact: 'A pomba voltou para a arca com uma folha de oliveira. (Gênesis 8:11)' },
  { e: '🐑', name: 'Ovelha', fact: 'Jesus é o Bom Pastor que cuida das ovelhas. (João 10:11)' },
  { e: '🐟', name: 'Peixe', fact: 'Com cinco pães e dois peixes, Jesus alimentou uma multidão. (João 6)' },
  { e: '🍞', name: 'Pão', fact: 'No deserto, Deus mandou o maná, o pão do céu. (Êxodo 16)' },
  { e: '⭐', name: 'Estrela', fact: 'Uma estrela guiou os magos até Jesus. (Mateus 2)' },
  { e: '🌈', name: 'Arco-íris', fact: 'O arco-íris é o sinal da promessa de Deus a Noé. (Gênesis 9:13)' },
  { e: '🐫', name: 'Camelo', fact: 'Rebeca deu água aos camelos do servo de Abraão. (Gênesis 24)' },
  { e: '🍇', name: 'Uvas', fact: 'Os espias voltaram de Canaã com um cacho de uvas enorme! (Números 13:23)' },
  { e: '👑', name: 'Coroa', fact: 'Davi, o pastorzinho, se tornou rei de Israel. (2 Samuel 5)' },
  { e: '🐋', name: 'Grande peixe', fact: 'Jonas ficou três dias dentro de um grande peixe. (Jonas 1:17)' },
  { e: '🌟', name: 'Luz', fact: 'Deus disse: “Haja luz!”, e houve luz. (Gênesis 1:3)' },
];

const LEVELS = [
  { pairs: 4, cols: 4 },
  { pairs: 6, cols: 4 },
  { pairs: 8, cols: 4 },
];

interface Card {
  id: number;
  k: number;
  open: boolean;
  done: boolean;
}

function deal(pairs: number): Card[] {
  const ks = [...ITEMS.keys()].sort(() => Math.random() - 0.5).slice(0, pairs);
  return [...ks, ...ks].sort(() => Math.random() - 0.5).map((k, id) => ({ id, k, open: false, done: false }));
}

/** Memória da Arca: ache os pares de figuras da Bíblia; três fases, cada uma com mais cartas. */
export function MemoryMode() {
  const [level, setLevel] = useState(0);
  const [cards, setCards] = useState<Card[]>(() => deal(LEVELS[0].pairs));
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [fact, setFact] = useState<string | null>(null);
  const [lock, setLock] = useState(false);
  const [over, setOver] = useState(false);

  const open = cards.filter((c) => c.open && !c.done);

  useEffect(() => {
    if (open.length !== 2) return;
    setLock(true);
    setMoves((m) => m + 1);
    const [a, b] = open;
    if (a.k === b.k) {
      audio.play('coin');
      setScore((s) => s + 100);
      setFact(`${ITEMS[a.k].e} ${ITEMS[a.k].name}: ${ITEMS[a.k].fact}`);
      setCards((cs) => cs.map((c) => (c.k === a.k ? { ...c, done: true } : c)));
      setLock(false);
    } else {
      const h = window.setTimeout(() => {
        setCards((cs) => cs.map((c) => (c.id === a.id || c.id === b.id ? { ...c, open: false } : c)));
        setLock(false);
      }, 800);
      return () => clearTimeout(h);
    }
  }, [open.length]);

  useEffect(() => {
    if (!cards.length || !cards.every((c) => c.done)) return;
    const h = window.setTimeout(() => {
      if (level + 1 < LEVELS.length) {
        audio.play('victory');
        setScore((s) => s + 200);
        setLevel(level + 1);
        setCards(deal(LEVELS[level + 1].pairs));
        setFact(null);
      } else setOver(true);
    }, 1400);
    return () => clearTimeout(h);
  }, [cards, level]);

  function flip(c: Card) {
    if (lock || c.open || c.done || open.length >= 2) return;
    audio.play('lane');
    setCards((cs) => cs.map((x) => (x.id === c.id ? { ...x, open: true } : x)));
  }

  function again() {
    setLevel(0);
    setCards(deal(LEVELS[0].pairs));
    setMoves(0);
    setScore(0);
    setFact(null);
    setOver(false);
  }

  const final = Math.max(0, score - moves * 5);
  return (
    <div className="screen mode-screen mode-memory" data-testid="mode-memory">
      <ModeHeader title="🚢 Memória da Arca" right={<span className="mode-pill">Fase {level + 1}/3</span>} />
      <p className="mm-sub">Encontre os pares! Jogadas: {moves}</p>
      <div className="mm-grid" style={{ gridTemplateColumns: `repeat(${LEVELS[level].cols}, 1fr)` }}>
        {cards.map((c) => (
          <button key={`${level}-${c.id}`} type="button" className={`mm-card ${c.open || c.done ? 'up' : ''} ${c.done ? 'done' : ''}`} data-testid={`mm-card-${c.id}`} data-k={c.k} onClick={() => flip(c)}>
            <span className="mm-back">🕊️</span>
            <span className="mm-front">{ITEMS[c.k].e}</span>
          </button>
        ))}
      </div>
      {fact && (
        <div className="mm-fact" key={fact}>
          {fact}
        </div>
      )}
      {over && <ModeFinish mode="memoria" score={final} coins={Math.round(final / 8)} line={`Você encheu a arca em ${moves} jogadas!`} onAgain={again} />}
    </div>
  );
}
