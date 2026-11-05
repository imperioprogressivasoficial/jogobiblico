# DAVID RUNNER — Corra pela História

Jogo de corrida infinita em 3D para celular e computador, com heróis e cenários bíblicos.
Davi corre por cinco mapas, desvia de obstáculos, coleta moedas, pergaminhos (curiosidades bíblicas) e relíquias.

## Como jogar

```bash
cd david-runner
npm install
npm run dev        # abre em http://localhost:5173 (também acessível pelo celular na mesma rede)
```

Para gerar a versão de produção: `npm run build` (pasta `dist/`).
Para gerar **um único arquivo HTML** que pode ser enviado ou hospedado em qualquer lugar: `npm run build:single` (gera `dist-single/index.html`).

## App para celular

O jogo é um app mobile, empacotado com [Capacitor](https://capacitorjs.com) a partir do mesmo código:

- **Android:** o projeto nativo está em `android/`. Para gerar o APK de teste: `npm run android:apk`. Ele fica em `android/app/build/outputs/apk/debug/app-debug.apk` e pode ser instalado direto no celular. Para abrir no Android Studio: `npm run android:open`. É preciso ter o Android SDK instalado.
- **iOS:** o projeto nativo está em `ios/`. Abra no Xcode (num Mac) com `npm run ios:open`.
- **No app nativo:** tela cheia sem barras, orientação retrato travada, tela sempre ligada durante a corrida, vibração nativa ao colidir. O botão "voltar" do Android pausa a corrida e volta entre as telas. Tudo funciona sem internet, inclusive as fontes.
- **Pelo navegador (PWA):** publicado num site, o jogo pode ser instalado pelo menu "Adicionar à tela inicial". Abre em tela cheia, em retrato, e funciona offline depois da primeira visita.
- **Ícones e telas de abertura:** ficam em `resources/`. Para gerar de novo: `npm run icons:native`.
- **Publicar nas lojas:** a Google Play precisa de um AAB assinado com a chave da empresa, gerado pelo Android Studio em *Build → Generate Signed Bundle*. Guarde essa chave em local seguro, porque todas as atualizações futuras precisam dela. A App Store exige conta Apple Developer e build pelo Xcode. O identificador do app é `br.com.imperioprogressivas.davidrunner`.

### Controles

| Ação | Celular | Computador |
| --- | --- | --- |
| Trocar de pista | Deslizar ← → | ← → ou A / D |
| Pular | Deslizar ↑ | ↑, W ou Espaço |
| Deslizar (no ar: descida rápida) | Deslizar ↓ | ↓ ou S |
| Pausar | Botão ⏸ | Esc ou P |

## O que já está pronto

- **Jogabilidade**: 3 pistas, corrida automática, pulo, deslize, descida rápida, troca de pista com batida lateral (tropeço) e colisão frontal, velocidade crescente, subpassos de física para colisões confiáveis.
- **Geração procedural** com dificuldade progressiva e **garantia de caminho possível**: cada fileira tem uma pista segura que muda no máximo uma pista por vez e nunca entra num comboio de carroças.
- **5 mapas** com identidade própria: Jerusalém, Deserto, Vale de Elá, Egito e Babilônia (cenário, chão, obstáculos, horizonte e iluminação).
- **Obstáculos**: vasos, caixas, cestos, pedras, troncos, barreiras de tecido, lanças, portões, barracas, carroças (inclusive em comboio), estátuas, tendas, ovelhas e cabras atravessando a pista.
- **Colecionáveis**: moedas (com ímã), pergaminhos (24 curiosidades com referência bíblica), relíquias raras e power-ups (Ímã de Moedas, Harpa Dourada x2 e Escudo da Fé).
- **6 heróis**: Davi, Moisés, Noé, José, Daniel e Sansão — cada um com modelo 3D, descrição, trajes alternativos e condição de desbloqueio.
- **Telas**: splash, menu, heróis, mapas, corrida (HUD), pausa, reviver, fim de partida, recordes, loja, conquistas, missões diárias, pergaminhos e configurações — tudo em português.
- **Progressão**: pontuação por distância, multiplicador (sobe ao completar as missões do dia), recordes, 19 conquistas, missões diárias, loja de heróis, trajes e melhorias, salvamento local (`localStorage`).
- **Áudio original**: músicas e efeitos sintetizados em tempo real (Web Audio), sem nenhum arquivo de terceiros.
- **Desempenho**: modelos unidos em uma geometria por objeto (1 draw call), moedas instanciadas, pools de objetos reciclados, partículas limitadas e qualidade gráfica automática (reduz resolução/sombras se o aparelho ficar lento).

## Arquitetura

```
src/
  game/                    motor do jogo (Three.js, sem React)
    GameEngine.ts          laço principal, modos, colisões, power-ups e eventos
    PlayerController.ts    pistas, pulo, deslize, estados do herói
    CameraController.ts    câmera em 3ª pessoa, transições, tremor, FOV adaptável
    TrackGenerator.ts      geração procedural da pista (lógica pura, testada)
    ObstacleManager.ts     obstáculos com pool e colisão AABB
    CollectibleManager.ts  moedas (InstancedMesh), pergaminhos, relíquias, power-ups
    EnvironmentManager.ts  céu, luz, neblina, chão em segmentos, cenário lateral
    ScoreManager.ts        pontuação e estatísticas da corrida
    AudioManager.ts        música e efeitos procedurais
    InputManager.ts        teclado e gestos de deslizar
    models/                personagens, animações, props e materiais
  state/ProgressionManager.ts   salvamento, missões, conquistas, loja, desbloqueios
  data/                    heróis, mapas, pergaminhos, conquistas e missões (fácil de editar)
  ui/                      React: UIManager (navegação) e telas
```

Os personagens são construídos em código (`models/characterModel.ts`) com um esqueleto simples de articulações.
Para trocar por modelos definitivos (glTF), basta devolver um `CharacterRig` com as mesmas articulações — o restante do jogo não muda.

## Testes

```bash
npm test                      # gerador procedural: caminho sempre possível, sem moedas dentro de obstáculos
npm run build && npm run preview &
node tests/e2e/fluxo-completo.cjs        # controles, pausa, reviver, loja, mapas, missões, salvamento
node tests/e2e/controles-e-colisao.cjs   # colisões e controles no motor real
node tests/e2e/piloto-automatico.cjs     # piloto automático percorre ~10 km em cada mapa sem colidir
```

Os testes de navegador usam o [Playwright](https://playwright.dev) (`npm i -D playwright && npx playwright install chromium`).
