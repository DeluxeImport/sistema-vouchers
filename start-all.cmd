@echo off
REM ============================================================
REM  Punto de arranque unico del Sistema de Vouchers (Windows)
REM  Levanta backend (puerto 3000) y frontend (puerto 5173).
REM  Abre la app en: http://localhost:5173
REM ============================================================
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

if not exist "node_modules" (
  echo Instalando dependencias por primera vez...
  call npm run install:all
)

echo.
echo  Sistema de Vouchers ->  http://localhost:5173
echo  (Ctrl+C para detener)
echo.
call npm run dev
