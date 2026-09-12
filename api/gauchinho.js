const fs = require('fs');
const path = require('path');

function getMetaTokens() {
  const envTokens = {
    default: process.env.META_ACCESS_TOKEN || null,
    rpwood: process.env.META_ACCESS_TOKEN_RPWOOD || process.env.META_ACCESS_TOKEN || null,
    gauchinho: process.env.META_ACCESS_TOKEN_GAUCHINHO || null
  };
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const mDefault = content.match(/^META_ACCESS_TOKEN\s*=\s*([^\r\n]+)/m);
      const mRp = content.match(/^META_ACCESS_TOKEN_RPWOOD\s*=\s*([^\r\n]+)/m);
      const mGau = content.match(/^META_ACCESS_TOKEN_GAUCHINHO\s*=\s*([^\r\n]+)/m);
      if (mDefault) envTokens.default = mDefault[1].trim();
      if (mRp) envTokens.rpwood = mRp[1].trim();
      if (mGau) envTokens.gauchinho = mGau[1].trim();
    }
  } catch (err) {
    console.error('Error reading .env in gauchinho API:', err);
  }
  return envTokens;
}

function formatBRL(val) {
  const num = parseFloat(val) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function formatNumber(val) {
  const num = parseInt(val) || 0;
  return new Intl.NumberFormat('pt-BR').format(num);
}

module.exports = async function handleGauchinhoMetrics(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const tokens = getMetaTokens();
  const urlObj = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
  const clientQuery = (urlObj.searchParams.get('client') || '').toLowerCase();
  let accountIdQuery = urlObj.searchParams.get('account_id') || '';

  // Determina qual conta e token utilizar
  let targetAccountId = 'act_2146995242526586';
  let token = tokens.rpwood || tokens.default;

  if (clientQuery === 'gauchinho' || accountIdQuery.includes('101657350274220')) {
    targetAccountId = 'act_101657350274220';
    token = tokens.gauchinho || tokens.default;
  } else if (clientQuery === 'rpwood' || accountIdQuery.includes('2146995242526586')) {
    targetAccountId = 'act_2146995242526586';
    token = tokens.rpwood || tokens.default;
  } else if (accountIdQuery) {
    targetAccountId = accountIdQuery.startsWith('act_') ? accountIdQuery : 'act_' + accountIdQuery;
    token = tokens.default;
  }

  if (!token) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'META_ACCESS_TOKEN não configurado' }));
    return;
  }

  try {
    const accUrl = `https://graph.facebook.com/v20.0/${targetAccountId}?fields=name,account_status,currency,spend_cap,amount_spent,balance,funding_source_details&access_token=${token}`;
    const insUrl = `https://graph.facebook.com/v20.0/${targetAccountId}/insights?date_preset=maximum&fields=spend,impressions,reach,cpm,frequency,clicks,ctr,cpc,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,actions&access_token=${token}`;
    const insTodayUrl = `https://graph.facebook.com/v20.0/${targetAccountId}/insights?date_preset=today&fields=spend,impressions,reach,video_thruplay_watched_actions,actions&access_token=${token}`;
    const adsUrl = `https://graph.facebook.com/v20.0/${targetAccountId}/ads?fields=id,name,status,effective_status,adset{id,name,daily_budget,targeting},creative{id,name,thumbnail_url,image_url,object_story_spec,asset_feed_spec},insights.date_preset(maximum){spend,impressions,reach,cpm,frequency,clicks,ctr,cpc,video_thruplay_watched_actions,actions}&access_token=${token}`;
    const campUrl = `https://graph.facebook.com/v20.0/${targetAccountId}/campaigns?fields=id,name,status,effective_status,objective,special_ad_categories&access_token=${token}`;

    const [accRes, insRes, insTodayRes, adsRes, campRes] = await Promise.all([
      fetch(accUrl).then(r => r.json()),
      fetch(insUrl).then(r => r.json()),
      fetch(insTodayUrl).then(r => r.json()),
      fetch(adsUrl).then(r => r.json()),
      fetch(campUrl).then(r => r.json())
    ]);

    // Parse Saldo Disponível Real
    let balanceVal = 0;
    if (accRes.funding_source_details && accRes.funding_source_details.display_string) {
      const match = accRes.funding_source_details.display_string.match(/R\$[\s]*([\d.,]+)/);
      if (match) {
        balanceVal = parseFloat(match[1].replace(/\./g, '').replace(',', '.')) || 0;
      }
    } else if (accRes.balance) {
      balanceVal = parseFloat(accRes.balance) / 100;
    }

    const insAll = insRes.data?.[0] || {};
    const insToday = insTodayRes.data?.[0] || {};

    const totalSpendNum = parseFloat(insAll.spend) || 0;
    const todaySpendNum = parseFloat(insToday.spend) || 0;
    const totalReachNum = parseInt(insAll.reach) || 0;
    const todayReachNum = parseInt(insToday.reach) || 0;
    const totalImpressionsNum = parseInt(insAll.impressions) || 0;
    const todayImpressionsNum = parseInt(insToday.impressions) || 0;
    const totalClicksNum = parseInt(insAll.clicks) || 0;
    const avgFrequency = parseFloat(insAll.frequency) || 1.0;
    const avgCpm = parseFloat(insAll.cpm) || 0;
    const avgCtr = insAll.ctr ? parseFloat(insAll.ctr).toFixed(2) + '%' : '0.00%';
    const avgCpc = parseFloat(insAll.cpc) || 0;

    // Ações de engajamento, mensagens e visualizações
    let totalThruplays = 0;
    const thruplayObj = insAll.video_thruplay_watched_actions?.find(a => a.action_type === 'video_view');
    if (thruplayObj) {
      totalThruplays = parseInt(thruplayObj.value) || 0;
    } else if (insAll.actions) {
      const videoAction = insAll.actions.find(a => a.action_type === 'video_view');
      const msgAction = insAll.actions.find(a =>
        a.action_type === 'onsite_conversion.total_messaging_connection' ||
        a.action_type === 'onsite_conversion.messaging_conversation_started_7d'
      );
      totalThruplays = videoAction ? (parseInt(videoAction.value) || 0) : (msgAction ? (parseInt(msgAction.value) || 0) : totalClicksNum);
    }
    const costPerThruplay = totalThruplays > 0 ? (totalSpendNum / totalThruplays) : 0;

    // Cálculo de orçamento diário acumulado entre os conjuntos de anúncios
    let totalDailyBudget = 0;
    const countedAdsets = new Set();

    const adsList = (adsRes.data || []).map(ad => {
      const adset = ad.adset || {};
      const adsetBudget = adset.daily_budget ? (parseInt(adset.daily_budget) / 100) : 12.5;

      if (adset.id && !countedAdsets.has(adset.id)) {
        countedAdsets.add(adset.id);
        totalDailyBudget += adsetBudget;
      }

      const adIns = ad.insights?.data?.[0] || {};
      const adSpend = parseFloat(adIns.spend) || 0;
      const adReach = parseInt(adIns.reach) || 0;
      const adImpressions = parseInt(adIns.impressions) || 0;
      const adClicks = parseInt(adIns.clicks) || 0;
      const adFrequency = parseFloat(adIns.frequency) || 1.0;

      let adThruplays = 0;
      const adThruplayObj = adIns.video_thruplay_watched_actions?.find(a => a.action_type === 'video_view');
      if (adThruplayObj) {
        adThruplays = parseInt(adThruplayObj.value) || 0;
      } else if (adIns.actions) {
        const vAct = adIns.actions.find(a => a.action_type === 'video_view');
        adThruplays = vAct ? parseInt(vAct.value) || 0 : 0;
      }

      // Extração de thumbnail em alta resolução
      let thumb = ad.creative?.thumbnail_url || ad.creative?.image_url;
      if (!thumb && ad.creative?.object_story_spec?.video_data?.image_url) {
        thumb = ad.creative.object_story_spec.video_data.image_url;
      }
      if (!thumb && ad.creative?.asset_feed_spec?.videos?.[0]?.thumbnail_url) {
        thumb = ad.creative.asset_feed_spec.videos[0].thumbnail_url;
      }

      const isVideo = (ad.name || '').toUpperCase().includes('VÍDEO') || (ad.name || '').toUpperCase().includes('VIDEO');
      const audienceType = targetAccountId.includes('101657350274220')
        ? ((ad.name || '').includes('CRISTAO') ? 'Cristãos & Valores de Família (RS)' : 'Público Aberto (Advantage+ RS)')
        : 'Público Aberto (Serra Gaúcha: Gramado, Canela, Caxias, N. Petrópolis, S. Chico)';

      const videoLabel = isVideo ? 'Vídeo Demonstrativo' : 'Imagem Nobre Maciça';

      return {
        id: ad.id,
        name: ad.name,
        videoLabel,
        status: ad.status,
        effectiveStatus: ad.effective_status,
        adsetName: adset.name || 'Conjunto de Anúncios',
        audienceType,
        budget: adsetBudget,
        budgetFormatted: formatBRL(adsetBudget) + '/dia',
        thumbnail: thumb || null,
        spend: adSpend,
        spendFormatted: formatBRL(adSpend),
        reach: adReach,
        reachFormatted: formatNumber(adReach),
        impressions: adImpressions,
        impressionsFormatted: formatNumber(adImpressions),
        thruplays: adThruplays,
        thruplaysFormatted: formatNumber(adThruplays),
        frequency: adFrequency.toFixed(2),
        clicks: adClicks,
        clicksFormatted: formatNumber(adClicks)
      };
    });

    const isPolitical = targetAccountId.includes('101657350274220') || (accRes.name || '').toLowerCase().includes('gauchinho');
    const dailyBudgetFinal = totalDailyBudget > 0 ? totalDailyBudget : (isPolitical ? 800 : 25);
    const estimatedDays = dailyBudgetFinal > 0 ? (balanceVal / dailyBudgetFinal) : 0;

    const mainCamp = campRes.data?.[0] || {
      id: isPolitical ? '120251581246700598' : '120253713397800154',
      name: isPolitical ? '[GAUCHINHO-2266] C01_RECONHECIMENTO_VIDEOVIEWS_SANDERSON' : '[TESTE A/B] Placas Rústicas Entalhadas - Serra Gaúcha',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
      objective: isPolitical ? 'OUTCOME_AWARENESS' : 'OUTCOME_ENGAGEMENT'
    };

    // Identificação e metadados dinâmicos do cliente
    const clientPayload = isPolitical ? {
      id: 'gauchinho',
      name: 'Gauchinho de Deus',
      role: 'Deputado Federal 2266',
      state: 'Rio Grande do Sul (RS)',
      coligacao: 'Coligação O Rio Grande Pode Mais: PL, Federação União Progressista, Republicanos, Podemos, Novo e DC',
      cnpj: '68.312.665/0001-74',
      subtitle: 'Relatório oficial de alcance, visualizações e investimento da campanha no Rio Grande do Sul.',
      badge: '🇧🇷 Prestação de Contas em Tempo Real',
      metric2Label: 'Vídeos Assistidos',
      metric2Sub: 'Mais de 15 segundos ou completos',
      sectionAdsTitle: '📹 Vídeos em Veiculação no Rio Grande do Sul',
      accountId: targetAccountId,
      accountName: accRes.name || 'Gauchinho De Deus Oliveira',
      accountStatus: accRes.account_status === 1 ? 'Ativa & Regular' : 'Atenção',
      balance: balanceVal,
      balanceFormatted: formatBRL(balanceVal),
      dailyBudget: dailyBudgetFinal,
      dailyBudgetFormatted: formatBRL(dailyBudgetFinal) + '/dia',
      estimatedDaysRemaining: parseFloat(estimatedDays.toFixed(1))
    } : {
      id: 'rpwood',
      name: accRes.name || 'R.P Wood Personalizados',
      role: 'Placas Rústicas Entalhadas & Marcenaria Nobre',
      state: 'Serra Gaúcha (Gramado, Canela, Caxias)',
      coligacao: 'Painel Oficial de Transparência & Desempenho Meta Ads • R.P Wood',
      cnpj: 'Marcenaria Artesanal de Alto Padrão',
      subtitle: 'Relatório oficial de alcance, anúncios ativos e conversões na Serra Gaúcha.',
      badge: '🌲 Desempenho em Tempo Real (Meta Ads)',
      metric2Label: 'Engajamento & Contatos',
      metric2Sub: 'Interações diretas e cliques no WhatsApp',
      sectionAdsTitle: '✨ Anúncios em Veiculação na Serra Gaúcha',
      accountId: targetAccountId,
      accountName: accRes.name || 'R.P Wood Personalizados',
      accountStatus: accRes.account_status === 1 ? 'Ativa & Regular' : 'Atenção',
      balance: balanceVal,
      balanceFormatted: formatBRL(balanceVal),
      dailyBudget: dailyBudgetFinal,
      dailyBudgetFormatted: formatBRL(dailyBudgetFinal) + '/dia',
      estimatedDaysRemaining: parseFloat(estimatedDays.toFixed(1))
    };

    const payload = {
      success: true,
      lastUpdated: new Date().toISOString(),
      activeClient: clientPayload.id,
      availableClients: [
        { id: 'rpwood', name: 'R.P Wood Personalizados', badge: '🌲 Madeira Rústica' },
        { id: 'gauchinho', name: 'Gauchinho de Deus', badge: '🇧🇷 Deputado Federal' }
      ],
      client: clientPayload,
      overview: {
        spend: totalSpendNum,
        spendFormatted: formatBRL(totalSpendNum),
        todaySpend: todaySpendNum,
        todaySpendFormatted: formatBRL(todaySpendNum),
        reach: totalReachNum,
        reachFormatted: formatNumber(totalReachNum),
        todayReach: todayReachNum,
        todayReachFormatted: formatNumber(todayReachNum),
        impressions: totalImpressionsNum,
        impressionsFormatted: formatNumber(totalImpressionsNum),
        todayImpressions: todayImpressionsNum,
        todayImpressionsFormatted: formatNumber(todayImpressionsNum),
        frequency: avgFrequency.toFixed(2),
        thruplays: totalThruplays,
        thruplaysFormatted: formatNumber(totalThruplays),
        costPerThruplayFormatted: formatBRL(costPerThruplay),
        cpmFormatted: formatBRL(avgCpm),
        clicks: totalClicksNum,
        clicksFormatted: formatNumber(totalClicksNum),
        ctr: avgCtr,
        cpcFormatted: formatBRL(avgCpc),
        retention: {
          p25: parseInt(insAll.video_p25_watched_actions?.[0]?.value) || 0,
          p50: parseInt(insAll.video_p50_watched_actions?.[0]?.value) || 0,
          p75: parseInt(insAll.video_p75_watched_actions?.[0]?.value) || 0,
          p100: parseInt(insAll.video_p100_watched_actions?.[0]?.value) || 0
        }
      },
      campaign: {
        id: mainCamp.id,
        name: mainCamp.name,
        status: mainCamp.status,
        effectiveStatus: mainCamp.effective_status || 'ACTIVE',
        objective: mainCamp.objective || 'OUTCOME_ENGAGEMENT'
      },
      ads: adsList
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  } catch (err) {
    console.error('Error fetching metrics in gauchinho API:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
};
