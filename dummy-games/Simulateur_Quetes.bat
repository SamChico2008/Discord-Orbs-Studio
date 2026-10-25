@echo off
title Discord Quest Simulator
echo ========================================================
echo   DISCORD QUEST GAME SIMULATOR
echo ========================================================
echo.
echo Launching simulated game processes in the background...
echo Discord Desktop will automatically detect the game presence!
echo.

cd /d "%~dp0"
start "" RobloxPlayerBeta.exe 960
start "" snap.exe 960
start "" albion-online.exe 960
start "" wwm.exe 960
start "" dd2.exe 960

echo [OK] 5 games running in the background for 16 minutes:
echo   - Roblox (Superstar Baseball)
echo   - Marvel Snap
echo   - Albion Online
echo   - Where Winds Meet
echo   - Dragon's Dogma 2
echo.
echo Keep Discord open on your PC, your quests are progressing!
echo This window will close automatically in 16 minutes.
timeout /t 960
