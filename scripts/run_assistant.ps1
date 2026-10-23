# RAMYA AI — LAUNCH SCRIPT (POWERSHELL)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   RAMYA AI — PERSONAL DESKTOP & MOBILE ASSISTANT        " -ForegroundColor Cyan
Write-Host "       'Your World. Your Voice. Your Control.'           " -ForegroundColor DarkCyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Assistant API Backend
Write-Host "`n[1/2] Starting Ramya AI Assistant Backend on port 8000..." -ForegroundColor Yellow
$backendJob = Start-Process python -ArgumentList "-m uvicorn main:app --host 127.0.0.1 --port 8000" -WorkingDirectory "c:\mern stack\mernpro\ramya\services\assistant-api" -PassThru

Start-Sleep -Seconds 2

# 2. Start Desktop Cyberpunk Command Center
Write-Host "[2/2] Starting Ramya AI Cyberpunk Command Center UI on port 5173..." -ForegroundColor Green
$desktopJob = Start-Process npm -ArgumentList "run dev -- --host 127.0.0.1 --port 5173" -WorkingDirectory "c:\mern stack\mernpro\ramya\apps\desktop" -PassThru

Write-Host "`n✓ Ramya AI is running!" -ForegroundColor Green
Write-Host "→ Backend API: http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/docs)" -ForegroundColor White
Write-Host "→ Desktop Command Center: http://127.0.0.1:5173" -ForegroundColor Cyan
Write-Host "→ Default Wake Phrase: 'Hey Ramya'" -ForegroundColor Magenta
Write-Host "`nPress Ctrl+C to stop services."
