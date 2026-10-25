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
    echo [OK] Launching Discord Orb Studio (latest version)...
    cd desktop-app
    start "" npm start
    exit /b 0
)

if exist "dist\Discord Orb Studio.exe" (
    echo [OK] Launching portable standalone binary...
    start "" "dist\Discord Orb Studio.exe"
    exit /b 0
)

echo [!] Installing dependencies...
cd desktop-app
call npm install
start "" npm start
exit /b 0
