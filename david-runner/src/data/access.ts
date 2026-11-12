import type { GameMode } from './modes';
import type { StoryEpisode } from './story';

/**
 * Acesso ao jogo completo.
 *
 * O app é GRÁTIS nas lojas e não vende nada lá dentro (sem compra pela Apple ou Google).
 * A família compra fora do app e recebe um código; o responsável digita o código na área
 * dos pais (com PIN) e o jogo completo é liberado. Por regra das lojas, o app não mostra
 * preço nem link de compra: só o campo para ativar o código.
 */

/**
 * Grátis para todos: a Corrida, o desafio do dia, as 3 primeiras histórias e a história do dia
 * enquanto ela for uma das 7 primeiras (uma semana de Jornada do Dia). Depois disso, a história
 * do dia pede o jogo completo: é o momento em que a criança mais quer continuar.
 */
export const FREE_MODES = ['corrida'];
export const FREE_STORIES = 3;
export const FREE_DAILY_UNTIL = 7;

/** Endereço do servidor de acesso (o mesmo do Mundo Aberto). `?access=` troca, para testes. */
export function accessApi(): string {
  try {
    const q = new URLSearchParams(location.search).get('access');
    if (q) return q.replace(/\/$/, '');
  } catch {
    /* sem location (testes) */
  }
  return 'https://srv1969277.hstgr.cloud/david-runner-world/access';
}

export type AccessResult = { ok: true; plan: string; until: string | null } | { ok: false; error: string };

export const ACCESS_ERRORS: Record<string, string> = {
  codigo: 'Código não encontrado. Confira as letras e tente de novo.',
  expirado: 'Este código já venceu. Renove o acesso da família.',
  limite: 'Este código já está em 3 aparelhos. Fale com o suporte para trocar.',
  espere: 'Muitas tentativas. Espere um minuto e tente de novo.',
  rede: 'Sem internet agora. Conecte e tente de novo.',
  aparelho: 'Não foi possível identificar este aparelho.',
};

export async function callAccess(route: 'activate' | 'check', code: string, device: string): Promise<AccessResult> {
  try {
    const r = await fetch(`${accessApi()}/${route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, device }) });
    const j = (await r.json()) as AccessResult;
    return j && typeof j === 'object' && 'ok' in j ? j : { ok: false, error: 'rede' };
  } catch {
    return { ok: false, error: 'rede' };
  }
}

/** Formata o que a pessoa digita: ABCD-EFGH-JKLM. */
export function formatCode(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return s.replace(/(.{4})(?=.)/g, '$1-');
}

export const isFreeMode = (m: GameMode): boolean => FREE_MODES.includes(m.id);
export const isFreeStory = (s: StoryEpisode, dailyId: string): boolean => s.number <= FREE_STORIES || (s.id === dailyId && s.number <= FREE_DAILY_UNTIL);
