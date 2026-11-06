/**
 * Ilustrações dos pacotes da loja (bolsinha, jarro, baú, saco, coroa, ovelha),
 * desenhadas em SVG com o mesmo traço do resto da interface.
 */
export type TreasureKind = 'bolsa' | 'jarro' | 'bau' | 'talentos' | 'tesouro' | 'inicio' | 'boas-vindas';

const OUT = '#5a3418';

function Coins({ x, y, n = 3 }: { x: number; y: number; n?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(${i * 9 - (n - 1) * 4.5} ${-(i % 2) * 5})`}>
          <ellipse cx="0" cy="0" rx="7" ry="4.5" fill="#dfe4ea" stroke={OUT} strokeWidth="2" />
          <ellipse cx="0" cy="-1.2" rx="4" ry="2" fill="#fff" opacity=".8" />
        </g>
      ))}
    </g>
  );
}

export function Treasure({ kind, size = 72 }: { kind: TreasureKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="treasure">
      {kind === 'bolsa' && (
        <>
          <path d="M14 30c0-7 8-12 18-12s18 5 18 12v14c0 6-8 10-18 10S14 50 14 44z" fill="#e9b14a" stroke={OUT} strokeWidth="2.5" />
          <path d="M18 27c3-5 9-7 14-7s11 2 14 7" fill="none" stroke="#fff3c4" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 18c2-5 6-7 10-7s8 2 10 7" fill="none" stroke={OUT} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="19" r="3" fill="#ffd23f" stroke={OUT} strokeWidth="2" />
          <Coins x={32} y={12} n={2} />
        </>
      )}
      {kind === 'jarro' && (
        <>
          <path d="M22 14h20l-3 8c6 3 9 8 9 15 0 10-7 17-16 17S16 47 16 37c0-7 3-12 9-15z" fill="#d9733a" stroke={OUT} strokeWidth="2.5" />
          <path d="M20 36c0-4 3-9 8-11" fill="none" stroke="#ffb27a" strokeWidth="3" strokeLinecap="round" />
          <path d="M18 14h28" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
          <path d="M22 40h20" stroke={OUT} strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
          <Coins x={32} y={9} n={3} />
        </>
      )}
      {kind === 'bau' && (
        <>
          <path d="M10 30h44v22a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="#9a5b2c" stroke={OUT} strokeWidth="2.5" />
          <path d="M10 30c0-9 10-14 22-14s22 5 22 14z" fill="#b8703a" stroke={OUT} strokeWidth="2.5" />
          <path d="M12 30h40" stroke={OUT} strokeWidth="2.5" />
          <rect x="27" y="26" width="10" height="12" rx="2" fill="#ffd23f" stroke={OUT} strokeWidth="2.5" />
          <circle cx="32" cy="32" r="1.8" fill={OUT} />
          <path d="M16 40h4M44 40h4" stroke="#ffd23f" strokeWidth="2.5" strokeLinecap="round" />
          <Coins x={32} y={14} n={3} />
          <path d="M20 9l1.5 3 3 .5-2.3 2 .6 3-2.8-1.6-2.8 1.6.6-3-2.3-2 3-.5z" fill="#fff" />
        </>
      )}
      {kind === 'talentos' && (
        <>
          <path d="M18 28c-6 6-8 12-8 18 0 8 8 12 22 12s22-4 22-12c0-6-2-12-8-18z" fill="#c98a0a" stroke={OUT} strokeWidth="2.5" />
          <path d="M22 28c2-6 6-9 10-9s8 3 10 9" fill="#e9b14a" stroke={OUT} strokeWidth="2.5" />
          <path d="M24 18l16 0" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
          <path d="M16 44c0-4 3-8 7-10" fill="none" stroke="#ffe08a" strokeWidth="3" strokeLinecap="round" />
          <path d="M26 40h12l-2 6h-8z" fill="#ffd23f" stroke={OUT} strokeWidth="2" />
          <path d="M44 12l1.5 3 3 .5-2.3 2 .6 3-2.8-1.6-2.8 1.6.6-3-2.3-2 3-.5z" fill="#fff" />
        </>
      )}
      {kind === 'tesouro' && (
        <>
          <path d="M12 48l-4-24 12 9 12-16 12 16 12-9-4 24z" fill="#ffd23f" stroke={OUT} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M12 48h40v6H12z" fill="#e9a814" stroke={OUT} strokeWidth="2.5" />
          <circle cx="32" cy="40" r="4" fill="#e2574c" stroke={OUT} strokeWidth="2" />
          <circle cx="20" cy="42" r="3" fill="#3fa9f5" stroke={OUT} strokeWidth="2" />
          <circle cx="44" cy="42" r="3" fill="#4cd964" stroke={OUT} strokeWidth="2" />
          <path d="M18 26l-2 10" stroke="#fff6c2" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {(kind === 'inicio' || kind === 'boas-vindas') && (
        <>
          <ellipse cx="34" cy="38" rx="18" ry="13" fill="#fff" stroke={OUT} strokeWidth="2.5" />
          <circle cx="22" cy="30" r="5" fill="#fff" stroke={OUT} strokeWidth="2.5" />
          <circle cx="27" cy="36" r="5" fill="#fff" stroke={OUT} strokeWidth="2.5" />
          <circle cx="40" cy="27" r="5" fill="#fff" stroke={OUT} strokeWidth="2.5" />
          <circle cx="47" cy="34" r="5" fill="#fff" stroke={OUT} strokeWidth="2.5" />
          <path d="M14 30c-4 0-6 3-6 6s2 6 6 6c3 0 5-2 6-4" fill="#3a2414" stroke={OUT} strokeWidth="2.5" />
          <circle cx="11" cy="35" r="1.5" fill="#fff" />
          <path d="M24 50v6M30 51v6M40 51v6M46 50v6" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
          <path d="M5 34l-3 2" stroke={OUT} strokeWidth="2.5" strokeLinecap="round" />
          {kind === 'boas-vindas' && <path d="M50 10l1.5 3 3 .5-2.3 2 .6 3-2.8-1.6-2.8 1.6.6-3-2.3-2 3-.5z" fill="#ffd23f" stroke={OUT} strokeWidth="1.5" />}
        </>
      )}
    </svg>
  );
}
