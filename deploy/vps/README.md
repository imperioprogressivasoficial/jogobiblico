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

O servidor do Expo é de desenvolvimento: serve o app a quem tiver o endereço. Para desligá-lo, pare o projeto ou remova o serviço `expo`.
