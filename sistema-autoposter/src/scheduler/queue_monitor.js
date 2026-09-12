/**
 * 🔄 Monitor de Fila de Criativos & Agendador Autônomo
 * Gerencia disparos automáticos nos horários configurados (11:00 am e 18:30 pm).
 * Processa os criativos por ordem sequencial numérica estrita (ex: 1.png, 2.png, 3.png...).
 */

const fs = require('fs');
const path = require('path');
const { generateCaption } = require('../ai/caption_generator');
const { getPublicUrlForLocalImage } = require('../utils/image_uploader');
const { sendApprovalRequest } = require('../bot/telegram_approval_bot');

const PENDING_FILE = path.join(__dirname, '../../logs/pending_posts.json');
const EXECUTED_SLOTS_FILE = path.join(__dirname, '../../logs/executed_slots.json');

/**
 * Carrega histórico de slots executados no dia
 */
function loadExecutedSlots() {
  try {
    if (fs.existsSync(EXECUTED_SLOTS_FILE)) {
      return JSON.parse(fs.readFileSync(EXECUTED_SLOTS_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

/**
 * Salva histórico de slots executados
 */
function saveExecutedSlots(data) {
  try {
    const dir = path.dirname(EXECUTED_SLOTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(EXECUTED_SLOTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

/**
 * Retorna data atual no formato YYYY-MM-DD
 */
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna hora atual no formato HH:mm
 */
function getCurrentTimeString() {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Extrai o número ordinal/sequencial do nome do arquivo (ex: '1.png' -> 1, '14.jpg' -> 14, 'post_2.png' -> 2)
 */
function extractImageSequenceNumber(filename) {
  const match = filename.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : Infinity;
}

/**
 * Ordena lista de arquivos de mídia por ordem sequencial numérica estrita
 */
function sortMediaFilesSequentially(files) {
  return files.sort((a, b) => {
    const numA = extractImageSequenceNumber(a);
    const numB = extractImageSequenceNumber(b);
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Verifica se uma mídia específica já está na fila ativa
 */
function isAlreadyQueued(mediaPath) {
  try {
    if (fs.existsSync(PENDING_FILE)) {
      const data = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
      return Object.values(data).some(post => post.mediaPath === mediaPath);
    }
  } catch (_) {}
  return false;
}

/**
 * Verifica se já existe um post aguardando aprovação para este cliente
 */
function hasPendingPostForClient(clientKey) {
  try {
    if (fs.existsSync(PENDING_FILE)) {
      const data = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
      return Object.values(data).some(post => post.clientKey === clientKey);
    }
  } catch (_) {}
  return false;
}

/**
 * Processa o próximo criativo sequencial da pasta de um cliente
 */
async function processClientQueue(clientKey, clientConfig, triggerReason = 'Horário Agendado') {
  let folderPath = path.join(__dirname, '../..', clientConfig.folder);

  // Fallback caso a pasta esteja na raiz de clientes/
  if (!fs.existsSync(folderPath)) {
    const altFolder = path.join(__dirname, '../../../clientes', clientConfig.name, 'criativos');
    if (fs.existsSync(altFolder)) {
      folderPath = altFolder;
    } else {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`[Queue Monitor] Pasta criada para o cliente ${clientConfig.name}: ${folderPath}`);
      return false;
    }
  }

  // Se o cliente já tem um post aguardando aprovação no Telegram, aguarda decisão antes de enviar o próximo
  if (hasPendingPostForClient(clientKey)) {
    console.log(`[Queue Monitor] [${clientConfig.name}] Já possui um criativo aguardando decisão no Telegram. Próximo disparo ocorrerá após a aprovação.`);
    return false;
  }

  const files = fs.readdirSync(folderPath);
  const mediaFiles = files.filter(f => /\.(jpg|jpeg|png|webp|mp4)$/i.test(f));

  if (mediaFiles.length === 0) {
    console.log(`[Queue Monitor] [${clientConfig.name}] Nenhum criativo disponível na fila (${clientConfig.folder}).`);
    return false;
  }

  // Ordenação sequencial numérica estrita
  sortMediaFilesSequentially(mediaFiles);

  console.log(`\n📋 [Sequência Detectada - ${clientConfig.name}]: ${mediaFiles.slice(0, 5).join(' -> ')}${mediaFiles.length > 5 ? ` (+${mediaFiles.length - 5} imagens na fila)` : ''}`);

  for (const mediaFile of mediaFiles) {
    const mediaPath = path.join(folderPath, mediaFile);

    // Pular se já está na fila de pendentes
    if (isAlreadyQueued(mediaPath)) {
      continue;
    }

    const seqNum = extractImageSequenceNumber(mediaFile);
    console.log(`\n🚀 [${triggerReason}] Disparando criativo #${seqNum !== Infinity ? seqNum : 'seq'} para [${clientConfig.name}]: ${mediaFile}`);

    // Gerar URL pública real da imagem física local
    const mediaUrl = await getPublicUrlForLocalImage(mediaPath);

    if (!mediaUrl) {
      console.error(`[Queue Monitor] ❌ Falha ao hospedar ${mediaFile}. Pulando este arquivo.`);
      continue;
    }

    // Verificar se existe um arquivo .txt correspondente com legenda/instruções personalizadas
    const baseName = path.basename(mediaFile, path.extname(mediaFile));
    const txtPath = path.join(folderPath, `${baseName}.txt`);
    let customInstructions = '';

    if (fs.existsSync(txtPath)) {
      customInstructions = fs.readFileSync(txtPath, 'utf8').trim();
      console.log(`📄 Legenda pré-definida encontrada em ${baseName}.txt`);
    }

    // Gerar ou formatar a legenda com IA
    const caption = await generateCaption({
      clientName: clientConfig.name,
      brandTone: clientConfig.brand_tone,
      defaultHashtags: clientConfig.default_hashtags,
      customInstructions,
      mediaFileName: mediaFile
    });

    const postId = `post_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const postData = {
      id: postId,
      clientKey,
      clientConfig,
      mediaPath,
      mediaUrl,
      txtPath: fs.existsSync(txtPath) ? txtPath : null,
      caption,
      targetPlatforms: clientConfig.default_platforms || ['instagram']
    };

    // Enviar solicitação de aprovação com imagem para o Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    await sendApprovalRequest({ botToken, chatId, postData });

    // Envia apenas o próximo da fila por vez para respeitar o agendamento
    return true;
  }

  return false;
}

/**
 * Função principal de verificação da fila com base nos horários agendados (11:00 e 18:30)
 */
async function checkQueue(config, forceNow = false) {
  const currentTime = getCurrentTimeString();
  const today = getTodayString();
  const executedData = loadExecutedSlots();
  if (!executedData[today]) executedData[today] = {};

  const clients = config.clients || {};
  const defaultSlots = config.default_schedule_slots || ['11:00', '18:30'];

  for (const [clientKey, clientConfig] of Object.entries(clients)) {
    const slots = clientConfig.schedule_slots || defaultSlots;
    const clientExecuted = executedData[today][clientKey] || [];

    if (forceNow) {
      console.log(`[Queue Monitor] ⚡ Execução manual imediata disparada para [${clientConfig.name}]...`);
      await processClientQueue(clientKey, clientConfig, 'Disparo Manual');
      continue;
    }

    // Verifica se o minuto atual corresponde a algum slot configurado (ex: 11:00 ou 18:30)
    if (slots.includes(currentTime)) {
      if (!clientExecuted.includes(currentTime)) {
        console.log(`\n⏰ [ALERTA DE HORÁRIO] Slot atingido: ${currentTime} para ${clientConfig.name}!`);
        const processed = await processClientQueue(clientKey, clientConfig, `Slot das ${currentTime}`);
        
        // Marca como executado hoje para evitar disparos repetidos no mesmo minuto
        clientExecuted.push(currentTime);
        executedData[today][clientKey] = clientExecuted;
        saveExecutedSlots(executedData);
      }
    }
  }
}

/**
 * Inicia o agendador autônomo com verificação contínua
 */
function startMonitoring(config, intervalMinutes = 1) {
  const isForceNow = process.argv.includes('--now') || process.env.FORCE_DISPATCH === 'true';
  const defaultSlots = config.default_schedule_slots || ['11:00', '18:30'];

  console.log('---------------------------------------------------------------');
  console.log('🕒 AGENDADOR AUTÔNOMO DE POSTAGENS PROGRAMADAS');
  console.log(`⏰ Horários Fixos de Disparo: ${defaultSlots.join(' e ')}`);
  console.log(`📍 Horário Atual do Sistema: ${getCurrentTimeString()}`);
  console.log(`🔢 Ordenação de Mídia: Sequencial Numérica Estrita (1.png, 2.png, 3.png...)`);
  console.log(`⏱️ Frequência de Checagem: A cada ${intervalMinutes} minuto(s)`);
  if (isForceNow) {
    console.log('⚡ Modo Forçar Disparo Agora (--now): ATIVADO');
  }
  console.log('---------------------------------------------------------------\n');

  // Execução na inicialização: se for --now dispara imediatamente, senão verifica slot
  checkQueue(config, isForceNow);

  // Intervalo a cada 1 minuto (60.000ms) para sincronizar precisamente com os minutos 11:00 e 18:30
  const ms = Math.max(1, intervalMinutes) * 60 * 1000;
  return setInterval(() => checkQueue(config, false), ms);
}

module.exports = { 
  checkQueue, 
  startMonitoring, 
  sortMediaFilesSequentially, 
  extractImageSequenceNumber, 
  processClientQueue 
};
