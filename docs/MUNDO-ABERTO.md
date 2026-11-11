# Mundo Aberto (beta online)

Uma praça de Jerusalém para explorar a pé, onde várias crianças aparecem ao mesmo tempo.
Entrada: **Modos → Mundo Aberto**.

## O que existe neste beta
- Praça 3D com fonte, mercados, casas, torres e árvores; colisões simples.
- Joystick (esquerda) para andar, arrastar a tela para girar a câmera; WASD/setas no computador.
- Outros jogadores em tempo real (posição, direção, andar/correr/gesto), com nome acima da cabeça.
- Conversa **somente com 8 frases prontas e 4 gestos** (acenar, dançar, pular, orar). Não há texto livre.
- Se o servidor não responde, o jogo avisa e segue em **modo solo**.

## Segurança para crianças (regras no servidor, não dá para o cliente burlar)
- Sem chat livre: o servidor só aceita o número da frase/gesto.
- Nome exibido: só o primeiro nome, só letras, até 12, com filtro de palavras impróprias.
- O servidor não guarda nada em disco, não recebe e-mail, idade nem localização.
- Salas de até 24 jogadores; limite de mensagens por segundo; velocidade e limites do mundo validados.
- Próximos passos recomendados antes de abrir ao público: botão "denunciar/silenciar" e opção dos pais
  desligarem o modo online no Painel dos Pais.

## Arquitetura
- `world-server/server.js`: Node + `ws`. Mensagens JSON: `join`, `pos` (10x/s), `say`, `emote`; o servidor devolve
  `welcome`, `join`, `leave`, `snap` (10x/s), `say`, `emote`. Teste: `cd world-server && npm test`.
- `david-runner/src/game/World.ts`: cenário, herói, jogadores remotos, câmera e colisões.
- `david-runner/src/net/worldClient.ts`: conexão. Endereço padrão `wss://srv1969277.hstgr.cloud/david-runner-world`
  (troque com `?ws=ws://localhost:8787` na URL para testar).
- `david-runner/src/ui/screens/WorldScreen.tsx`: joystick, etiquetas, balões de fala e painéis de frases/gestos.
- Teste ponta a ponta com dois navegadores: `david-runner/tests/e2e/mundo-aberto.cjs`.

## Colocar o servidor no ar (VPS)
O `deploy/vps/docker-compose.yml` já tem o serviço `world` (porta 8787 atrás do Traefik em
`/david-runner-world`) e o alvo `world` no uploader. É preciso **atualizar o projeto Docker `david-runner` na
Hostinger com esse compose** (uma vez). Depois, `deploy/vps/publicar.sh` envia o servidor junto com o site e o
`node --watch` recarrega sozinho.

## Limites conhecidos do beta
- Sem NPCs andando no mundo ainda (os moradores existem só no lobby).
- Sem história/missões dentro do mundo; é só explorar e conviver.
- Um servidor só (sem escala horizontal). Suficiente para dezenas de crianças ao mesmo tempo.
