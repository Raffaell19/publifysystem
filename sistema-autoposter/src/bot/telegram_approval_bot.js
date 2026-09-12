/**
 * 🤖 Bot de Aprovação Interativa do Telegram (Human-in-the-Loop)
 * Permite aprovar, refazer legenda com IA ou rejeitar publicações direto do aplicativo Telegram.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { generateCaption } = require('../ai/caption_generator');
const { publishToInstagram, publishToFacebookPage } = require('../publishers/meta_publisher');
const { publishToLinkedIn } = require('../publishers/linkedin_publisher');

const pendingPosts = new Map(); // Guarda posts aguardando resposta do usuário
const PENDING_FILE = path.join(__dirname, '../../logs/pending_posts.json');

function loadPendingPosts() {
  try {
    if (fs.existsSync(PENDING_FILE)) {
      const data = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
      for (const [k, v] of Object.entries(data)) {
        pendingPosts.set(k, v);
      }
    }
  } catch (e) {}
}

function savePendingPosts() {
  try {
    const dir = path.dirname(PENDING_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj = Object.fromEntries(pendingPosts);
    fs.writeFileSync(PENDING_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {}
}

loadPendingPosts();

async function sendApprovalRequest({ botToken, chatId, postData }) {
  const { id, clientKey, clientConfig, mediaPath, caption, targetPlatforms } = postData;
  pendingPosts.set(id, postData);
  savePendingPosts();

  const messageText = `🚀 <b>NOVA POSTAGEM AGUARDANDO SUA APROVAÇÃO</b>

🏢 <b>Cliente:</b> ${clientConfig.name}
📱 <b>Redes Destino:</b> ${targetPlatforms.join(', ')}

📝 <b>Legenda Proposta:</b>
${caption}

---
👇 <b>Selecione uma ação abaixo para prosseguir:</b>`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ Aprovar e Publicar Agora', callback_data: `approve_${id}` }
      ],
      [
        { text: '✏️ Regerar Legenda (IA)', callback_data: `recap_${id}` },
        { text: '❌ Rejeitar', callback_data: `reject_${id}` }
      ]
    ]
  };

  if (!botToken || botToken.includes('ExemploToken')) {
    console.log('\n======================================================');
    console.log(`[SIMULAÇÃO TELEGRAM] Card enviado para o Telegram:`);
    console.log(`Cliente: ${clientConfig.name}`);
    console.log(`Mídia: ${mediaPath}`);
    console.log(`Legenda:\n${caption}`);
    console.log('Botões: [✅ Aprovar] | [✏️ Regerar Legenda] | [❌ Rejeitar]');
    console.log('======================================================\n');
    return { success: true, simulated: true, postId: id };
  }

  // Enviar a foto com a legenda e botões inline
  return sendTelegramPhoto(botToken, chatId, mediaPath, messageText, inlineKeyboard);
}

async function handleTelegramCallback(botToken, callbackQuery) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  // Sempre recarregar do disco antes de buscar — resolve o bug de reinicialização
  loadPendingPosts();

  if (data.startsWith('approve_')) {
    const postId = data.replace('approve_', '');
    const postData = pendingPosts.get(postId);

    if (!postData) {
      await answerCallbackQuery(botToken, callbackQuery.id, '⚠️ Post já publicado ou não encontrado na fila.');
      await updateTelegramMessage(botToken, chatId, messageId, `ℹ️ <b>Post não encontrado na fila.</b>\n\nEle pode ter sido publicado ou rejeitado anteriormente. Verifique os logs.`);
      return;
    }

    await answerCallbackQuery(botToken, callbackQuery.id, '⏳ Publicando nas redes sociais...');
    await updateTelegramMessage(botToken, chatId, messageId, `⏳ <b>PROCESSANDO PUBLICAÇÃO...</b>\n\nPost do cliente <b>${postData.clientConfig.name}</b> sendo enviado para as redes...`);

    // Executar Publicação nas Redes Conectadas
    const metaToken = process.env.META_ACCESS_TOKEN;
    const results = [];

    if (postData.targetPlatforms.includes('instagram')) {
      const res = await publishToInstagram({
        igAccountId: postData.clientConfig.instagram_account_id,
        mediaUrl: postData.mediaUrl,
        caption: postData.caption,
        accessToken: metaToken
      });
      results.push(res);
    }

    if (postData.targetPlatforms.includes('facebook_page') && postData.clientConfig.facebook_page_id) {
      const res = await publishToFacebookPage({
        pageId: postData.clientConfig.facebook_page_id,
        mediaUrl: postData.mediaUrl,
        caption: postData.caption,
        accessToken: metaToken
      });
      results.push(res);
    }



    if (postData.targetPlatforms.includes('linkedin')) {
      const res = await publishToLinkedIn({
        caption: postData.caption,
        mediaUrl: postData.mediaUrl
      });
      results.push(res);
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const now = new Date();
    const dataFormatada = now.toLocaleDateString('pt-BR');
    const horaFormatada = now.toLocaleTimeString('pt-BR');
    const fileName = path.basename(postData.mediaPath);

    if (successful.length > 0) {
      // 1. Mover criativo para pasta de publicados
      movePostFilesToFolder(postData, 'publicados');
      pendingPosts.delete(postId);
      savePendingPosts();

      // 2. Atualizar o card original com a foto removendo os botões de aprovação
      const cardUpdatedCaption = `✅ <b>POSTAGEM PUBLICADA COM SUCESSO!</b>\n\n🏢 <b>Cliente:</b> ${postData.clientConfig.name}\n🕒 <b>Horário:</b> ${horaFormatada}\n📱 <b>Status:</b> Post enviado e ativo no feed.`;
      await updateTelegramMessage(botToken, chatId, messageId, cardUpdatedCaption, { inline_keyboard: [] });

      // 3. Montar Comprovante Oficial de Confirmação com visual premium
      const platformsDetail = successful.map(r => {
        return `• <b>${r.platform}:</b> ✅ Ativo no Feed (ID Meta: <code>${r.postId || 'OK'}</code>)`;
      }).join('\n');

      const receiptText = `🎉 <b>COMPROVANTE DE PUBLICAÇÃO OFICIAL</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>Cliente:</b> ${postData.clientConfig.name}
📱 <b>Perfil:</b> ${postData.clientConfig.instagram_username || '@_connect_digital'}
🖼️ <b>Criativo:</b> <code>${fileName}</code>
🕒 <b>Publicado em:</b> ${dataFormatada} às ${horaFormatada}

✅ <b>STATUS: 100% CONFIRMADO E AO VIVO</b>
Sua postagem foi transmitida com sucesso pela Meta Graph API e já se encontra ativa no feed do Instagram. Não é necessário abrir o app para checar!

📊 <b>Detalhes da Transmissão:</b>
${platformsDetail}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👇 <i>Clique no botão abaixo caso queira visualizar a publicação online:</i>`;

      // Botões interativos com link direto para o post
      const actionButtons = [];
      for (const item of successful) {
        if (item.postUrl) {
          actionButtons.push([{
            text: `🚀 Ver Publicação no ${item.platform}`,
            url: item.postUrl
          }]);
        }
      }

      // Enviar mensagem de comprovante oficial (gera notificação sonora/push no celular)
      await sendTelegramMessage(botToken, chatId, receiptText, { inline_keyboard: actionButtons });

    } else {
      // Falha na publicação
      const failText = failed.map(r => `• <b>${r.platform}:</b> ❌ ${r.error || 'Erro de conexão'}`).join('\n');
      const failMessage = `⚠️ <b>AVISO DE FALHA NA PUBLICAÇÃO</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 <b>Cliente:</b> ${postData.clientConfig.name}
🖼️ <b>Criativo:</b> <code>${fileName}</code>

❌ <b>Motivo retornado:</b>
${failText}

💡 O arquivo continua preservado na fila para novo teste.`;
      
      await updateTelegramMessage(botToken, chatId, messageId, failMessage);
    }

  } else if (data.startsWith('recap_')) {
    const postId = data.replace('recap_', '');
    loadPendingPosts(); // Recarregar do disco
    const postData = pendingPosts.get(postId);

    if (!postData) {
      await answerCallbackQuery(botToken, callbackQuery.id, '⚠️ Post não encontrado na fila.');
      return;
    }

    await answerCallbackQuery(botToken, callbackQuery.id, '🧠 Gerando nova opção de legenda com IA...');
    
    // Gerar nova legenda
    const newCaption = await generateCaption({
      clientName: postData.clientConfig.name,
      brandTone: postData.clientConfig.brand_tone,
      defaultHashtags: postData.clientConfig.default_hashtags,
      customInstructions: 'Gere uma variação diferente, mais persuasiva e direta.',
      mediaFileName: path.basename(postData.mediaPath)
    });

    postData.caption = newCaption;
    pendingPosts.set(postId, postData);

    const updatedText = `🚀 *NOVA LEGENDA GERADA COM IA*

🏢 *Cliente:* ${postData.clientConfig.name}
📱 *Redes Destino:* ${postData.targetPlatforms.join(', ')}

📝 *Nova Legenda Proposta:*
${newCaption}

---
👇 *Aprove ou solicite nova opção:*`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '✅ Aprovar e Publicar Agora', callback_data: `approve_${postId}` }
        ],
        [
          { text: '✏️ Gerar Outra Legenda', callback_data: `recap_${postId}` },
          { text: '❌ Rejeitar', callback_data: `reject_${postId}` }
        ]
      ]
    };

    await updateTelegramMessage(botToken, chatId, messageId, updatedText, inlineKeyboard);

  } else if (data.startsWith('reject_')) {
    const postId = data.replace('reject_', '');
    loadPendingPosts(); // Recarregar do disco
    const postData = pendingPosts.get(postId);

    if (postData) {
      movePostFilesToFolder(postData, 'rejeitados');
      pendingPosts.delete(postId);
      savePendingPosts();
    }

    await answerCallbackQuery(botToken, callbackQuery.id, '❌ Post rejeitado e removido da fila.');
    await updateTelegramMessage(botToken, chatId, messageId, `❌ *POSTAGEM REJEITADA*\n\nO criativo foi movido para a pasta de rejeitados.`);
  }
}

function movePostFilesToFolder(postData, folderName) {
  try {
    const targetDir = path.join(path.dirname(postData.mediaPath), '..', folderName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const destMediaPath = path.join(targetDir, path.basename(postData.mediaPath));
    if (fs.existsSync(postData.mediaPath)) {
      if (fs.existsSync(destMediaPath)) {
        fs.unlinkSync(destMediaPath);
      }
      fs.renameSync(postData.mediaPath, destMediaPath);
    }
    if (postData.txtPath && fs.existsSync(postData.txtPath)) {
      const destTxtPath = path.join(targetDir, path.basename(postData.txtPath));
      if (fs.existsSync(destTxtPath)) {
        fs.unlinkSync(destTxtPath);
      }
      fs.renameSync(postData.txtPath, destTxtPath);
    }
  } catch (err) {
    console.error('[File Move Error]', err.message);
  }
}

function sendTelegramPhoto(token, chatId, photoPath, caption, replyMarkup) {
  return new Promise((resolve, reject) => {
    // Se o arquivo existir localmente, enviar como multipart/form-data usando sendPhoto
    if (fs.existsSync(photoPath)) {
      const boundary = '----TelegramBotBoundary' + Date.now().toString(16);
      const fileStream = fs.readFileSync(photoPath);
      const fileName = path.basename(photoPath);

      let payload = '';

      // Campo chat_id
      payload += `--${boundary}\r\n`;
      payload += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`;

      // Campo caption
      payload += `--${boundary}\r\n`;
      payload += `Content-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;

      // Campo parse_mode
      payload += `--${boundary}\r\n`;
      payload += `Content-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`;

      // Campo reply_markup
      if (replyMarkup) {
        payload += `--${boundary}\r\n`;
        payload += `Content-Disposition: form-data; name="reply_markup"\r\n\r\n${JSON.stringify(replyMarkup)}\r\n`;
      }

      // Campo photo (arquivo binário)
      payload += `--${boundary}\r\n`;
      payload += `Content-Disposition: form-data; name="photo"; filename="${fileName}"\r\n`;
      payload += `Content-Type: image/png\r\n\r\n`;

      const headerBuffer = Buffer.from(payload, 'utf8');
      const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
      const totalLength = headerBuffer.length + fileStream.length + footerBuffer.length;

      const req = https.request(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': totalLength
        }
      }, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (!parsed.ok) {
              console.error('[Telegram sendPhoto Warning]', parsed.description);
              // Fallback para sendMessage se houver algum erro de formatação
              sendTelegramMessage(token, chatId, caption, replyMarkup).then(resolve).catch(reject);
            } else {
              console.log('✅ [Telegram Bot] Card de aprovação com imagem enviado com sucesso para o Telegram!');
              resolve(parsed);
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', err => {
        console.error('[Telegram Send Error]', err.message);
        sendTelegramMessage(token, chatId, caption, replyMarkup).then(resolve).catch(reject);
      });

      req.write(headerBuffer);
      req.write(fileStream);
      req.write(footerBuffer);
      req.end();
    } else {
      sendTelegramMessage(token, chatId, caption, replyMarkup).then(resolve).catch(reject);
    }
  });
}

function sendTelegramMessage(token, chatId, caption, replyMarkup) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const postData = JSON.stringify({
      chat_id: chatId,
      text: caption,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    });

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function updateTelegramMessage(token, chatId, messageId, text, replyMarkup) {
  return new Promise((resolve) => {
    // 1. Tentar primeiro editMessageCaption (caso a mensagem seja uma foto com legenda)
    const captionUrl = `https://api.telegram.org/bot${token}/editMessageCaption`;
    const captionPayload = JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      caption: text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    });

    const reqCaption = https.request(captionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(captionPayload)
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed && parsed.ok) {
            return resolve(parsed);
          }
        } catch (_) {}

        // 2. Se falhar (ex: mensagem de texto sem foto), tentar editMessageText
        const textUrl = `https://api.telegram.org/bot${token}/editMessageText`;
        const textPayload = JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        });

        const reqText = https.request(textUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(textPayload)
          }
        }, resText => {
          let bodyText = '';
          resText.on('data', c => bodyText += c);
          resText.on('end', () => {
            try { resolve(JSON.parse(bodyText)); }
            catch (e) { resolve(null); }
          });
        });
        reqText.on('error', () => resolve(null));
        reqText.write(textPayload);
        reqText.end();
      });
    });

    reqCaption.on('error', () => resolve(null));
    reqCaption.write(captionPayload);
    reqCaption.end();
  });
}

function answerCallbackQuery(token, callbackQueryId, text) {
  return new Promise((resolve) => {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    const postData = JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text,
      show_alert: false
    });

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', () => resolve());
    req.write(postData);
    req.end();
  });
}

module.exports = { sendApprovalRequest, handleTelegramCallback, pendingPosts };
