#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/srv/notify"
REPO_URL="https://github.com/Marcos-Gabriell/envio-de-email-node"
ROOT_DOMAIN="marcosgabriell.com.br"
API_DOMAIN="api.${ROOT_DOMAIN}"
COMPOSE_FILE="docker-compose.prod.yml"   # usa Caddy por padrão

# 1) Preparos
sudo apt update -y
sudo apt install -y ca-certificates curl git ufw
sudo ufw allow OpenSSH || true
sudo ufw allow 80,443/tcp || true
sudo ufw --force enable || true

# 2) Docker + Compose
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
sudo apt install -y docker-compose-plugin || true
sudo usermod -aG docker "$USER" || true

# 3) Código
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER":"$USER" "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch --all -p
  # tenta main, senão master
  (git checkout -f main || git checkout -f master) || true
  git pull || true
fi

cd "$APP_DIR"

# 4) .env (se não existir)
if [ ! -f ".env" ]; then
  cp .env.example .env
  # troca o e-mail "no-reply@seudominio.com" pelo domínio raiz correto
  sed -i "s/no-reply@seudominio.com/no-reply@${ROOT_DOMAIN}/" .env || true
fi

# 5) Subir com Docker Compose (Caddy faz HTTPS automático)
docker compose -f "$COMPOSE_FILE" up -d --build

echo "✅ Deploy finalizado."
echo "ℹ️  Aponte um registro A de DNS: ${API_DOMAIN} -> <IP da sua VPS>"
echo "🌐 Assim que a DNS propagar, acesse: https://${API_DOMAIN}/health"
