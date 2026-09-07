@echo off
REM DeFi Tracker launcher
REM - Auto-runs npm install on first launch (no node_modules)
REM - Forces network binding via --host so Vite prints the LAN IP
REM - Always pauses at the end so errors stay readable

cd /d "%~dp0"

if not exist "node_modules\" (
  echo node_modules not found. Running npm install first...
  echo This is a one-time step. It takes about 30-60 seconds.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo ================================
    echo npm install FAILED. Exit code: %errorlevel%
    echo ================================
    echo.
    echo Common causes:
    echo   - Node.js not installed. Install from https://nodejs.org
    echo   - No internet connection
    echo   - Corporate network blocks npm registry
    pause
    exit /b %errorlevel%
  )
  echo.
  echo npm install done.
  echo.
)

if not exist ".env.local" (
  echo WARNING: .env.local not found.
  echo The app will show a "Setup required" screen until you create it.
  echo See README.md, step 3.
  echo.
)

REM --host binds to all interfaces so Vite prints your LAN IP alongside localhost.
REM The extra -- passes the flag through npm to Vite.
call npm run dev -- --host

echo.
echo ================================
echo Server stopped. Exit code: %errorlevel%
echo ================================
pause
