/**
 * 🌐 Módulo de Upload de Imagens para URLs Públicas
 * Converte arquivos locais (PNG, JPG, WebP) em JPEG e hospeda com URL pública direta
 * 100% compatível com a Meta Graph API (Instagram & Facebook).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

/**
 * Converte a imagem local para buffer JPEG padronizado
 */
async function toJpegBuffer(localPath) {
  const ext = path.extname(localPath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') {
    return fs.readFileSync(localPath);
  }
  return await sharp(localPath).jpeg({ quality: 90 }).toBuffer();
}

/**
 * Faz upload do buffer JPEG para serviço público de hospedagem direta (Catbox)
 * Retorna a URL direta HTTPS aceita pelo crawler da Meta (facebookexternalhit)
 */
function uploadBufferToCatbox(jpegBuffer, originalFileName) {
  return new Promise((resolve, reject) => {
    const boundary = '----CatboxBoundary' + Date.now().toString(16);
    const safeName = path.basename(originalFileName, path.extname(originalFileName)) + '.jpg';

    const payloadHeader =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="fileToUpload"; filename="${safeName}"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`;

    const headerBuffer = Buffer.from(payloadHeader, 'utf8');
    const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const totalLength = headerBuffer.length + jpegBuffer.length + footerBuffer.length;

    const req = https.request('https://catbox.moe/user/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalLength,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const url = data.trim();
        if (res.statusCode === 200 && url.startsWith('http')) {
          resolve(url);
        } else {
          reject(new Error(`Falha no upload (Status ${res.statusCode}): ${data}`));
        }
      });
    });

    req.setTimeout(30000, () => {
      req.destroy(new Error('Timeout no upload da imagem para o servidor'));
    });

    req.on('error', reject);
    req.write(headerBuffer);
    req.write(jpegBuffer);
    req.write(footerBuffer);
    req.end();
  });
}

/**
 * Ponto de entrada: Converte a imagem local e obtém URL pública direta
 */
async function getPublicUrlForLocalImage(localPath) {
  if (!localPath || !fs.existsSync(localPath)) {
    console.error('[Image Uploader] Arquivo local não encontrado:', localPath);
    return null;
  }

  const fileName = path.basename(localPath);

  try {
    console.log(`[Image Uploader] Processando mídia física local: ${fileName}...`);
    const jpegBuffer = await toJpegBuffer(localPath);
    console.log(`[Image Uploader] Imagem convertida para JPEG (${Math.round(jpegBuffer.length / 1024)} KB). Enviando para servidor público...`);

    const publicUrl = await uploadBufferToCatbox(jpegBuffer, fileName);
    console.log(`📸 [Image Uploader] ✅ URL pública direta gerada com sucesso: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error(`[Image Uploader Error] Falha ao hospedar ${fileName}:`, error.message);
    return null;
  }
}

module.exports = { getPublicUrlForLocalImage };
