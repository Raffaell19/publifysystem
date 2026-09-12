@echo off
title Publicar Portal na Vercel (Link Definitivo 24/7)
color 0A
echo ====================================================
echo   🚀 PUBLICACAO AUTOMATICA DO PORTAL NA VERCEL
echo ====================================================
echo.
echo Este assistente vai subir o seu portal diretamente para a Vercel.
echo O link gerado sera FIXO e ficara no ar 24h por dia, sem depender
echo de tunel ou de deixar o computador ligado!
echo.
echo PASSO A PASSO RAPIDO:
echo 1. O terminal vai abrir o navegador para você confirmar o login (ex: GitHub ou Email).
echo 2. Quando o terminal perguntar "Set up and deploy?", apenas aperte ENTER (Y).
echo 3. Nas perguntas seguintes (Scope, Link existing project), aperte ENTER para tudo.
echo.
echo Pressione qualquer tecla para iniciar a publicacao...
pause >nul

cd /d "%~dp0"
echo.
echo [1/2] Executando Vercel CLI...
echo.
call npx vercel --prod

echo.
echo ====================================================
echo [2/2] CONCLUIDO!
echo ====================================================
echo.
echo Copie o link permanente que apareceu acima (ex: https://publifysystem-xxx.vercel.app/cliente)
echo e envie para seus clientes!
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
