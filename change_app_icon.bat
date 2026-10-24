@echo off
title Ramya AI — App Icon Changer
color 0b
echo ============================================================
echo        RAMYA AI — CHANGE APP ICON TOOL
echo ============================================================
echo.
echo Drop your custom image as "icon.png" in this root folder,
echo or drag and drop your image file onto this script window!
echo.
cd /d "%~dp0"

if "%~1"=="" (
    python scripts\set_icon.py
) else (
    python scripts\set_icon.py "%~1"
)

echo.
echo ============================================================
echo Icon update complete!
echo To rebuild the Android APK with your new icon, run:
echo    cd apps\android ^&^& gradlew.bat assembleDebug
echo ============================================================
echo.
pause
