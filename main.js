const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

let mediaSdkProcess = null;
let apiDsxProcess = null;
let isAppQuitting = false;

/**
 * Sobe o Dragon Media SDK como processo filho.
 *
 * O SDK roda em processo separado para:
 *   - Não bloquear o renderer (o binding nativo SMTC é Rust e pode ter latência)
 *   - Permitir crashes/restart isolados
 *   - Comunicar exclusivamente via WebSocket (ws://127.0.0.1:8974), igual ao
 *     que clientes externos veriam.
 */
function startMediaSdk() {
  if (mediaSdkProcess) return;

  const sdkEntry = path.join(__dirname, 'Backend', 'SDK', 'server.js');

  try {
    mediaSdkProcess = spawn(process.execPath, [sdkEntry], {
      cwd: path.join(__dirname, 'Backend', 'SDK'),
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    mediaSdkProcess.stdout.on('data', (chunk) => {
      process.stdout.write(`[SDK] ${chunk}`);
    });
    mediaSdkProcess.stderr.on('data', (chunk) => {
      process.stderr.write(`[SDK] ${chunk}`);
    });
    mediaSdkProcess.on('exit', (code, signal) => {
      console.log(`[SDK] processo encerrado (code=${code} signal=${signal})`);
      mediaSdkProcess = null;
    });
    mediaSdkProcess.on('error', (err) => {
      console.error('[SDK] falha ao iniciar:', err.message);
      mediaSdkProcess = null;
    });

    console.log(`[SDK] iniciando em ${sdkEntry}`);
  } catch (err) {
    console.error('[SDK] exceção ao iniciar:', err);
    mediaSdkProcess = null;
  }
}

function stopMediaSdk() {
  if (!mediaSdkProcess) return;
  try {
    mediaSdkProcess.kill('SIGTERM');
  } catch (_) { /* ignore */ }
  mediaSdkProcess = null;
}

/**
 * Sobe a API local API-DSX como processo filho.
 *
 * A API roda em processo separado para:
 *   - Não bloquear o renderer do Electron
 *   - Permitir crashes/restart isolados
 *   - Servir histórico de navegação em http://localhost:3333
 */
function isApiDsxRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3333/health', (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });

    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startApiDsx() {
  if (apiDsxProcess) return;

  if (await isApiDsxRunning()) {
    console.log('[API-DSX] já em execução em http://localhost:3333');
    return;
  }

  const apiEntry = path.join(__dirname, 'Backend', 'API-DSX', 'app.js');

  try {
    apiDsxProcess = spawn(process.execPath, [apiEntry], {
      cwd: path.join(__dirname, 'Backend', 'API-DSX'),
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    apiDsxProcess.stdout.on('data', (chunk) => {
      process.stdout.write(`[API-DSX] ${chunk}`);
    });
    apiDsxProcess.stderr.on('data', (chunk) => {
      process.stderr.write(`[API-DSX] ${chunk}`);
    });
    apiDsxProcess.on('exit', (code, signal) => {
      console.log(`[API-DSX] processo encerrado (code=${code} signal=${signal})`);
      apiDsxProcess = null;

      if (!isAppQuitting && code !== 0) {
        setTimeout(() => {
          startApiDsx();
        }, 2000);
      }
    });
    apiDsxProcess.on('error', (err) => {
      console.error('[API-DSX] falha ao iniciar:', err.message);
      apiDsxProcess = null;
    });

    console.log(`[API-DSX] iniciando em ${apiEntry}`);
  } catch (err) {
    console.error('[API-DSX] exceção ao iniciar:', err);
    apiDsxProcess = null;
  }
}

function stopApiDsx() {
  if (!apiDsxProcess) return;
  try {
    apiDsxProcess.kill('SIGTERM');
  } catch (_) { /* ignore */ }
  apiDsxProcess = null;
}

function stopBackgroundServices() {
  stopMediaSdk();
  stopApiDsx();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    }
  });

  win.loadFile('Frontend/src/index.html');
}

app.whenReady().then(() => {
  startMediaSdk();
  startApiDsx();
  createWindow();
});

app.on('window-all-closed', () => {
  stopBackgroundServices();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isAppQuitting = true;
  stopBackgroundServices();
});
app.on('will-quit', () => {
  isAppQuitting = true;
  stopBackgroundServices();
});

process.on('exit', stopBackgroundServices);
process.on('SIGINT', () => { stopBackgroundServices(); process.exit(0); });
process.on('SIGTERM', () => { stopBackgroundServices(); process.exit(0); });
