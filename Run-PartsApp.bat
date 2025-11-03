@echo off
setlocal ENABLEDELAYEDEXPANSION
cd /d "%~dp0"

:: Choose default port
set "PORT=8082"

:: Check if python or py exists
where py >nul 2>nul && (set "PY=py") || (set "PY=python")

:: Check if port is in use
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do set "PID=%%a"
if defined PID (
  echo Port %PORT% busy, using %PORT%+1...
  set /a PORT=%PORT%+1
)

:: Start local web server
start "Parts PWA Server" /min %PY% -m http.server %PORT% --bind 127.0.0.1
timeout /t 2 >nul

:: Open in browser
set "URL=http://localhost:%PORT%/"
echo Opening %URL%
start "" "%URL%"
echo Running... Close this window to stop the server.
pause >nul
