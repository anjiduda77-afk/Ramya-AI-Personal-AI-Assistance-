@echo off
title Ramya AI — Windows Launcher
color 0b
echo ============================================================
echo      RAMYA AI -- PERSONAL AI ASSISTANT FOR WINDOWS
echo          "Your World. Your Voice. Your Control."
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/2] Launching Assistant Backend API on port 8000...
start "Ramya AI Backend" /min cmd /c "cd /d services\assistant-api && python -m uvicorn main:app --host 127.0.0.1 --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Cyberpunk Command Center UI on port 5173...
start "Ramya AI Desktop UI" /min cmd /c "cd /d apps\desktop && npm run dev -- --host 127.0.0.1 --port 5173"

timeout /t 3 /nobreak >nul

echo.
echo Opening Ramya AI in your browser...
start http://127.0.0.1:5173/

echo.
echo ============================================================
echo  Ramya AI is now running!
echo  - Desktop UI:   http://127.0.0.1:5173/
echo  - Backend API:  http://127.0.0.1:8000/docs
echo  - Wake Word:    "Hey Ramya"
echo ============================================================
echo.
echo Leave this window open or minimize it. Press any key to exit launcher.
pause >nul
