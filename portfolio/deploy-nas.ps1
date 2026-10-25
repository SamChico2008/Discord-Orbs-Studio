<#
.SYNOPSIS
    Script de déploiement automatique du portfolio vers le NAS Ubuntu (10.0.0.167).
.EXAMPLE
    .\deploy-nas.ps1
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$NasUser = "ubuntu",

    [Parameter(Mandatory=$false)]
    [string]$NasIp = "10.0.0.167",

    [Parameter(Mandatory=$false)]
    [string]$NasPath = "/home/ubuntu/portfolio"
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  DÉPLOIEMENT DU PORTFOLIO VERS LE NAS" -ForegroundColor Yellow
Write-Host "  Cible : ${NasUser}@${NasIp}:${NasPath}" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Création du répertoire distant sur le NAS
Write-Host "`n[1/3] Préparation du dossier sur le NAS (${NasPath})..." -ForegroundColor Green
ssh "${NasUser}@${NasIp}" "mkdir -p ${NasPath}/downloads"

# 2. Copie intégrale des fichiers du site et configs
Write-Host "[2/3] Transfert des fichiers du portfolio..." -ForegroundColor Green
scp -r index.html style.css app.js projects.json nginx.conf docker-compose.yml "${NasUser}@${NasIp}:${NasPath}/"

# 3. Lancement du conteneur Docker Nginx sur le NAS
Write-Host "[3/3] Démarrage du conteneur Nginx sur le NAS..." -ForegroundColor Green
ssh "${NasUser}@${NasIp}" "cd ${NasPath} && (docker compose down 2>/dev/null || true) && docker compose up -d"

Write-Host "`n[SUCCÈS] Déploiement terminé avec succès !" -ForegroundColor Green
Write-Host "Site accessible sur : http://${NasIp}:8080" -ForegroundColor Cyan
