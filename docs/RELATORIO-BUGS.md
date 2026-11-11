# Relatório de bugs (QA / bugfix) — branch `fix/bugs`

## Bugs encontrados e corrigidos

| # | Sev. | Onde | Como reproduzir | Correção |
|---|------|------|-----------------|----------|
| 1 | Crítica | `world-server/server.js` | Enviar ao WebSocket o texto `null` (ou número/lista): `m.t` lança exceção e derruba o processo inteiro (todas as salas). | Ignora mensagens que não são objetos. Teste em `world-server/test.js`. |
| 2 | Alta | `ParentGate.tsx` | Dar toque duplo no último dígito do PIN: `onOk` roda duas vezes e o pacote de denários é creditado em dobro. | Trava `fired`. Também: 5 PINs errados seguidos bloqueiam por 30 s. E2E `regressao-bugs.cjs`. |
| 3 | Alta | `GameScreen.tsx` | Toque duplo em "Reviver" cobra duas vezes; "Não, obrigado" junto com o fim da contagem chama `applyRun` duas vezes (corrida contada em dobro). | Trava `settled` em `finalize`/`revive` e checagem do modo do motor. E2E. |
| 4 | Alta | `ProgressionManager` | Save antigo/corrompido: moedas ou talentos negativos, `characters`/`maps` com ids inexistentes, missão de modelo removido (`applyRun` quebrava com `undefined`). | `sanitize()` no carregamento. Testes em `tests/progression.test.ts`. |
| 5 | Alta | `ProgressionManager` | `spendCoins(-n)` aumentava as moedas e `spendCoins(NaN)` deixava o saldo `NaN`; `grantPack` e `buySkinFor` aceitavam valores negativos (talentos de graça) e roupa de herói não desbloqueado. | Validação de entrada. Testes. |
| 6 | Média | `ProgressionManager.resetProgress` | "Apagar progresso" apagava as compras de pacote único e a conta: o presente de boas-vindas e o "Pacote do Pastorzinho" podiam ser recebidos de novo. | Mantém `profile` e `purchases`. Teste. |
| 7 | Média | Jornada do Dia | `markStoryRead` / `completeStoryQuiz` de uma história já lida marcavam o passo do dia só na memória (sem salvar nem avisar a interface); `openChest` não conferia a virada de dia. | `dailyStep` grava; `openChest` chama `ensureDaily`. Teste. |
| 8 | Média | `StoryRunOverlay.tsx` | Errar ou acertar o quiz no modo "Viver a história" interrompe a fala sem devolver o volume: a música ficou abafada o resto da corrida. Sair da corrida antes de 1,8 s religava a contagem no menu; toque duplo na resposta certa agendava dois "continuar". | Devolve o volume, limpa os timers ao desmontar, trava `answered`. |
| 9 | Média | `narrator.ts` | App em segundo plano não parava a voz (nem o botão "ouvindo" voltava); fala pausada no iOS/Chrome travava a fila. | `visibilitychange` cancela e chama o `onEnd`; `resume()` antes de falar. |
| 10 | Média | `GameEngine.ts` | 6 listeners globais de `audio.unlock` nunca eram removidos em `dispose`. | Referência única, removida em `dispose`. |
| 11 | Média | `worldClient.ts` / `World.ts` / `WorldScreen.tsx` | Mensagens malformadas (`welcome` sem lista, `snap` não-lista, `join` sem jogador) lançavam exceção; mensagens chegavam após `close()`; posições `NaN` quebravam avatares; "Tentar de novo" recarregava o app inteiro (voltava à abertura). | Validações, guarda `closed`, reconexão que solta o socket antigo, `clearRemotes()` ao reconectar. Teste `tests/worldClient.test.ts`. |
| 12 | Baixa | `world-server` | `r` infinito virava `null` no snapshot; quem ficava parado acumulava distância para "teletransportar" (dt sem teto); o filtro de nomes bloqueava "Marcus" (`cu`). | Limita `r`, teto de 0,5 s no `dt`, palavras curtas só no início do nome. |

Também adicionado `tests/dados.test.ts` (integridade de histórias, quizzes, mapas, ids únicos, ids compatíveis com o servidor): sem falhas.

## Arquivos alterados
- `david-runner/src/state/ProgressionManager.ts`
- `david-runner/src/game/GameEngine.ts`, `src/game/World.ts`
- `david-runner/src/net/worldClient.ts`
- `david-runner/src/ui/narrator.ts`
- `david-runner/src/ui/components/ParentGate.tsx`, `StoryRunOverlay.tsx` (só lógica)
- `david-runner/src/ui/screens/GameScreen.tsx`, `WorldScreen.tsx` (só lógica)
- `world-server/server.js`, `world-server/test.js`
- Testes novos: `david-runner/tests/progression.test.ts`, `worldClient.test.ts`, `dados.test.ts`, `tests/e2e/regressao-bugs.cjs`

## Resultados
- `npx tsc --noEmit`: sem erros. `npx vitest run`: 4 arquivos, 26 testes, todos passam. `npx vite build`: ok. `world-server npm test`: ok.
- E2E (iPhone 13 emulado, SwiftShader): fluxo-completo, jornada-e-carruagem, cadastro-loja-modos, controles-e-colisao, piloto-automatico, mundo-aberto (dois jogadores, frase, saída) e regressao-bugs passaram. A máquina estava saturada (outro agente rodando testes): alguns e2e deram timeout/falha de captura na primeira tentativa e passaram ao repetir; o teste "joystick move o herói" do mundo-aberto falha só com FPS muito baixo (dt limitado por quadro).
- Percorri todas as telas (menu, heróis, mapas, recordes, loja, conquistas, missões, ajustes, jornada, modos, moedas, pais) sem erros de console e sem rolagem horizontal da página.

## Não corrigido / observações
- Faixa de abas da Loja abre rolada, com "Destaque" cortada à esquerda no iPhone 13 (visual, em `src/ui/**` com redesenho em andamento).
- Texto de Missões diz "+1 Carruagem de Fogo", mas a carga vai para o poder equipado (texto, UI).
- Loja do Dia: rótulo "-20%" com preço arredondado igual ao original para roupas de 1 talento (UI/cálculo cosmético).
- Botão voltar do Android no cadastro não volta de passo (só bloqueia); durante pausa/resultados da corrida não faz nada.
- Sem limite de tentativas persistente no PIN (o bloqueio de 30 s vale enquanto o diálogo está aberto).
- `gameHtml.ts` do Expo não foi tocado (gerado).
- Os testes e2e de regressão (toque duplo) não foram confirmados "vermelhos" no código antigo; os testes de vitest/servidor foram (servidor confirmado derrubando com `null`).
