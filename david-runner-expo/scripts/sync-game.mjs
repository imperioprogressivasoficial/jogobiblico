// Copia o jogo (versão em arquivo único) para dentro do app Expo.
// Uso: npm run sync-game
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const game = join(here, '..', '..', 'david-runner');
execSync('npm run build:single', { cwd: game, stdio: 'inherit' });
const html = readFileSync(join(game, 'dist-single', 'index.html'), 'utf8');
writeFileSync(
  join(here, '..', 'src', 'gameHtml.ts'),
  `// Gerado por scripts/sync-game.mjs — não edite à mão.\n// eslint-disable-next-line\nexport const GAME_HTML: string = ${JSON.stringify(html)};\n`,
);
console.log(`Jogo copiado para src/gameHtml.ts (${Math.round(html.length / 1024)} KB)`);
