@echo off
setlocal
set ROOT_DIR=%~dp0

echo ==> [1/3] Building React 19 + HeroUI Frontend...
cd /d "%ROOT_DIR%frontend"
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Frontend build failed!
    exit /b %ERRORLEVEL%
)

echo ==> [2/3] Syncing dist to backend...
if not exist "%ROOT_DIR%backend\dist" mkdir "%ROOT_DIR%backend\dist"
robocopy "%ROOT_DIR%frontend\dist" "%ROOT_DIR%backend\dist" /MIR /NJH /NJS /NDL /NC /NS >nul
if %ERRORLEVEL% GEQ 8 (
    echo Syncing dist failed!
    exit /b %ERRORLEVEL%
)

echo ==> [3/3] Compiling Go Single Binary...
cd /d "%ROOT_DIR%backend"
go build -ldflags="-s -w" -o mail-server.exe .
if %ERRORLEVEL% NEQ 0 (
    echo Backend build failed!
    exit /b %ERRORLEVEL%
)

cd /d "%ROOT_DIR%"
echo.
echo ========================================================
echo [SUCCESS] Single Binary created: backend\mail-server.exe
echo Run with: .\backend\mail-server.exe
echo ========================================================
endlocal
