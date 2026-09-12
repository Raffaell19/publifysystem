@echo off
title Parar Portal de Transparencia
echo ====================================================
echo   DESATIVANDO PORTAL DE TRANSPARENCIA
echo ====================================================
cd /d "%~dp0"

if exist .tunnel_monitor.pid (
  for /f "delims=" %%p in (.tunnel_monitor.pid) do (
    taskkill /F /PID %%p 2>nul
  )
  del .tunnel_monitor.pid 2>nul
)

taskkill /F /IM cloudflared.exe 2>nul

echo [OK] O portal foi retirado do ar conforme solicitado.
timeout /t 2 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 3 >nul
exit

