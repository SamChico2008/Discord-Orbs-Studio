#!/usr/bin/env bash
# Portfolio deployment script to remote NAS host

set -euo pipefail

NAS_IP="${1:-192.168.1.100}"
NAS_USER="${2:-ubuntu}"
NAS_PATH="${3:-/home/ubuntu/portfolio}"

echo "=================================================="
echo "  Deploying portfolio to $NAS_USER@$NAS_IP:$NAS_PATH"
echo "=================================================="

# 1. Prepare target folder
ssh "$NAS_USER@$NAS_IP" "mkdir -p $NAS_PATH/downloads"

# 2. Transfer files
scp index.html style.css app.js projects.json nginx.conf docker-compose.yml "$NAS_USER@$NAS_IP:$NAS_PATH/"

# 3. Restart container
ssh "$NAS_USER@$NAS_IP" "cd $NAS_PATH && (docker compose down 2>/dev/null || true) && docker compose up -d"

echo ""
echo "[SUCCESS] Portfolio deployed successfully!"
echo "URL: http://$NAS_IP:8080"
