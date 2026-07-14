const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, execFile } = require('child_process');
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
 *   - Servir histórico/usuários em http://localhost:3333
 */
function httpGetJson(urlPath, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:3333${urlPath}`, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {
          json = null;
        }
        resolve({ status: res.statusCode, json });
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });
  });
}

/** @returns {'ready'|'stale'|'down'} */
async function probeApiDsx() {
  const ready = await httpGetJson('/ready');
  if (ready && ready.status === 200 && ready.json?.success && ready.json?.features?.includes?.('users')) {
    return 'ready';
  }

  // Fallback: API nova pode não ter cacheado /ready, mas /users existe.
  const users = await httpGetJson('/users');
  if (users && users.status === 200 && users.json?.success === true) {
    return 'ready';
  }

  const health = await httpGetJson('/health');
  if (health && health.status === 200) {
    return 'stale';
  }

  return 'down';
}

function freePort3333() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile(
        'cmd',
        ['/c', 'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :3333 ^| findstr LISTENING\') do taskkill /F /PID %a'],
        { windowsHide: true },
        () => resolve()
      );
      return;
    }

    execFile('lsof', ['-ti', 'tcp:3333'], (err, stdout) => {
      if (err || !stdout) {
        resolve();
        return;
      }
      const pids = String(stdout)
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (!pids.length) {
        resolve();
        return;
      }
      execFile('kill', ['-TERM', ...pids], () => {
        setTimeout(() => {
          execFile('kill', ['-KILL', ...pids], () => resolve());
        }, 400);
      });
    });
  });
}

async function waitForApiReady(timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await probeApiDsx();
    if (status === 'ready') return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function startApiDsx() {
  if (apiDsxProcess) {
    await waitForApiReady(15000);
    return;
  }

  const status = await probeApiDsx();
  if (status === 'ready') {
    console.log('[API-DSX] já em execução (pronta) em http://localhost:3333');
    return;
  }

  if (status === 'stale') {
    console.warn('[API-DSX] instância antiga detectada (sem /users). Reiniciando…');
    await freePort3333();
    await new Promise((r) => setTimeout(r, 500));
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

  const ready = await waitForApiReady(20000);
  if (ready) {
    console.log('[API-DSX] pronta em http://localhost:3333');
  } else {
    console.warn('[API-DSX] ainda não respondeu /ready a tempo');
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

const WALLPAPER_DIR = (userId) => {
  if (userId) return path.join(app.getPath('userData'), 'users', userId, 'wallpaper');
  return path.join(app.getPath('userData'), 'wallpapers');
};
const WALLPAPER_STATE_FILE = (userId) => path.join(WALLPAPER_DIR(userId), 'state.json');

let activeUserId = null;

async function ensureWallpaperDir(userId = activeUserId) {
  await fs.mkdir(WALLPAPER_DIR(userId), { recursive: true });
}

async function ensureUserDir(userId) {
  const dir = path.join(app.getPath('userData'), 'users', userId);
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(path.join(dir, 'wallpaper'), { recursive: true });
  await fs.mkdir(path.join(dir, 'avatar'), { recursive: true });
  return dir;
}

ipcMain.handle('user:setActive', async (_event, userId) => {
  activeUserId = userId || null;
  if (activeUserId) await ensureUserDir(activeUserId);
  return { ok: true, userId: activeUserId };
});

ipcMain.handle('user:getActive', () => activeUserId);

ipcMain.handle('user:saveAvatarDataUrl', async (_event, { userId, dataUrl }) => {
  if (!userId || !dataUrl || !dataUrl.startsWith('data:')) {
    throw new Error('avatar inválido');
  }
  await ensureUserDir(userId);
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('dataUrl inválido');
  const mime = match[1];
  let ext = '.jpg';
  if (mime.includes('png')) ext = '.png';
  else if (mime.includes('webp')) ext = '.webp';
  else if (mime.includes('gif')) ext = '.gif';
  const destPath = path.join(app.getPath('userData'), 'users', userId, 'avatar', `avatar${ext}`);
  await fs.writeFile(destPath, Buffer.from(match[2], 'base64'));
  return destPath;
});

ipcMain.handle('user:deleteUserData', async (_event, userId) => {
  if (!userId) return { ok: false };
  const dir = path.join(app.getPath('userData'), 'users', userId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  return { ok: true };
});

ipcMain.handle('wallpaper:readState', async (_event, payload) => {
  const userId = (payload && payload.userId) || activeUserId;
  try {
    const raw = await fs.readFile(WALLPAPER_STATE_FILE(userId), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
});

ipcMain.handle('wallpaper:saveState', async (_event, payload) => {
  const userId = (payload && payload.userId) || activeUserId;
  const state = payload && payload.state !== undefined ? payload.state : payload;
  await ensureWallpaperDir(userId);
  await fs.writeFile(WALLPAPER_STATE_FILE(userId), JSON.stringify(state), 'utf8');
  return true;
});

ipcMain.handle('wallpaper:importFile', async (_event, { sourcePath, type, userId }) => {
  if (!sourcePath) throw new Error('sourcePath obrigatorio');
  const uid = userId || activeUserId;
  await ensureWallpaperDir(uid);
  const ext = path.extname(sourcePath) || (type === 'video' ? '.mp4' : '.jpg');
  const destPath = path.join(WALLPAPER_DIR(uid), `wallpaper${ext}`);
  await fs.copyFile(sourcePath, destPath);
  return destPath;
});

ipcMain.handle('wallpaper:importDataUrl', async (_event, { dataUrl, userId }) => {
  if (!dataUrl || !dataUrl.startsWith('data:')) throw new Error('dataUrl invalido');
  const uid = userId || activeUserId;
  await ensureWallpaperDir(uid);
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('dataUrl invalido');
  const mime = match[1];
  let ext = '.jpg';
  if (mime.includes('png')) ext = '.png';
  else if (mime.includes('webp')) ext = '.webp';
  else if (mime.includes('gif')) ext = '.gif';
  const destPath = path.join(WALLPAPER_DIR(uid), `wallpaper${ext}`);
  await fs.writeFile(destPath, Buffer.from(match[2], 'base64'));
  return destPath;
});

ipcMain.handle('wallpaper:importBlob', async (_event, { buffer, ext, userId }) => {
  const uid = userId || activeUserId;
  await ensureWallpaperDir(uid);
  const safeExt = ext && ext.startsWith('.') ? ext : '.mp4';
  const destPath = path.join(WALLPAPER_DIR(uid), `wallpaper${safeExt}`);
  await fs.writeFile(destPath, Buffer.from(buffer));
  return destPath;
});

function postDownloadToApi(body, method = 'POST', id = null) {
  const data = JSON.stringify(body);
  const urlPath = id ? `/downloads/${id}` : '/downloads';
  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: 3333,
      path: urlPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    },
    (res) => {
      res.resume();
    }
  );
  req.on('error', () => {});
  req.write(data);
  req.end();
}

function attachDownloadTracking(webContents) {
  try {
    const ses = webContents.session;
    if (!ses || ses.__dsxDownloadHooked) return;
    ses.__dsxDownloadHooked = true;

    ses.on('will-download', (_event, item) => {
      if (!activeUserId) return;
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const startedAt = new Date().toISOString();
      postDownloadToApi({
        id,
        user_id: activeUserId,
        url: item.getURL(),
        filename: item.getFilename(),
        mime: item.getMimeType(),
        size: item.getTotalBytes() || null,
        state: 'progressing',
        save_path: null,
        started_at: startedAt,
      });

      item.once('done', (_e, state) => {
        postDownloadToApi(
          {
            filename: item.getFilename(),
            mime: item.getMimeType(),
            size: item.getReceivedBytes() || item.getTotalBytes() || null,
            state,
            save_path: item.getSavePath(),
            finished_at: new Date().toISOString(),
          },
          'PATCH',
          id
        );
      });
    });
  } catch (err) {
    console.warn('[Downloads] hook falhou:', err.message);
  }
}

app.on('web-contents-created', (_event, contents) => {
  attachDownloadTracking(contents);
});

app.whenReady().then(async () => {
  setupApplicationMenu();
  startMediaSdk();
  await startApiDsx();
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
