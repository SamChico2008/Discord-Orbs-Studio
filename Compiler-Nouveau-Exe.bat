@echo off
title Build Executable - Discord Orb Studio
chcp 65001 >nul
set "ELECTRON_RUN_AS_NODE="
cd /d "%~dp0\desktop-app"

echo ========================================================
echo        BUILDING DISCORD ORB STUDIO EXECUTABLE
echo ========================================================
echo.
echo Building package with electron-builder...
echo.

call npm run build

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo  [SUCCESS] Package generated successfully!
    echo  Output folder: dist\
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
    echo [ERROR] Build failed.
)

pause
