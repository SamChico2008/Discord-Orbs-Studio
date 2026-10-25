@echo off
title Simulateur de Jeux Quetes Discord
echo ========================================================
echo   SIMULATEUR DE JEUX POUR QUETES DISCORD
echo ========================================================
echo.
echo Lancement des processus de jeu fictifs en arriere-plan...
echo Discord Desktop detecte automatiquement les jeux !
echo.

cd /d "%~dp0"
start "" RobloxPlayerBeta.exe 960
start "" snap.exe 960
start "" albion-online.exe 960
start "" wwm.exe 960
start "" dd2.exe 960

echo [OK] 5 jeux lances en arriere-plan pendant 16 minutes :
echo   - Roblox (Superstar Baseball)
echo   - Marvel Snap
echo   - Albion Online
echo   - Where Winds Meet
echo   - Dragon's Dogma 2
echo.
echo Laissez Discord ouvert sur votre PC, vos quetes progressent !
echo Cette fenetre se fermera automatiquement dans 16 minutes.
timeout /t 960
