@echo off
title OmniCorp Workstation — Starting AI Server
color 0A
echo.
echo  [+] OmniCorp Global — Overworked Simulator
echo  [+] Starting Gemini AI proxy server...
echo.

:: Install dependencies if node_modules not present
if not exist "node_modules" (
    echo  [*] Installing dependencies (first run only)...
    call npm install
    echo.
)

:: Start the AI proxy server in the background
start "OmniCorp AI Server" cmd /k "node server.js"

:: Wait for server to boot
timeout /t 2 /nobreak >nul

:: Open the game in the default browser
echo  [+] Opening game in browser...
start "" "index.html"

echo.
echo  [+] Game launched! Close the "OmniCorp AI Server" window to stop AI.
echo  [+] If AI responses show "fallback", make sure the server window is open.
echo.
pause
