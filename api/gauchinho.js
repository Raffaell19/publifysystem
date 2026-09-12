const fs = require('fs');
const path = require('path');

function getMetaToken() {
  if (process.env.META_ACCESS_TOKEN) return process.env.META_ACCESS_TOKEN;
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/META_ACCESS_TOKEN\s*=\s*([^\r\n]+)/);
    return match ? match[1].trim() : null;
  } catch (err) {
    console.error('Error reading .env in gauchinho API:', err);
    return null;
  }
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

  const token = getMetaToken();
  if (!token) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'META_ACCESS_TOKEN not configured in .env' }));
    return;
  }

  const accountId = 'act_101657350274220';

  try {
    const accUrl = `https://graph.facebook.com/v20.0/${accountId}?fields=name,account_status,currency,spend_cap,amount_spent,balance,funding_source_details&access_token=${token}`;
    const insUrl = `https://graph.facebook.com/v20.0/${accountId}/insights?date_preset=maximum&fields=spend,impressions,reach,cpm,frequency,clicks,ctr,cpc,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions&access_token=${token}`;
    const insTodayUrl = `https://graph.facebook.com/v20.0/${accountId}/insights?date_preset=today&fields=spend,impressions,reach,video_thruplay_watched_actions&access_token=${token}`;
    const adsUrl = `https://graph.facebook.com/v20.0/${accountId}/ads?fields=id,name,status,effective_status,adset{id,name,daily_budget,targeting},creative{id,name,thumbnail_url,image_url,object_story_spec,asset_feed_spec},insights.date_preset(maximum){spend,impressions,reach,cpm,frequency,clicks,ctr,cpc,video_thruplay_watched_actions}&access_token=${token}`;
    const campUrl = `https://graph.facebook.com/v20.0/${accountId}/campaigns?fields=id,name,status,effective_status,objective,special_ad_categories&access_token=${token}`;

    const [accRes, insRes, insTodayRes, adsRes, campRes] = await Promise.all([
      fetch(accUrl).then(r => r.json()),
      fetch(insUrl).then(r => r.json()),
      fetch(insTodayUrl).then(r => r.json()),
      fetch(adsUrl).then(r => r.json()),
      fetch(campUrl).then(r => r.json())
    ]);

    // Parse Balance
    let balanceVal = 1624.01;
    if (accRes.funding_source_details && accRes.funding_source_details.display_string) {
      const match = accRes.funding_source_details.display_string.match(/R\$[\s]*([\d.,]+)/);
      if (match) {
        balanceVal = parseFloat(match[1].replace('.', '').replace(',', '.')) || balanceVal;
      }
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

    const thruplayObj = insAll.video_thruplay_watched_actions?.find(a => a.action_type === 'video_view');
    const totalThruplays = thruplayObj ? parseInt(thruplayObj.value) || 0 : 0;
    const costPerThruplay = totalThruplays > 0 ? (totalSpendNum / totalThruplays) : 0;

    // Daily budget calculation across active adsets
    let totalDailyBudget = 0;
    const adsList = (adsRes.data || []).map(ad => {
      const adset = ad.adset || {};
      const adsetBudget = adset.daily_budget ? (parseInt(adset.daily_budget) / 100) : 50;
      totalDailyBudget += adsetBudget;

      const adIns = ad.insights?.data?.[0] || {};
      const adSpend = parseFloat(adIns.spend) || 0;
      const adReach = parseInt(adIns.reach) || 0;
      const adImpressions = parseInt(adIns.impressions) || 0;
      const adClicks = parseInt(adIns.clicks) || 0;
      const adFrequency = parseFloat(adIns.frequency) || 1.0;
      
      const adThruplayObj = adIns.video_thruplay_watched_actions?.find(a => a.action_type === 'video_view');
      const adThruplays = adThruplayObj ? parseInt(adThruplayObj.value) || 0 : 0;

      // Extract high quality thumbnail with clear content and candidate appearance
      let thumb = null;
      const upperName = (ad.name || '').toUpperCase();
      if (upperName.includes('FECHADO')) {
        thumb = '/public/thumbs/thumb_to_fechado.jpg';
      } else if (upperName.includes('JUNTO_DO_POVO') || upperName.includes('POVO')) {
        thumb = '/public/thumbs/thumb_junto_do_povo.jpg';
      } else if (upperName.includes('SANDERSON')) {
        thumb = '/public/thumbs/thumb_sanderson.jpg';
      }

      if (!thumb) {
        thumb = ad.creative?.thumbnail_url || ad.creative?.image_url;
        if (!thumb && ad.creative?.object_story_spec?.video_data?.image_url) {
          thumb = ad.creative.object_story_spec.video_data.image_url;
        }
        if (!thumb && ad.creative?.asset_feed_spec?.videos?.[0]?.thumbnail_url) {
          thumb = ad.creative.asset_feed_spec.videos[0].thumbnail_url;
        }
      }

      const isChristian = (ad.name || '').includes('CRISTAO') || (adset.name || '').includes('CRISTAOS');
      const audienceType = isChristian ? 'Cristãos & Valores de Família (RS)' : 'Público Aberto (Advantage+ RS)';

      // Detect video badge
      let videoLabel = 'Vídeo Oficial';
      if ((ad.name || '').includes('SANDERSON')) videoLabel = 'Sanderson & Gauchinho';
      else if ((ad.name || '').includes('FECHADO')) videoLabel = 'Tô Fechado 2266';
      else if ((ad.name || '').includes('JUNTO_DO_POVO')) videoLabel = 'Junto do Povo 2266';

      return {
        id: ad.id,
        name: ad.name,
        videoLabel,
        status: ad.status,
        effectiveStatus: ad.effective_status,
        adsetName: adset.name || 'Conjunto Isolado',
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

    const dailyBudgetFinal = totalDailyBudget > 0 ? totalDailyBudget : 200;
    const estimatedDays = dailyBudgetFinal > 0 ? (balanceVal / dailyBudgetFinal) : 8.1;

    const mainCamp = campRes.data?.[0] || {
      id: '120251581246700598',
      name: '[GAUCHINHO-2266] C01_RECONHECIMENTO_VIDEOVIEWS_SANDERSON',
      status: 'ACTIVE',
      objective: 'OUTCOME_AWARENESS'
    };

    const payload = {
      success: true,
      lastUpdated: new Date().toISOString(),
      client: {
        name: 'Gauchinho de Deus',
        role: 'Deputado Federal 2266',
        state: 'Rio Grande do Sul (RS)',
        coligacao: 'Coligação O Rio Grande Pode Mais: PL, Federação União Progressista, Republicanos, Podemos, Novo e DC',
        cnpj: '68.312.665/0001-74',
        accountId,
        accountName: accRes.name || 'Gauchinho De Deus Oliveira',
        accountStatus: accRes.account_status === 1 ? 'Ativa & Regular' : 'Atenção',
        balance: balanceVal,
        balanceFormatted: formatBRL(balanceVal),
        dailyBudget: dailyBudgetFinal,
        dailyBudgetFormatted: formatBRL(dailyBudgetFinal) + '/dia',
        estimatedDaysRemaining: parseFloat(estimatedDays.toFixed(1))
      },
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
        objective: 'Reconhecimento & ThruPlay (OUTCOME_AWARENESS)',
        specialCategory: 'ISSUES_ELECTIONS_POLITICS (Eleitoral / Brasil)'
      },
      ads: adsList
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  } catch (err) {
    console.error('Error fetching gauchinho metrics:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
};
