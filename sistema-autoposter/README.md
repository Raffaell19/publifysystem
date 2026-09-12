# 🤖 Sistema Autônomo de Postagens (Social AutoPoster)

> **Módulo Isolado de Publicação Automatizada com Aprovação Interativa no Telegram/WhatsApp**  
> *Mantido 100% separado do Gerenciador de Anúncios da Meta.*

---

## 🎯 O que este sistema faz?

1. **Monitora Pastas de Criativos:** Fica vigiando a pasta `criativos_fila/[nome_do_cliente]/`.
2. **Gera Legendas com IA:** Se o designer/equipe colocar apenas a imagem/vídeo, o **Google Gemini AI** escreve uma legenda persuasiva com hashtags apropriadas para a marca.
3. **Pede Aprovação no Telegram:** Envia o card com a foto, legenda e botões interativos para o seu Telegram:
   - `[✅ Aprovar e Publicar Agora]`
   - `[✏️ Regerar Legenda com IA]`
   - `[❌ Rejeitar / Pular]`
4. **Publica nas Redes Conectadas:** Ao clicar em aprovar, o sistema faz o post oficial no Instagram, Facebook Page e LinkedIn, e devolve os **links diretos das postagens** no seu chat!

---

## 📁 Estrutura de Pastas

```text
sistema-autoposter/
├── index.js                        # Ponto de entrada do serviço autônomo
├── .env.autoposter                 # Chaves de API (Telegram, Meta Graph, Gemini)
├── config/
│   └── redes_conectadas.json       # Configuração de clientes, tons de marca e IDs de páginas
├── criativos_fila/                 # DROPZONE - Onde você joga as fotos/vídeos
│   ├── connect_digital/            # Pasta da Connect Digital
│   └── gauchinho_de_deus/          # Pasta do Gauchinho de Deus
├── src/
│   ├── ai/
│   │   └── caption_generator.js    # Gerador de copies persuasivas via Gemini API
│   ├── bot/
│   │   └── telegram_approval_bot.js# Bot de botões interativos e respostas
│   ├── publishers/
│   │   ├── meta_publisher.js       # API do Instagram & Páginas Facebook
│   │   └── linkedin_publisher.js   # API de publicação do LinkedIn
│   └── scheduler/
│       └── queue_monitor.js        # Agendador e leitor da pasta de criativos
```

---

## 🚀 Como Usar

### 1️⃣ Configuração de Credenciais
Crie o arquivo `.env.autoposter` dentro da pasta `sistema-autoposter/` (com base no `.env.autoposter.example`):
```env
TELEGRAM_BOT_TOKEN=seu_token_do_botfather
TELEGRAM_CHAT_ID=seu_chat_id_no_telegram
GEMINI_API_KEY=sua_chave_gemini
META_ACCESS_TOKEN=seu_meta_user_token
```

### 2️⃣ Como Adicionar Novos Posts na Fila Sequencial
Basta colocar as imagens enumeradas sequencialmente na pasta de cada cliente:
👉 `sistema-autoposter/criativos_fila/connect_digital/1.png`
👉 `sistema-autoposter/criativos_fila/connect_digital/2.png`
👉 `sistema-autoposter/criativos_fila/connect_digital/3.png`

* O sistema lerá e publicará rigorosamente na ordem numérica (`1.png` ➔ `2.png` ➔ `3.png`...).
* Após publicado, o arquivo é movido automaticamente para `criativos_fila/publicados/`.
* *(Opcional)* Para enviar uma legenda personalizada em vez da IA, adicione o arquivo com o mesmo nome `.txt` (ex: `1.txt`).

### 3️⃣ Horários Programados de Disparo Automático
O sistema monitora e dispara nos seguintes horários oficiais:
* 🕚 **11:00 AM** (Manhã)
* 🕡 **18:30 PM** (Fim de tarde / Noite)

### 4️⃣ Iniciar o Sistema
* **Modo Agendado (Aguardando os horários 11:00 e 18:30):**
```bash
npm start
# ou: node sistema-autoposter/index.js
```
* **Modo Teste Manual (Disparar o próximo da fila imediatamente agora):**
```bash
npm run start:now
# ou: node sistema-autoposter/index.js --now
```

---

## 🛠️ Como criar o Bot do Telegram em 2 Minutos (Gratuito & Oficial)

1. Abra o aplicativo **Telegram** e pesquise por `@BotFather`.
2. Envie o comando `/newbot` e escolha o nome do seu bot (ex: `ConnectDigitalPosterBot`).
3. O BotFather vai te dar o `TELEGRAM_BOT_TOKEN` (ex: `8123456789:AAExemplo...`).
4. Para pegar o seu `TELEGRAM_CHAT_ID`, chame o bot `@userinfobot` no Telegram.
5. Cole ambos os valores no arquivo `.env.autoposter`!
