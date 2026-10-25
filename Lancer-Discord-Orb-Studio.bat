@echo off
title Discord Orb Studio Launcher
chcp 65001 >nul
set "ELECTRON_RUN_AS_NODE="
cd /d "%~dp0"

echo ========================================================
echo        DISCORD ORB STUDIO — PRO v3.3
echo        Autonomous Quest & Heartbeat Automation
echo ========================================================
echo.

if exist "desktop-app\node_modules" (
    echo [OK] Lancement de Discord Orb Studio (dernière version)...
    cd desktop-app
    start "" npm start
    exit /b 0
)

if exist "dist\Discord Orb Studio.exe" (
    echo [OK] Lancement du binaire autonome portable...
    start "" "dist\Discord Orb Studio.exe"
    exit /b 0
)

echo [!] Installation des dependances...
cd desktop-app
call npm install
start "" npm start
exit /b 0
