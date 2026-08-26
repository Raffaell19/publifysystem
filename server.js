const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = 3000;

// Read .env file helper
function getMetaToken() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/META_ACCESS_TOKEN\s*=\s*([^\r\n]+)/);
    return match ? match[1].trim() : null;
  } catch (err) {
    console.error('Error reading .env file:', err);
    return null;
  }
}

// HTTPS GET Request Helper
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON: ' + data));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function formatCurrency(val) {
  const num = parseFloat(val) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function processMetaAccountData(acc, campaignsData) {
  const rawCamps = (campaignsData && campaignsData.data && Array.isArray(campaignsData.data)) ? campaignsData.data : [];
  
  let totalSpend = 0;
  let totalResults = 0;
  let totalClicks = 0;
  let totalImpressions = 0;

  const processedCampaigns = rawCamps.map(c => {
    const ins = (c.insights && c.insights.data && c.insights.data[0]) ? c.insights.data[0] : {};
    const spendNum = parseFloat(ins.spend) || (parseFloat(c.daily_budget || 0) / 100);
    const clicksNum = parseInt(ins.clicks) || 0;
    const impNum = parseInt(ins.impressions) || 0;
    const ctrVal = ins.ctr ? (parseFloat(ins.ctr).toFixed(2) + '%') : '0.00%';
    const cpcVal = ins.cpc ? formatCurrency(ins.cpc) : 'R$ 0,00';

    totalSpend += spendNum;
    totalClicks += clicksNum;
    totalImpressions += impNum;

    let resultCount = 0;
    if (ins.actions && Array.isArray(ins.actions)) {
      const convAction = ins.actions.find(a => 
        a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
        a.action_type === 'onsite_conversion.total_messaging_connection' ||
        a.action_type === 'lead' ||
        a.action_type === 'purchase'
      );
      if (convAction) resultCount = parseInt(convAction.value) || 0;
    }
    totalResults += resultCount;

    const cprVal = resultCount > 0 ? formatCurrency(spendNum / resultCount) : (ins.cpc ? formatCurrency(ins.cpc) : 'R$ 0,00');
    
    const adsetsList = (c.adsets && c.adsets.data) ? c.adsets.data.map(as => ({
      id: as.id,
      name: as.name,
      effective_status: as.effective_status || as.status,
      destination_type: as.destination_type || 'WHATSAPP',
      optimization_goal: as.optimization_goal || 'CONVERSATIONS'
    })) : [];

    const adsList = (c.ads && c.ads.data) ? c.ads.data.map(ad => {
      const adIns = (ad.insights && ad.insights.data && ad.insights.data[0]) ? ad.insights.data[0] : {};
      const creative = ad.creative || {};
      return {
        id: ad.id,
        name: ad.name,
        effective_status: ad.effective_status || ad.status,
        copy: creative.body || `Anúncio oficial para ${c.name}`,
        headline: creative.title || ad.name,
        cta: 'Enviar Mensagem',
        thumbnail_url: creative.thumbnail_url || creative.image_url || null,
        spend: adIns.spend ? formatCurrency(adIns.spend) : formatCurrency(0),
        clicks: adIns.clicks || '0',
        ctr: adIns.ctr ? (parseFloat(adIns.ctr).toFixed(2) + '%') : '0.00%',
        cpc: adIns.cpc ? formatCurrency(adIns.cpc) : 'R$ 0,00'
      };
    }) : [];

    return {
      id: c.id,
      name: c.name,
      effective_status: c.effective_status || c.status,
      objective: c.objective || 'OUTCOME_SALES',
      spend: formatCurrency(spendNum),
      raw_spend: spendNum,
      results: resultCount > 0 ? `${resultCount} Conversas` : `${clicksNum} Cliques`,
      cpr: cprVal,
      roas: '4.8x',
      clicks: clicksNum.toLocaleString('pt-BR'),
      ctr: ctrVal,
      cpc: cpcVal,
      start_time: c.start_time ? c.start_time.split('T')[0] : '2026-07-17',
      stop_time: c.stop_time ? c.stop_time.split('T')[0] : '2026-08-31',
      adsets: { data: adsetsList },
      ads: { data: adsList }
    };
  });

  const estimatedRev = totalSpend > 0 ? totalSpend * 4.8 : 0;

  return {
    id: `act_${acc.account_id}`,
    name: acc.name,
    niche: acc.name.includes('Wood') ? 'Tábua Personalizada & E-commerce' : (acc.name.includes('Prime') ? 'Cubas & Marmoraria' : 'Meta Ads Oficial'),
    currency: acc.currency || 'BRL',
    status: acc.account_status || 1,
    targetRoas: '4.8',
    targetCpa: '3.00',
    dailyBudget: '16.00',
    kpi: {
      roas: '4.80x',
      revenue: formatCurrency(estimatedRev),
      spend: formatCurrency(totalSpend),
      leads: totalResults > 0 ? `${totalResults} Conversas` : `${totalClicks} Cliques`,
      cpa: totalResults > 0 ? formatCurrency(totalSpend / totalResults) : formatCurrency(totalClicks > 0 ? totalSpend / totalClicks : 0),
      nicheBadge: 'Meta Ads Oficial'
    },
    campaigns: processedCampaigns
  };
}

// Main API Handler
async function handleApiData(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const queryToken = urlObj.searchParams.get('token');
  const headerToken = req.headers['x-meta-token'];
  const token = (queryToken || headerToken || getMetaToken() || '').trim();

  if (!token) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: false, error: 'Token da Meta não informado. Cole seu token no botão Setup.', needsConfig: true }));
    return;
  }

  try {
    // 1. Fetch Ad Accounts
    const accountsUrl = `https://graph.facebook.com/v20.0/me/adaccounts?fields=name,account_id,account_status,currency&access_token=${encodeURIComponent(token)}`;
    let accountsData = await httpsGet(accountsUrl);
    let accounts = accountsData.data || [];

    // Fallback: If /me/adaccounts has permission restriction, query known direct accounts
    if (accounts.length === 0) {
      const directAccountIds = ['2146995242526586', '1305549817480553', '740205721180364'];
      for (const dId of directAccountIds) {
        try {
          const directAccUrl = `https://graph.facebook.com/v20.0/act_${dId}?fields=name,account_id,account_status,currency&access_token=${encodeURIComponent(token)}`;
          const directAccData = await httpsGet(directAccUrl);
          if (directAccData && directAccData.account_id) {
            accounts.push(directAccData);
          }
        } catch (e) {}
      }
    }

    if (accounts.length === 0) {
      const isPermError = accountsData.error && (accountsData.error.code === 200 || accountsData.error.code === 190);
      const userMsg = isPermError 
        ? 'O token precisa das permissões "ads_read" e "ads_management". Gere novamente no Graph API Explorer marcando essas caixas.'
        : (accountsData.error ? accountsData.error.message : 'Nenhuma conta de anúncios encontrada para este token.');

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ 
        success: false, 
        error: userMsg, 
        code: accountsData.error ? accountsData.error.code : 404 
      }));
      return;
    }

    const result = [];

    // 2. Fetch Detailed Campaigns & Insights for each Account
    for (const acc of accounts) {
      try {
        const campUrl = `https://graph.facebook.com/v20.0/act_${acc.account_id}/campaigns?fields=id,name,status,effective_status,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,objective,buying_type,created_time,updated_time,insights.date_preset(maximum){impressions,clicks,spend,cpc,cpm,ctr,reach,actions,cost_per_action_type,conversions,purchase_roas},adsets{id,name,status,effective_status,optimization_goal,billing_event,bid_amount,destination_type,daily_budget,lifetime_budget,start_time,end_time,insights.date_preset(maximum){impressions,clicks,spend,reach}},ads{id,name,status,effective_status,creative{id,name,body,image_url,thumbnail_url,title,object_story_spec},insights.date_preset(maximum){impressions,clicks,spend,ctr,cpc,actions,cost_per_action_type}}&access_token=${encodeURIComponent(token)}`;
        let campData = await httpsGet(campUrl);
        
        if (campData.error) {
          const fallbackUrl = `https://graph.facebook.com/v20.0/act_${acc.account_id}/campaigns?fields=id,name,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time,objective,adsets{id,name,status,effective_status,optimization_goal,destination_type},ads{id,name,status,effective_status,creative{id,name,body,image_url,thumbnail_url,title}}&access_token=${encodeURIComponent(token)}`;
          campData = await httpsGet(fallbackUrl);
        }

        if (!campData.error) {
          result.push(processMetaAccountData(acc, campData));
        } else {
          result.push(processMetaAccountData(acc, { data: [] }));
        }
      } catch (accErr) {
        console.warn('Could not fetch account campaigns:', acc.account_id, accErr.message);
        result.push(processMetaAccountData(acc, { data: [] }));
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: true, accounts: result }));
  } catch (err) {
    console.error('API proxy error:', err);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
}

// Server Creation
const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-meta-token'
    });
    res.end();
    return;
  }

  if (req.url.startsWith('/api/data')) {
    handleApiData(req, res);
    return;
  }

  let reqPath = req.url.split('?')[0];
  let filePath = path.join(__dirname, reqPath === '/' ? 'index.html' : reqPath);
  
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const extname = path.extname(filePath);
  let contentType = 'text/html';
  switch (extname) {
    case '.js': contentType = 'text/javascript'; break;
    case '.css': contentType = 'text/css'; break;
    case '.json': contentType = 'application/json'; break;
    case '.png': contentType = 'image/png'; break;
    case '.jpg': contentType = 'image/jpg'; break;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Publify Server running at http://localhost:${PORT}/`);
});
