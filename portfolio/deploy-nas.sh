#!/usr/bin/env bash
# ==============================================================================
# Script de synchronisation automatique vers le NAS Ubuntu (10.0.0.167)
# ==============================================================================

set -e

NAS_USER="${1:-ubuntu}"
NAS_IP="${2:-10.0.0.167}"
NAS_PATH="${3:-/home/ubuntu/portfolio}"

echo "=== Déploiement vers $NAS_USER@$NAS_IP:$NAS_PATH ==="

# Création du répertoire distant
ssh "$NAS_USER@$NAS_IP" "mkdir -p $NAS_PATH/downloads"

# Synchronisation des fichiers
scp index.html style.css app.js projects.json nginx.conf docker-compose.yml "$NAS_USER@$NAS_IP:$NAS_PATH/"

# Redémarrage Docker sur le NAS
ssh "$NAS_USER@$NAS_IP" "cd $NAS_PATH && (docker compose down 2>/dev/null || true) && docker compose up -d"

echo "=== Déploiement terminé sur http://$NAS_IP:8080 ==="
