/**
 * 🛡️ SUPERVISOR & KEEP-ALIVE DO PORTAL DE TRANSPARÊNCIA
 * Mantém o túnel público do Cloudflare ativo 24/7 sem interrupções por inatividade.
 * Se o túnel cair ou reiniciar, reconecta automaticamente e atualiza os links.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const PORT = 3000;
const CLOUDFLARED_EXE = path.join(__dirname, 'cloudflared.exe');
const LINK_FILE = path.join(__dirname, 'PORTAL_TRANSPARENCIA_LINK.txt');
const PID_FILE = path.join(__dirname, '.tunnel_monitor.pid');
const LOG_FILE = path.join(__dirname, 'logs', 'tunnel_monitor.log');
const DASHBOARD_FILE = path.join(__dirname, 'dashboard.html');

let currentTunnelUrl = '';
try {
  if (fs.existsSync(LINK_FILE)) {
    const txt = fs.readFileSync(LINK_FILE, 'utf8');
    const m = txt.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (m) currentTunnelUrl = m[0];
  }
} catch (_) {}

let cloudflaredProc = null;
let serverProc = null;
let consecutiveFailures = 0;

// Registra PID do supervisor
try {
  fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
} catch (_) {}

function log(msg) {
  const line = `[${new Date().toLocaleString('pt-BR')}] ${msg}\n`;
  console.log(line.trim());
  try {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (_) {}
}

process.on('uncaughtException', (err) => {
  log(`⚠️ Uncaught Exception: ${err && err.stack ? err.stack : err}`);
});

process.on('unhandledRejection', (reason) => {
  log(`⚠️ Unhandled Rejection: ${reason}`);
});

process.on('exit', (code) => {
  log(`Supervisor encerrando com código ${code}`);
});


function updateLinkFiles(newUrl) {
  currentTunnelUrl = newUrl;
  const publicClienteUrl = `${newUrl}/cliente`;
  const publicDashboardUrl = `${newUrl}/dashboard`;

  // 1. Grava no arquivo de consulta rápida para o usuário
  const content = `=====================================================
🌐 PORTAL DE TRANSPARÊNCIA (NO AR E MONITORADO 24/7)
=====================================================
📱 Link do Candidato (WhatsApp / Transparência):
${publicClienteUrl}

📊 Link do Gestor (Dashboard Administrativa):
${publicDashboardUrl}

Última atualização: ${new Date().toLocaleString('pt-BR')}
Status: 🟢 100% ONLINE E ATIVO (Keep-Alive contínuo)
=====================================================
`;
  fs.writeFileSync(LINK_FILE, content, 'utf8');

  // 2. Atualiza links no dashboard se aplicável
  try {
    if (fs.existsSync(DASHBOARD_FILE)) {
      let html = fs.readFileSync(DASHBOARD_FILE, 'utf8');
      html = html.replace(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\/cliente/g, publicClienteUrl);
      fs.writeFileSync(DASHBOARD_FILE, html, 'utf8');
    }
  } catch (err) {
    log(`Erro ao atualizar dashboard.html: ${err.message}`);
  }

  log(`✅ Links atualizados com sucesso: ${publicClienteUrl}`);
}

function pingUrl(urlStr, timeoutMs = 8000) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(urlStr);
      const client = urlObj.protocol === 'https:' ? https : http;
      const req = client.get(urlStr, (res) => {
        res.resume(); // Consome o stream para liberar o socket
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve(false);
      });
      req.on('error', () => resolve(false));
    } catch (_) {
      resolve(false);
    }
  });
}

async function ensureLocalServer() {
  const localOk = await pingUrl(`http://localhost:${PORT}/api/gauchinho`, 3000);
  if (!localOk) {
    log('⚠️ Servidor local (localhost:3000) fora do ar. Iniciando server.js...');
    try {
      serverProc = spawn('node', ['server.js'], {
        cwd: __dirname,
        stdio: 'ignore'
      });
      serverProc.on('error', (err) => {
        log(`Erro no processo server.js: ${err.message}`);
      });
      // Aguarda 2 segundos para subir
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      log(`Erro ao iniciar server.js: ${e.message}`);
    }
  }
}

async function findActiveTunnelHostname() {
  for (const port of [20241, 20242]) {
    try {
      const res = await new Promise(resolve => {
        const req = http.get(`http://127.0.0.1:${port}/quicktunnel`, r => {
          let d = '';
          r.on('data', c => d += c);
          r.on('end', () => {
            try { resolve(JSON.parse(d)); } catch (_) { resolve(null); }
          });
        });
        req.setTimeout(600, () => {
          req.destroy();
          resolve(null);
        });
        req.on('error', () => resolve(null));
      });
      if (res && res.hostname) {
        return `https://${res.hostname}`;
      }
    } catch (_) {}
  }
  return null;
}

let isStartingTunnel = false;

function startCloudflared() {
  if (isStartingTunnel) return;
  isStartingTunnel = true;

  log('Iniciando novo processo do Cloudflare Tunnel...');
  try {
    try { execSync('taskkill /F /IM cloudflared.exe', { stdio: 'ignore' }); } catch (_) {}

    cloudflaredProc = spawn(CLOUDFLARED_EXE, ['tunnel', '--url', `http://127.0.0.1:${PORT}`, '--metrics', '127.0.0.1:20241'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const handleOutput = chunk => {
      const text = chunk.toString();
      const match = text.match(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/i);
      if (match && match[1].toLowerCase() !== 'api') {
        updateLinkFiles(match[0]);
        isStartingTunnel = false;
      }
    };

    cloudflaredProc.stdout.on('data', handleOutput);
    cloudflaredProc.stderr.on('data', handleOutput);

    cloudflaredProc.on('error', (err) => {
      log(`Erro no processo Cloudflared: ${err.message}`);
      isStartingTunnel = false;
    });

    cloudflaredProc.on('exit', (code) => {
      cloudflaredProc = null;
      log(`Cloudflared encerrou com código ${code}. Aguardando 5s para reconectar...`);
      setTimeout(() => {
        isStartingTunnel = false;
        startCloudflared();
      }, 5000);
    });
  } catch (err) {
    log(`Falha ao spawnar cloudflared: ${err.message}`);
    isStartingTunnel = false;
  }
}

async function supervisorLoop() {
  log('🛡️ Supervisor do Portal de Transparência ativado.');

  // 0. Garante que o server.js local está rodando
  await ensureLocalServer();

  // 1. Detecta se já tem túnel ativo rodando
  const existingHostname = await findActiveTunnelHostname();
  if (existingHostname && !existingHostname.includes('api.trycloudflare.com')) {
    log(`Túnel ativo já existente detectado: ${existingHostname}`);
    updateLinkFiles(existingHostname);
  } else {
    startCloudflared();
  }

  // 2. Loop de Keep-Alive a cada 30 segundos
  setInterval(async () => {
    await ensureLocalServer();

    if (currentTunnelUrl && !currentTunnelUrl.includes('api.trycloudflare.com')) {
      const publicOk = await pingUrl(`${currentTunnelUrl}/cliente`, 10000);
      if (publicOk) {
        consecutiveFailures = 0;
      } else {
        consecutiveFailures++;
        log(`⚠️ Túnel público (${currentTunnelUrl}) não respondeu (falha ${consecutiveFailures}/2).`);
        
        if (consecutiveFailures >= 2) {
          log('Verificando status do túnel ou gerando reconexão...');
          const activeHost = await findActiveTunnelHostname();
          if (activeHost && activeHost !== currentTunnelUrl && !activeHost.includes('api.trycloudflare.com')) {
            log(`Novo endereço ativo detectado no Cloudflare: ${activeHost}`);
            updateLinkFiles(activeHost);
            consecutiveFailures = 0;
          } else if (!cloudflaredProc) {
            log('Reiniciando Cloudflare Tunnel...');
            startCloudflared();
            consecutiveFailures = 0;
          }
        }
      }
    }
  }, 30000);
}


supervisorLoop().catch(err => {
  log(`Erro fatal no supervisor: ${err.message}`);
});
