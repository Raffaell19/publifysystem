const https = require('https');

https.get('https://printers-cds-buttons-bidder.trycloudflare.com/api/gauchinho', (res) => {
  console.log('STATUS:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('JSON SUCCESS:', json.success, 'CLIENT:', json.client && json.client.name);
    } catch(e) {
      console.log('NOT JSON:', data.slice(0, 100));
    }
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
