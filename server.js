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

// HTTPS GET Request Helper (returns Promise)
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

// Main API Handler
async function handleApiData(req, res) {
  const token = getMetaToken();
  if (!token) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'META_ACCESS_TOKEN not found in .env' }));
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

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ accounts: result }));
  } catch (err) {
    console.error('API proxy error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// Server Creation
const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.url === '/api/data') {
    handleApiData(req, res);
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  
  // Guard against path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const extname = path.extname(filePath);
  let contentType = 'text/html';
  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
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
  console.log(`Server running at http://localhost:${PORT}/`);
});
