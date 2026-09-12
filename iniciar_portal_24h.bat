@echo off
title Iniciando Portal de Transparencia 24h
echo ====================================================
echo   INICIANDO PORTAL DE TRANSPARENCIA 24/7
echo ====================================================
cd /d "%~dp0"

powershell -WindowStyle Hidden -Command "Start-Process node -ArgumentList 'keep_tunnel_alive.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"

echo [OK] Monitor 24/7 iniciado em segundo plano!
echo O link estara disponivel continuamente em PORTAL_TRANSPARENCIA_LINK.txt
timeout /t 3 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 4 >nul
exit

