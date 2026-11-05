# DAVID RUNNER na VPS (Hostinger)

Projeto Docker Compose `david-runner` na VPS `srv1969277.hstgr.cloud`, atrás do Traefik que já existe (HTTPS automático via Let's Encrypt).

| Serviço | O que faz | Endereço |
| --- | --- | --- |
| `web` | jogo para o navegador/PWA (nginx) | https://srv1969277.hstgr.cloud/david-runner/ |
| `expo` | servidor do Expo (Metro) para o **Expo Go** | `exps://srv1969277.hstgr.cloud` |
| `uploader` | recebe as atualizações (protegido por token) | `/david-runner-upload/{site,expo}` |

## Abrir no iPhone

- **Expo Go:** instale o Expo Go, abra a câmera, aponte para o QR code de `exps://srv1969277.hstgr.cloud`. Ou, no Expo Go, toque em "Enter URL manually" e digite esse endereço.
- **Safari:** abra https://srv1969277.hstgr.cloud/david-runner/ → Compartilhar → "Adicionar à Tela de Início". Abre em tela cheia e funciona sem internet.

## Atualizar

```bash
DR_UPLOAD_TOKEN=<token> ./deploy/vps/publicar.sh
```
Depois reinicie o serviço `expo` (painel Docker da Hostinger → projeto david-runner → Restart).

## Conta Expo

O projeto está registrado na conta Expo `vinny825357` (https://expo.dev/accounts/vinny825357/projects/david-runner). O serviço `expo` usa a variável `EXPO_TOKEN` (token de acesso dessa conta, definido só no painel Docker da Hostinger) para assinar o app; sem ela, o Expo Go só abre o projeto se estiver deslogado. Para trocar ou revogar o token: expo.dev → Account settings → Access tokens.

O servidor do Expo é de desenvolvimento: serve o app a quem tiver o endereço. Para desligá-lo, pare o projeto ou remova o serviço `expo`.
