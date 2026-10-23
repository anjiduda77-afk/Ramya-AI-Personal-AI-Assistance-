@echo off
title Ramya AI Backend Service
cd /d "%~dp0\..\services\assistant-api"
echo Starting Ramya AI Assistant Backend on http://127.0.0.1:8000...
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
