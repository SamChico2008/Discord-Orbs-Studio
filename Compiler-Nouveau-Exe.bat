@echo off
title Compilation .EXE - Discord Orb Studio
chcp 65001 >nul
set "ELECTRON_RUN_AS_NODE="
cd /d "%~dp0\desktop-app"

echo ========================================================
echo        COMPILATION DU FICHIER .EXE PORTABLE
echo ========================================================
echo.
echo Compilation en cours avec electron-builder...
echo.

call npm run build

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo  [SUCCES] Le package a ete genere avec succes !
    echo  Dossier de sortie : dist\
    echo ========================================================
    echo.
    if exist "%~dp0dist\Discord Orb Studio Setup.exe" (
        explorer.exe /select,"%~dp0dist\Discord Orb Studio Setup.exe"
    ) else if exist "%~dp0dist\Discord Orb Studio.exe" (
        explorer.exe /select,"%~dp0dist\Discord Orb Studio.exe"
    ) else (
        explorer.exe "%~dp0dist"
    )
) else (
    echo.
    echo [ERREUR] La compilation a echoue.
)

pause
