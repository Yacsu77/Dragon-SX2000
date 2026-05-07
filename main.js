const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mediaSdkProcess = null;

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
  createWindow();
});

app.on('window-all-closed', () => {
  stopMediaSdk();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', stopMediaSdk);
app.on('will-quit', stopMediaSdk);

process.on('exit', stopMediaSdk);
process.on('SIGINT', () => { stopMediaSdk(); process.exit(0); });
process.on('SIGTERM', () => { stopMediaSdk(); process.exit(0); });
