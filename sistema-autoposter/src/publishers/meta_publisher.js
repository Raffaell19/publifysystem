/**
 * 📲 Módulo de Publicação Meta (Instagram & Facebook)
 * Envia fotos para o Instagram Graph API e Facebook Pages Graph API.
 */

const https = require('https');

async function publishToInstagram({ igAccountId, caption, accessToken, mediaUrl }) {
  if (!accessToken || !igAccountId) {
    return { success: false, platform: 'Instagram', error: 'Token ou IG Account ID não configurado' };
  }

  console.log(`[Instagram] Criando container de mídia com URL: ${mediaUrl}`);

  try {
    // Passo 1: Criar container de mídia
    const containerResult = await postJson(
      `https://graph.facebook.com/v20.0/${igAccountId}/media`,
      { image_url: mediaUrl, caption, access_token: accessToken }
    );

    console.log('[Instagram] Resposta do container:', JSON.stringify(containerResult));

    if (!containerResult || !containerResult.id) {
      const err = containerResult?.error?.message || JSON.stringify(containerResult);
      throw new Error(err);
    }

    // Passo 2: Aguardar processamento do container pela Meta
    console.log('[Instagram] Aguardando processamento da imagem...');
    await sleep(4000);

    // Passo 3: Publicar o container
    const publishResult = await postJson(
      `https://graph.facebook.com/v20.0/${igAccountId}/media_publish`,
      { creation_id: containerResult.id, access_token: accessToken }
    );

    console.log('[Instagram] Resposta publish:', JSON.stringify(publishResult));

    const postId = publishResult?.id || publishResult?.media_id;
    if (!postId) {
      throw new Error(publishResult?.error?.message || JSON.stringify(publishResult));
    }

    // Obter o permalink real do post no Instagram
    let postUrl = `https://www.instagram.com/p/${postId}/`;
    try {
      const mediaInfo = await getJson(`https://graph.facebook.com/v20.0/${postId}?fields=permalink&access_token=${accessToken}`);
      if (mediaInfo && mediaInfo.permalink) {
        postUrl = mediaInfo.permalink;
      }
    } catch (_) {}

    console.log(`[Instagram] ✅ Post publicado com sucesso! Link: ${postUrl}`);
    return { success: true, platform: 'Instagram', postId, postUrl };

  } catch (error) {
    console.error('[Instagram Publish Error]', error.message);
    return { success: false, platform: 'Instagram', error: error.message };
  }
}

async function publishToFacebookPage({ pageId, caption, accessToken, mediaUrl }) {
  if (!accessToken || !pageId) {
    return { success: false, platform: 'Facebook Page', error: 'Token ou Page ID não configurado' };
  }

  try {
    const result = await postJson(
      `https://graph.facebook.com/v20.0/${pageId}/photos`,
      { url: mediaUrl, caption, access_token: accessToken }
    );

    const postIdFb = result?.post_id || result?.id;
    if (!postIdFb) throw new Error(result?.error?.message || JSON.stringify(result));

    return { success: true, platform: 'Facebook Page', postId: postIdFb, postUrl: `https://facebook.com/${postIdFb}` };
  } catch (error) {
    console.error('[Facebook Publish Error]', error.message);
    return { success: false, platform: 'Facebook Page', error: error.message };
  }
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ raw: data }); }
      });
    });
    req.setTimeout(30000, () => { req.destroy(new Error('Meta API timeout')); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(null); }
      });
    });
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = { publishToInstagram, publishToFacebookPage };
