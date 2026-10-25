<#
.SYNOPSIS
    Automated deployment script for the portfolio to an Ubuntu NAS host.
.EXAMPLE
    .\deploy-nas.ps1
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$NasUser = "ubuntu",

    [Parameter(Mandatory=$false)]
    [string]$NasIp = "192.168.1.100",

    [Parameter(Mandatory=$false)]
    [string]$NasPath = "/home/ubuntu/portfolio"
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  PORTFOLIO DEPLOYMENT TO NAS" -ForegroundColor Yellow
Write-Host "  Target : ${NasUser}@${NasIp}:${NasPath}" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Directory creation
Write-Host "`n[1/3] Preparing directory on NAS (${NasPath})..." -ForegroundColor Green
ssh "${NasUser}@${NasIp}" "mkdir -p ${NasPath}/downloads"

# 2. File transfer
Write-Host "[2/3] Transferring portfolio files..." -ForegroundColor Green
scp -r index.html style.css app.js projects.json nginx.conf docker-compose.yml "${NasUser}@${NasIp}:${NasPath}/"

# 3. Docker Compose restart
Write-Host "[3/3] Starting Nginx container on NAS..." -ForegroundColor Green
ssh "${NasUser}@${NasIp}" "cd ${NasPath} && (docker compose down 2>/dev/null || true) && docker compose up -d"

Write-Host "`n[SUCCESS] Deployment completed successfully!" -ForegroundColor Green
Write-Host "Site accessible at: http://${NasIp}:8080" -ForegroundColor Cyan
