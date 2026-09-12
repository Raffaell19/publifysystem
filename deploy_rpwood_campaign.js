/**
 * 🚀 DEPLOY AUTOMATIZADO - CAMPANHA META ADS R.P WOOD PERSONALIZADOS
 * Conta: act_2146995242526586
 * Metodologia: Teste A/B Isolado (ABO: R$ 12,50/dia Vídeo + R$ 12,50/dia Imagem Estática = R$ 50 nos 2 dias)
 * Geolocalização: Serra Gaúcha (Gramado, Canela, Caxias do Sul, Nova Petrópolis, São Francisco de Paula)
 * Destino: Conversas no WhatsApp
 */

const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

const TOKEN = 'EAAS1Jg3e8DkBSZAVWQ3KVZB1ZC3YxqW3hIpz84ZAFWCaP64ZB5JfAbyZBqBwliW7lgfcb3GVQBZBuy3dpjlf9p9GWNvwF8I3gHyN1rG6gQ43MgUKfDAk4YqfWQx7ikHaWCZCUBCeEaa5L8gar8kKykWceKB6gE370EuKANALX1nGoCb9MH3Rxm1sjuGXfkEOERPuaMXq4GnXwaJ8RrAg8jAPuXcaxNdcC8tbeyJpKm81';
const ACCOUNT_ID = 'act_2146995242526586';
const PAGE_ID = '1087612627777055'; // R.P Wood Personalizados (Oficial)


function metaPost(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({ ...data, access_token: TOKEN });
    const req = https.request(`https://graph.facebook.com/v20.0/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) reject(json.error);
          else resolve(json);
        } catch (e) {
          reject(new Error('Falha ao processar resposta: ' + body));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function metaGet(endpoint) {
  return new Promise((resolve, reject) => {
    https.get(`https://graph.facebook.com/v20.0/${endpoint}?access_token=${TOKEN}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) reject(json.error);
          else resolve(json);
        } catch (e) {
          reject(new Error('Falha ao processar resposta: ' + body));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('====================================================');
  console.log('🚀 INICIANDO CRIAÇÃO DE CAMPANHA - R.P WOOD PERSONALIZADOS');
  console.log('====================================================\n');

  try {
    // 1. Criar Nova Campanha Oficial
    console.log('Criando nova campanha oficial...');
    const campRes = await metaPost(`${ACCOUNT_ID}/campaigns`, {
      name: '[TESTE A/B] Placas Rústicas Entalhadas - Serra Gaúcha',
      objective: 'OUTCOME_ENGAGEMENT',
      status: 'PAUSED',
      special_ad_categories: JSON.stringify([]),
      is_adset_budget_sharing_enabled: false
    });
    const campaignId = campRes.id;
    console.log(`✅ Nova Campanha criada com sucesso! ID: ${campaignId}`);


    // Configuração de Segmentação Comum para os dois conjuntos
    const targetingConfig = {
      geo_locations: {
        cities: [
          { key: '254172', radius: 17, distance_unit: 'kilometer' }, // Gramado
          { key: '247451', radius: 17, distance_unit: 'kilometer' }, // Canela
          { key: '248639', radius: 20, distance_unit: 'kilometer' }, // Caxias do Sul
          { key: '261504', radius: 17, distance_unit: 'kilometer' }, // Nova Petrópolis
          { key: '269164', radius: 25, distance_unit: 'kilometer' }  // São Francisco de Paula
        ],
        location_types: ['recent', 'home']
      },
      age_min: 25,
      age_max: 65
    };

    // 2. Criar Conjunto de Anúncios 1: VÍDEO (R$ 12,50/dia)
    console.log('\nCriando Conjunto 1 (Vídeo - R$ 12,50/dia)...');
    const adsetVideoRes = await metaPost(`${ACCOUNT_ID}/adsets`, {
      name: '[TESTE - VÍDEO] Serra Gaúcha - Placas Entalhadas',
      campaign_id: campaignId,
      daily_budget: 1250, // R$ 12,50 por dia (centavos)
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'CONVERSATIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      destination_type: 'WHATSAPP',
      promoted_object: JSON.stringify({ page_id: PAGE_ID }),
      status: 'PAUSED',
      targeting: JSON.stringify(targetingConfig)
    });
    console.log(`✅ Conjunto 1 (Vídeo) criado! ID: ${adsetVideoRes.id}`);

    // 3. Criar Conjunto de Anúncios 2: IMAGEM ESTÁTICA (R$ 12,50/dia)
    console.log('\nCriando Conjunto 2 (Imagem Estática - R$ 12,50/dia)...');
    const adsetImageRes = await metaPost(`${ACCOUNT_ID}/adsets`, {
      name: '[TESTE - IMAGEM ESTÁTICA] Serra Gaúcha - Placas Entalhadas',
      campaign_id: campaignId,
      daily_budget: 1250, // R$ 12,50 por dia (centavos)
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'CONVERSATIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      destination_type: 'WHATSAPP',
      promoted_object: JSON.stringify({ page_id: PAGE_ID }),
      status: 'PAUSED',
      targeting: JSON.stringify(targetingConfig)
    });
    console.log(`✅ Conjunto 2 (Imagem Estática) criado! ID: ${adsetImageRes.id}`);

    console.log('\n====================================================');
    console.log('🎉 ESTRUTURA CRIADA COM SUCESSO NO GERENCIADOR!');
    console.log(`🔗 Campanha ID: ${campaignId}`);
    console.log(`📁 Conjunto Vídeo ID: ${adsetVideoRes.id} (R$ 12,50/dia)`);
    console.log(`📁 Conjunto Imagem ID: ${adsetImageRes.id} (R$ 12,50/dia)`);
    console.log('Status: PAUSED (Pausado para você anexar as mídias)');
    console.log('Acesse o Gerenciador de Anúncios da R.P Wood para subir os criativos!');
    console.log('====================================================');

  } catch (error) {
    console.error('\n❌ ERRO NA CRIAÇÃO:', error.message);
    if (error.error_user_title) {
      console.error(`Detalhes: ${error.error_user_title} - ${error.error_user_msg}`);
    }
  }
}

main();
