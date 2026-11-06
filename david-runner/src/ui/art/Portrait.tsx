import { useEffect, useState } from 'react';
import { getCharacter } from '../../data/characters';
import { loadPortrait, portraitUrl } from './portraits';

/**
 * Retrato redondo/quadrado de um herói, desenhado do modelo 3D.
 * `tone` dá a cor do fundo (normalmente a túnica do herói).
 */
export function Portrait({
  charId,
  skinId = 'padrao',
  size = 48,
  shape = 'circle',
  className = '',
  tone,
}: {
  charId: string;
  skinId?: string;
  size?: number;
  shape?: 'circle' | 'rounded';
  className?: string;
  tone?: string;
}) {
  const [url, setUrl] = useState<string | null>(() => portraitUrl(charId, skinId));
  useEffect(() => {
    let alive = true;
    setUrl(portraitUrl(charId, skinId));
    loadPortrait(charId, skinId, (u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [charId, skinId]);
  const c = getCharacter(charId);
  const bg = tone ?? c.look.tunic;
  return (
    <span
      className={`portrait portrait-${shape} ${className}`}
      style={{ width: size, height: size, background: `radial-gradient(circle at 50% 30%, #fff8, transparent 60%), ${bg}` }}
      aria-label={c.name}
      role="img"
    >
      {url ? <img src={url} alt="" draggable={false} /> : <span className="portrait-fallback">{c.name[0]}</span>}
    </span>
  );
}
