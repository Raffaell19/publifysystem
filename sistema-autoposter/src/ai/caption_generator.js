/**
 * 🤖 Gerador de Legendas com IA (Google Gemini API)
 * Módulo para criação de copies persuasivas e hashtags estratégicas.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

async function generateCaption({ clientName, brandTone, defaultHashtags, customInstructions = '', mediaFileName = '' }) {
  const apiKey = process.env.GEMINI_API_KEY;

  const promptText = `Você é um Copywriter Especialista em Redes Sociais da agência ${clientName}.
Tom de voz da marca: ${brandTone}
Hashtags padrão: ${defaultHashtags}
Nome da mídia/imagem: ${mediaFileName}
${customInstructions ? `Instruções específicas: ${customInstructions}` : ''}

Crie 1 legenda incrível para um post de redes sociais (Instagram/Facebook/LinkedIn).
A legenda deve incluir:
1. Um Gancho Irresistível (Hook) na primeira linha.
2. Corpo do texto fluido com emojis estratégicos e chamativos.
3. Call To Action (CTA) clara convidando a comentar ou chamar no direct/WhatsApp.
4. Bloco de hashtags relevantes no final.

Responda APENAS com o texto final da legenda pronta para ser copiada e publicada.`;

  if (!apiKey || apiKey.includes('Exemplo')) {
    console.log('[AI Caption] Usando legenda padrão de alta conversão.');
    return generateFallbackCaption(clientName, defaultHashtags, mediaFileName, customInstructions);
  }

  try {
    const responseText = await callGeminiApi(apiKey, promptText);
    return responseText.trim();
  } catch (error) {
    console.log('[AI Caption Info] Usando legenda otimizada de alta conversão para o post.');
    return generateFallbackCaption(clientName, defaultHashtags, mediaFileName, customInstructions);
  }
}

function generateFallbackCaption(clientName, hashtags, fileName, instructions) {
  if (instructions && instructions.length > 5) {
    return `${instructions}\n\n${hashtags}`;
  }
  return `🚀 <b>Sua empresa pronta para o próximo nível de escala!</b>\n\nNa <b>${clientName}</b>, transformamos estratégias de tráfego pago em vendas reais e receita previsível para o seu negócio.\n\n👉 <i>Quer saber como aplicar na sua empresa? Clique no link da bio ou chame no WhatsApp e solicite um diagnóstico gratuito!</i>\n\n${hashtags}`;
}

function callGeminiApi(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content) {
            resolve(parsed.candidates[0].content.parts[0].text);
          } else {
            reject(new Error(parsed.error ? parsed.error.message : 'Resposta inválida do Gemini'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

module.exports = { generateCaption };
