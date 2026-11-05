# DAVID RUNNER — app Expo

App Expo (React Native) que roda o DAVID RUNNER em tela cheia. O jogo 3D (WebGL) fica embutido dentro do app e funciona sem internet.
Funciona no **Expo Go** (iPhone e Android) e também pode virar app de loja com o EAS Build.

## Jogar no iPhone com o Expo Go

O Expo Go precisa de um computador servindo o app na mesma rede Wi-Fi do iPhone.

1. No iPhone, instale o **Expo Go** pela App Store.
2. No computador (Windows, Mac ou Linux, com Node.js 20 ou mais novo), dentro do repositório:
   ```bash
   cd david-runner-expo
   npm install
   npx expo start
   ```
3. Vai aparecer um **QR code** no terminal. Aponte a **câmera do iPhone** para ele e toque em "Abrir no Expo Go".
4. O jogo abre em tela cheia. Toque para começar e depois em **JOGAR**.

Se o iPhone e o computador estiverem em redes diferentes, por exemplo no 4G, use `npx expo start --tunnel`. Ele cria um link público temporário só enquanto o comando estiver rodando.

### Link fixo, sem computador ligado (opcional)

Com uma conta gratuita da Expo (https://expo.dev), dá para publicar o app:
```bash
npx eas-cli login
npx eas-cli update:configure
npx eas-cli update --branch preview --message "David Runner"
```
Isso gera um link e um QR code permanentes que abrem no Expo Go a qualquer momento.

## Atualizar o jogo dentro do app

Depois de mudar o jogo em `../david-runner`, rode:
```bash
npm run sync-game
```
O comando gera a versão em arquivo único do jogo e grava em `src/gameHtml.ts`.

## Como funciona

- `App.tsx`: WebView em tela cheia com o jogo, retrato travado e barra de status escondida.
  - O botão "voltar" do Android pausa a corrida ou volta de tela; no menu, fecha o app.
  - Ao ir para segundo plano, a corrida pausa sozinha.
- O progresso fica salvo no próprio aparelho (`localStorage` da WebView, com origem fixa).

## Publicar na App Store / Google Play

```bash
npx eas-cli build --platform ios      # precisa de conta Apple Developer
npx eas-cli build --platform android
```
Identificador: `br.com.imperioprogressivas.davidrunner`.
