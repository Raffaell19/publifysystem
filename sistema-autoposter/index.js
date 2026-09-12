/**
 * 🚀 AUTOPOSTER AUTÔNOMO - ENTRY POINT PRINCIPAL
 * Sistema de publicação automatizada em redes sociais com aprovação no Telegram / WhatsApp.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { startMonitoring } = require('./src/scheduler/queue_monitor');
const { handleTelegramCallback } = require('./src/bot/telegram_approval_bot');

// 1. Carregar Variáveis de Ambiente
function loadEnv() {
  const envPath = path.join(__dirname, '.env.autoposter');
  const fallbackEnvPath = path.join(__dirname, '../.env');
  const targetEnv = fs.existsSync(envPath) ? envPath : (fs.existsSync(fallbackEnvPath) ? fallbackEnvPath : null);

  if (targetEnv) {
    const content = fs.readFileSync(targetEnv, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value.trim();
      }
    });
    console.log(`[AutoPoster] Variáveis de ambiente carregadas de: ${path.basename(targetEnv)}`);
  }
}

loadEnv();

// 2. Carregar Configuração de Redes & Clientes
const configPath = path.join(__dirname, 'config/redes_conectadas.json');
let config = {};

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error('[AutoPoster Error] Não foi possível carregar redes_conectadas.json');
  process.exit(1);
}

console.log('\n===============================================================');
console.log('🤖 SISTEMA AUTOPOSTER AUTÔNOMO DE REDES SOCIAIS INICIADO');
console.log('===============================================================');
console.log(`Clientes Monitorados: ${Object.keys(config.clients || {}).join(', ')}`);
console.log(`Telegram Bot Token: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Configurado' : '⚠️ Não configurado (Modo Simulação Ativo)'}`);
console.log(`Google Gemini AI: ${process.env.GEMINI_API_KEY ? '✅ Ativo' : '⚠️ Chave ausente (Modo Fallback)'}`);
console.log('===============================================================\n');

// 3 & 4. Iniciar Telegram e Monitoramento em sequência correta
let lastUpdateId = 0;

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (botToken && !botToken.includes('ExemploToken')) {
  // Primeiro descarta updates antigos, DEPOIS inicia monitoramento de fila
  discardOldUpdatesAndStartPolling(botToken).then(() => {
    const checkInterval = parseInt(process.env.CHECK_INTERVAL_MINUTES || '5', 10);
    startMonitoring(config, checkInterval);
  });
} else {
  const checkInterval = parseInt(process.env.CHECK_INTERVAL_MINUTES || '5', 10);
  startMonitoring(config, checkInterval);
}

// Funções Auxiliares de Long Polling do Telegram
async function discardOldUpdatesAndStartPolling(token) {
  console.log('[Telegram Bot] Descartando updates antigos acumulados...');
  try {
    // Pegar todos os updates com offset=-1 para obter o último update_id
    const data = await makeGetRequest(`https://api.telegram.org/bot${token}/getUpdates?offset=-1&timeout=1`);
    if (data && data.ok && data.result && data.result.length > 0) {
      const lastId = data.result[data.result.length - 1].update_id;
      lastUpdateId = lastId; // Marcar todos como lidos — nenhum será reprocessado
      // Confirmar descarte para o Telegram
      await makeGetRequest(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=1`);
      console.log(`[Telegram Bot] ${data.result.length} update(s) antigos descartados. Último ID: ${lastUpdateId}`);
    } else {
      console.log('[Telegram Bot] Nenhum update antigo encontrado.');
    }
  } catch (e) {
    console.error('[Telegram Bot] Erro ao descartar updates:', e.message);
  }
  console.log('[Telegram Bot] ✅ Escutando APENAS novos cliques de aprovação...');
  startTelegramPolling(token);
}

function startTelegramPolling(token) {
  async function poll() {
    try {
      // Long polling: aguarda até 25s por novos updates
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=25`;
      const data = await makeGetRequest(url, 30000);

      if (data && data.ok && data.result) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          if (update.callback_query) {
            const cbData = update.callback_query.data;
            console.log(`\n🔘 [Telegram Bot] Clique recebido: ${cbData}`);
            // Processar em paralelo, sem bloquear o próximo poll
            handleTelegramCallback(token, update.callback_query).catch(e => {
              console.error('[Callback Error]', e.message);
            });
          }
        }
      }
    } catch (e) {
      console.error('[Polling Error]', e.message);
      await new Promise(r => setTimeout(r, 2000)); // Aguarda 2s antes de tentar novamente
    }
    // Loop contínuo
    poll();
  }

  poll();
}


function makeGetRequest(url, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

