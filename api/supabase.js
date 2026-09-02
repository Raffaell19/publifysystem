const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv(key, fallback = '') {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(new RegExp(`${key}\\s*=\\s*([^\\r\\n]+)`));
      if (match) return match[1].trim();
    }
  } catch (e) {}
  return fallback;
}

const SUPABASE_URL = getEnv('SUPABASE_URL', 'https://mrmzdowaoadoqikauurl.supabase.co');
const SUPABASE_KEY = getEnv('SUPABASE_SECRET_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_PUBLISHABLE_KEY') || getEnv('SUPABASE_ANON_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
  supabase,
  getEnv
};
