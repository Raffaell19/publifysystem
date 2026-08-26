const https = require('https');

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

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'META_ACCESS_TOKEN não configurada nas variáveis de ambiente da Vercel.' });
    return;
  }

  try {
    // 1. Fetch Ad Accounts
    const accountsUrl = `https://graph.facebook.com/v20.0/me/adaccounts?fields=name,account_id,account_status,currency&access_token=${token}`;
    const accountsData = await httpsGet(accountsUrl);
    
    if (accountsData.error) {
      throw new Error(accountsData.error.message);
    }

    const accounts = accountsData.data || [];
    const result = [];

    // 2. Fetch Campaigns for each Account
    for (const acc of accounts) {
      const campUrl = `https://graph.facebook.com/v20.0/act_${acc.account_id}/campaigns?fields=name,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time,objective,buying_type,adsets{name,status,effective_status,optimization_goal,billing_event,bid_amount,destination_type,daily_budget,lifetime_budget},ads{name,status,effective_status,creative{name,body,image_url,title,object_story_spec}}&access_token=${token}`;
      const campData = await httpsGet(campUrl);
      
      result.push({
        id: acc.account_id,
        name: acc.name,
        status: acc.account_status,
        currency: acc.currency,
        campaigns: campData.data || []
      });
    }

    res.status(200).json({ accounts: result });
  } catch (err) {
    console.error('Vercel API error:', err);
    res.status(500).json({ error: err.message });
  }
};
