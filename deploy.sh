#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/srv/notify"
REPO_URL="https://github.com/SEU_USUARIO/SEU_REPO.git"  # <-- troque
DOMAIN="api.SEUDOMINIO.com"                              # <-- troque
COMPOSE_FILE="docker-compose.prod.yml"                   # caddy por padrão

# 1) Preparos
sudo apt update -y
sudo apt install -y ca-certificates curl git ufw
sudo ufw allow OpenSSH
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
  git checkout -f main || true
  git pull
fi

cd "$APP_DIR"

# 4) .env (se não existir)
if [ ! -f ".env" ]; then
  cp .env.example .env
  sed -i "s/no-reply@seudominio.com/no-reply@${DOMAIN#api.}/" .env || true
fi

# 5) Subir com Docker Compose
docker compose -f "$COMPOSE_FILE" up -d --build

echo "✅ Deploy finalizado. Verifique em: https://${DOMAIN}"
