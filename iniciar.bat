@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════╗
echo  ║       Cost-Mapper V2         ║
echo  ╚══════════════════════════════╝
echo.

:: Backend
echo  [1/2] Iniciando backend (puerto 8002)...
if not exist "backend\.venv\Scripts\activate.bat" (
    start "Backend - Cost Mapper" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --reload --port 8002"
) else (
    start "Backend - Cost Mapper" cmd /k "cd /d "%~dp0backend" && call .venv\Scripts\activate && python -m uvicorn main:app --reload --port 8002"
)

:: Esperar que el backend levante
timeout /t 3 /nobreak >nul

:: Frontend
echo  [2/2] Iniciando frontend (puerto 5173)...
start "Frontend - Cost Mapper" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Esperar que el frontend levante
timeout /t 4 /nobreak >nul

:: Abrir navegador
echo  Abriendo navegador...
start "" http://localhost:5173

echo.
echo  Listo. Dos ventanas abiertas: Backend (8002) y Frontend (5173).
echo  Cerralas cuando termines de trabajar.
echo.
pause
