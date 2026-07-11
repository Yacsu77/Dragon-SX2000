const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs').promises;

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

let mainWindow = null;
const pendingWindowUrls = new Map();

// Combos de atalho "globais" por janela host (webContents.id → Set<combo>).
// São atalhos que precisam funcionar mesmo com o foco dentro de um site
// (webview), como a paleta de busca (Ctrl+Space).
const globalCombosByHost = new Map();
// Combos de hold (keydown + keyup), ex.: Alt do menu radial.
const globalHoldCombosByHost = new Map();

function isAllowedNavigationUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Constrói o combo canônico a partir de um evento before-input-event.
 * Deve espelhar `comboFromEvent` do ShortcutManager (renderer).
 */
function comboFromInput(input) {
  const keyName = input && input.key ? String(input.key) : '';
  const bareModMap = {
    Alt: 'Alt',
    AltGraph: 'Alt',
    Option: 'Alt',
    Control: 'Ctrl',
    Ctrl: 'Ctrl',
    Shift: 'Shift',
    Meta: 'Meta',
  };
  const bareMod = bareModMap[keyName];
  if (bareMod) {
    const otherDown =
      (bareMod !== 'Ctrl' && input.control) ||
      (bareMod !== 'Shift' && input.shift) ||
      (bareMod !== 'Alt' && input.alt) ||
      (bareMod !== 'Meta' && input.meta);
    if (!otherDown) return bareMod;
  }

  const mods = [];
  if (input.control) mods.push('Ctrl');
  if (input.shift) mods.push('Shift');
  if (input.alt) mods.push('Alt');
  if (input.meta) mods.push('Meta');

  let main = input.key;
  if (main === ' ' || input.code === 'Space') main = 'Space';
  else if (main && main.length === 1 && /[a-z]/i.test(main)) main = main.toUpperCase();
  if (main === 'Esc') main = 'Escape';
  if (main === 'Del') main = 'Delete';

  if (!main || bareModMap[main]) return '';
  return [...mods, main].join('+');
}

function attachWebviewPopupHandler(win) {
  win.webContents.on('did-attach-webview', (_event, guestWebContents) => {
    guestWebContents.setWindowOpenHandler(({ url }) => {
      if (isAllowedNavigationUrl(url) && !win.isDestroyed()) {
        win.webContents.send('browser:open-url', url);
      }
      return { action: 'deny' };
    });

    // Intercepta atalhos globais mesmo quando o foco está dentro do site.
    // Sem isso, o guest (site) consome a tecla e o listener global do renderer
    // host nunca recebe o evento (ex.: Ctrl+Space navegando em uma página).
    guestWebContents.on('before-input-event', (inputEvent, input) => {
      if (win.isDestroyed()) return;

      const combos = globalCombosByHost.get(win.webContents.id);
      const holdCombos = globalHoldCombosByHost.get(win.webContents.id);
      if ((!combos || combos.size === 0) && (!holdCombos || holdCombos.size === 0)) return;

      const combo = comboFromInput(input);
      if (!combo) return;

      const isHold = holdCombos && holdCombos.has(combo);
      const isPress = combos && combos.has(combo);

      if (input.type === 'keyDown' && (isPress || isHold)) {
        inputEvent.preventDefault();
        win.webContents.send('shortcuts:global-combo', { combo, phase: 'down' });
        return;
      }

      if (input.type === 'keyUp' && isHold) {
        inputEvent.preventDefault();
        win.webContents.send('shortcuts:global-combo', { combo, phase: 'up' });
      }
    });
  });
}

function createBrowserWindow(pendingUrl = null) {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
    },
  });

  if (pendingUrl && isAllowedNavigationUrl(pendingUrl)) {
    pendingWindowUrls.set(win.webContents.id, pendingUrl);
  }

  attachWebviewPopupHandler(win);

  win.on('closed', () => {
    pendingWindowUrls.delete(win.webContents.id);
    globalCombosByHost.delete(win.webContents.id);
    globalHoldCombosByHost.delete(win.webContents.id);
    if (mainWindow === win) mainWindow = null;
  });

  win.loadFile('Frontend/src/index.html');
  return win;
}

function createWindow() {
  mainWindow = createBrowserWindow();
}

/**
 * No Windows/Linux o menu padrão do Electron registra aceleradores globais
 * (Ctrl+R = Reload, Ctrl+Shift+R = Force Reload, Ctrl+W = Close Window) que
 * seriam capturados ANTES do renderer, recarregando/fechando a janela inteira
 * e conflitando com os atalhos do app. Removemos o menu para que o
 * ShortcutManager seja a fonte única dos atalhos. (No macOS o menu usa Cmd,
 * então mantemos o padrão para preservar Cmd+C/V/etc.)
 */
function setupApplicationMenu() {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
  }
}

ipcMain.handle('cursor:create-window', async (_event, { url }) => {
  if (!url || typeof url !== 'string' || !isAllowedNavigationUrl(url)) {
    return { ok: false, error: 'invalid-url' };
  }
  try {
    createBrowserWindow(url);
    return { ok: true };
  } catch (err) {
    console.error('[CursorControll] falha ao criar janela:', err);
    return { ok: false, error: 'window-failed' };
  }
});

ipcMain.handle('cursor:consume-pending-url', (event) => {
  const url = pendingWindowUrls.get(event.sender.id);
  if (url) {
    pendingWindowUrls.delete(event.sender.id);
    return url;
  }
  return null;
});

ipcMain.on('shortcuts:set-global-combos', (event, combos) => {
  const list = Array.isArray(combos) ? combos.filter((c) => typeof c === 'string' && c) : [];
  globalCombosByHost.set(event.sender.id, new Set(list));
});

ipcMain.on('shortcuts:set-global-hold-combos', (event, combos) => {
  const list = Array.isArray(combos) ? combos.filter((c) => typeof c === 'string' && c) : [];
  globalHoldCombosByHost.set(event.sender.id, new Set(list));
});

ipcMain.handle('files:readDir', async (_event, dirPath) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
    path: path.join(dirPath, entry.name),
  }));
});

ipcMain.handle('files:getHome', () => app.getPath('home'));

ipcMain.handle('files:pickFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

const WALLPAPER_DIR = () => path.join(app.getPath('userData'), 'wallpapers');
const WALLPAPER_STATE_FILE = () => path.join(WALLPAPER_DIR(), 'state.json');

async function ensureWallpaperDir() {
  await fs.mkdir(WALLPAPER_DIR(), { recursive: true });
}

ipcMain.handle('wallpaper:readState', async () => {
  try {
    const raw = await fs.readFile(WALLPAPER_STATE_FILE(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
});

ipcMain.handle('wallpaper:saveState', async (_event, payload) => {
  await ensureWallpaperDir();
  await fs.writeFile(WALLPAPER_STATE_FILE(), JSON.stringify(payload), 'utf8');
  return true;
});

ipcMain.handle('wallpaper:importFile', async (_event, { sourcePath, type }) => {
  if (!sourcePath) throw new Error('sourcePath obrigatorio');
  await ensureWallpaperDir();
  const ext = path.extname(sourcePath) || (type === 'video' ? '.mp4' : '.jpg');
  const destPath = path.join(WALLPAPER_DIR(), `wallpaper${ext}`);
  await fs.copyFile(sourcePath, destPath);
  return destPath;
});

ipcMain.handle('wallpaper:importDataUrl', async (_event, { dataUrl }) => {
  if (!dataUrl || !dataUrl.startsWith('data:')) throw new Error('dataUrl invalido');
  await ensureWallpaperDir();
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('dataUrl invalido');
  const mime = match[1];
  let ext = '.jpg';
  if (mime.includes('png')) ext = '.png';
  else if (mime.includes('webp')) ext = '.webp';
  else if (mime.includes('gif')) ext = '.gif';
  const destPath = path.join(WALLPAPER_DIR(), `wallpaper${ext}`);
  await fs.writeFile(destPath, Buffer.from(match[2], 'base64'));
  return destPath;
});

ipcMain.handle('wallpaper:importBlob', async (_event, { buffer, ext }) => {
  await ensureWallpaperDir();
  const safeExt = ext && ext.startsWith('.') ? ext : '.mp4';
  const destPath = path.join(WALLPAPER_DIR(), `wallpaper${safeExt}`);
  await fs.writeFile(destPath, Buffer.from(buffer));
  return destPath;
});

app.whenReady().then(() => {
  setupApplicationMenu();
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
