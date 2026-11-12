#!/usr/bin/env bash
# Publica o DAVID RUNNER na VPS (projeto Docker "david-runner" da Hostinger).
#   - página de vendas: https://srv1969277.hstgr.cloud/david-runner/
#   - jogo web/PWA:     https://srv1969277.hstgr.cloud/david-runner/jogar/
#   - Expo Go:       exps://srv1969277.hstgr.cloud
# Uso: DR_UPLOAD_TOKEN=<token do projeto> ./deploy/vps/publicar.sh
# O token fica na variável UPLOAD_TOKEN do projeto no painel Docker da Hostinger (não versione).
set -euo pipefail
: "${DR_UPLOAD_TOKEN:?defina DR_UPLOAD_TOKEN}"
HOST="${DR_HOST:-https://srv1969277.hstgr.cloud}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"

(cd "$ROOT/david-runner" && npx vite build)
(cd "$ROOT/david-runner-expo" && npm run sync-game)
# site = página de vendas na raiz + o jogo em /jogar/
mkdir -p "$TMP/site/jogar"
cp -r "$ROOT/landing/." "$TMP/site/"
# ferramentas e documentação da página não vão para o site público
rm -rf "$TMP/site/tools" "$TMP/site/DESIGN.md"
cp -r "$ROOT/david-runner/dist/." "$TMP/site/jogar/"
tar czf "$TMP/site.tgz" -C "$TMP/site" .
tar czf "$TMP/expo.tgz" -C "$ROOT/david-runner-expo" --exclude=node_modules --exclude=.expo --exclude=dist .
# servidor do Mundo Aberto (sem node_modules; o servidor instala sozinho)
tar czf "$TMP/world.tgz" -C "$ROOT/world-server" --exclude=node_modules --exclude=test.js --exclude=access.test.js --exclude="dados/acessos.json*" .
for k in site expo; do
  curl -fsS -X PUT --data-binary "@$TMP/$k.tgz" -H "x-token: $DR_UPLOAD_TOKEN" "$HOST/david-runner-upload/$k"; echo
done
# "world" só funciona depois que o serviço world existir no projeto Docker (ver docker-compose.yml)
curl -fsS -X PUT --data-binary "@$TMP/world.tgz" -H "x-token: $DR_UPLOAD_TOKEN" "$HOST/david-runner-upload/world" && echo || echo "(servidor do mundo ainda não está no projeto Docker: pulado)"
echo "Pronto. Reinicie o serviço expo do projeto david-runner no painel da Hostinger para o Expo Go pegar a versão nova."
