const { supabase } = require('./supabase');

module.exports = async (req, res) => {
  // Polyfills for raw Node HTTP server compatibility
  if (!res.status) {
    res.status = function(code) {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = function(data) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-meta-token');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const clientId = urlObj.searchParams.get('id');

  try {
    // 1. GET: List clients or get single client
    if (req.method === 'GET') {
      let query = supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (clientId) {
        query = query.eq('id', clientId).single();
      }
      const { data, error } = await query;
      if (error) throw error;
      res.status(200).json({ success: true, data });
      return;
    }

    // 2. POST / PUT: Create or update client
    if (req.method === 'POST' || req.method === 'PUT') {
      let body = '';
      if (req.body && typeof req.body === 'object') {
        body = req.body;
      } else {
        await new Promise((resolve) => {
          req.on('data', chunk => { body += chunk; });
          req.on('end', resolve);
        });
        try {
          body = typeof body === 'string' ? JSON.parse(body || '{}') : body;
        } catch (e) {
          body = {};
        }
      }

      const {
        id,
        name,
        email,
        phone,
        niche,
        meta_access_token,
        meta_account_id,
        target_roas,
        target_cpa,
        daily_budget,
        is_active
      } = body;

      if (!name) {
        res.status(400).json({ success: false, error: 'O nome do cliente é obrigatório.' });
        return;
      }

      const payload = {
        name,
        email: email || null,
        phone: phone || null,
        niche: niche || 'Geral',
        meta_access_token: meta_access_token || null,
        meta_account_id: meta_account_id || null,
        target_roas: target_roas !== undefined ? parseFloat(target_roas) : 4.0,
        target_cpa: target_cpa !== undefined ? parseFloat(target_cpa) : 15.00,
        daily_budget: daily_budget !== undefined ? parseFloat(daily_budget) : 50.00,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      };

      let result;
      if (id) {
        // Update existing
        result = await supabase.from('clients').update(payload).eq('id', id).select();
      } else {
        // Insert new
        result = await supabase.from('clients').insert([payload]).select();
      }

      if (result.error) throw result.error;
      res.status(200).json({ success: true, data: result.data ? result.data[0] : null });
      return;
    }

    // 3. DELETE: Remove client
    if (req.method === 'DELETE') {
      if (!clientId) {
        res.status(400).json({ success: false, error: 'ID do cliente não informado.' });
        return;
      }
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) throw error;
      res.status(200).json({ success: true, message: 'Cliente removido com sucesso.' });
      return;
    }

    res.status(405).json({ success: false, error: 'Método não permitido.' });
  } catch (err) {
    console.error('Clients API Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
