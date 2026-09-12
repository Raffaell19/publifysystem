@echo off
title Adicionar ao Inicio do Windows
echo ====================================================
echo   CONFIGURANDO INICIALIZACAO AUTOMATICA DO PORTAL
echo ====================================================
cd /d "%~dp0"

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_FILE=%~dp0iniciar_portal_silencioso.vbs"
set "SHORTCUT_PATH=%STARTUP_DIR%\Portal_Transparencia_24h.lnk"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%VBS_FILE%\"'; $s.WorkingDirectory = '%~dp0'; $s.WindowStyle = 7; $s.Save()"

echo.
echo [OK] Atalho criado na pasta de Inicializacao do Windows!
echo O portal agora iniciara sozinho em segundo plano sempre que o computador ligar.
echo.
timeout /t 5 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 6 >nul
exit
