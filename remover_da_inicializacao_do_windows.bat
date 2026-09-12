@echo off
title Remover do Inicio do Windows
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_DIR%\Portal_Transparencia_24h.lnk"

if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%"
    echo [OK] Inicializacao automatica removida com sucesso.
) else (
    echo O atalho nao estava configurado.
)
timeout /t 4 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 5 >nul
exit
