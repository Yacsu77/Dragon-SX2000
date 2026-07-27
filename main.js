const { app, BrowserWindow, ipcMain, dialog, Menu, session, screen, desktopCapturer } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, execFile } = require('child_process');
const fs = require('fs').promises;

let mediaSdkProcess = null;
let apiDsxProcess = null;
let isAppQuitting = false;

/**
 * Backend (API + SDK) vai em extraResources no build:
 *   <resources>/Backend/...
 * Em desenvolvimento fica em <repo>/Backend/...
 */
function resolveBackendPath(...parts) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'Backend', ...parts);
  }
  return path.join(__dirname, 'Backend', ...parts);
}

function backendChildEnv(extra = {}) {
  const userData = app.getPath('userData');
  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    DSX_PACKAGED: app.isPackaged ? '1' : '0',
    DSX_PROJECT_ROOT: app.isPackaged ? process.resourcesPath : __dirname,
    DSX_USER_DATA: userData,
    DSX_API_DB_PATH: path.join(userData, 'API-DSX', 'dsx-browser.db'),
    ...extra,
  };
}

/**
 * UA de Chrome “puro” (sem Electron) — WhatsApp/Discord leem a versão do Chrome
 * e rejeitam strings com Electron/ ou Chrome antigo.
 */
function buildChromeUserAgent() {
  const chrome = process.versions.chrome || '146.0.7680.65';
  let osToken = 'Windows NT 10.0; Win64; x64';
  if (process.platform === 'darwin') {
    osToken = 'Macintosh; Intel Mac OS X 10_15_7';
  } else if (process.platform === 'linux') {
    osToken = 'X11; Linux x86_64';
  }
  return (
    `Mozilla/5.0 (${osToken}) AppleWebKit/537.36 (KHTML, like Gecko) ` +
    `Chrome/${chrome} Safari/537.36`
  );
}

const DSX_BROWSER_UA = buildChromeUserAgent();

/**
 * UA honesto do Electron (com token Electron/DSX). É o padrão usado em todos os
 * sites, INCLUSIVE Google — que bloqueia login quando detecta UA de Chrome
 * "puro" vindo de um app embarcado. Capturado em tempo de execução.
 */
let DSX_DEFAULT_UA = '';

/**
 * UA por domínio: só WhatsApp/Discord recebem o Chrome "puro"; todo o resto
 * (incl. accounts.google.com) usa o UA honesto do Electron.
 */
const DSX_SPOOF_HOST_RE =
  /(?:^|\.)(?:whatsapp\.(?:com|net)|discord\.(?:com|gg|media)|discordapp\.(?:com|net))$/i;

function dsxHostFromUrl(url) {
  try {
    return new URL(url).hostname || '';
  } catch (_) {
    return '';
  }
}

function dsxShouldSpoofChrome(url) {
  return DSX_SPOOF_HOST_RE.test(dsxHostFromUrl(url));
}

function dsxUserAgentForUrl(url) {
  if (dsxShouldSpoofChrome(url)) return DSX_BROWSER_UA;
  return DSX_DEFAULT_UA || DSX_BROWSER_UA;
}

function hardenSession(ses) {
  if (!ses || ses.__dsxHardened) return;
  ses.__dsxHardened = true;

  // UA por domínio no nível do request (cobre navegação e sub-recursos).
  // WhatsApp/Discord => Chrome puro; resto (incl. Google) => UA honesto.
  try {
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      try {
        const ua = dsxUserAgentForUrl(details.url);
        if (ua) details.requestHeaders['User-Agent'] = ua;
      } catch (_) {
        /* ignore */
      }
      callback({ requestHeaders: details.requestHeaders });
    });
  } catch (_) {
    /* ignore */
  }

  // Base do navigator.userAgent = honesto; ajustado por navegação em web-contents-created.
  try {
    ses.setUserAgent(DSX_DEFAULT_UA || DSX_BROWSER_UA);
  } catch (_) {
    /* ignore */
  }

  try {
    ses.setPermissionRequestHandler((_wc, permission, callback) => {
      const allow = new Set([
        'media',
        'mediaKeySystem',
        'display-capture',
        'fullscreen',
        'notifications',
        'pointerLock',
        'clipboard-sanitized-write',
        'clipboard-read',
        'geolocation',
        'midiSysex',
        'idle-detection',
        'openExternal',
        'window-management',
      ]);
      callback(allow.has(String(permission || '')));
    });
  } catch (_) {
    /* ignore */
  }

  try {
    ses.setPermissionCheckHandler((_wc, permission) => {
      const allow = new Set([
        'media',
        'display-capture',
        'fullscreen',
        'notifications',
        'clipboard-sanitized-write',
      ]);
      return allow.has(String(permission || ''));
    });
  } catch (_) {
    /* ignore */
  }

  // Discord / Meet: getDisplayMedia precisa de handler explícito no Electron.
  if (typeof ses.setDisplayMediaRequestHandler === 'function') {
    const handler = async (request, callback) => {
      try {
        if (request?.frame) {
          callback({ video: request.frame, audio: 'loopback' });
          return;
        }
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 0, height: 0 },
        });
        const preferred =
          sources.find((s) => String(s.id || '').startsWith('screen:')) || sources[0];
        if (!preferred) {
          callback({});
          return;
        }
        callback({ video: preferred, audio: 'loopback' });
      } catch (err) {
        console.warn('[DSX] display-media:', err.message);
        callback({});
      }
    };
    try {
      ses.setDisplayMediaRequestHandler(handler, { useSystemPicker: true });
    } catch (_) {
      try {
        ses.setDisplayMediaRequestHandler(handler);
      } catch (err) {
        console.warn('[DSX] display-media handler:', err.message);
      }
    }
  }
}

function configureBrowserIdentity() {
  // Captura o UA honesto do Electron ANTES de qualquer override.
  try {
    DSX_DEFAULT_UA = session.defaultSession.getUserAgent() || '';
  } catch (_) {
    DSX_DEFAULT_UA = '';
  }
  try {
    app.userAgentFallback = DSX_DEFAULT_UA || DSX_BROWSER_UA;
  } catch (_) {
    /* ignore */
  }
  hardenSession(session.defaultSession);
}

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

  const sdkRoot = resolveBackendPath('SDK');
  const sdkEntry = path.join(sdkRoot, 'server.js');

  try {
    mediaSdkProcess = spawn(process.execPath, [sdkEntry], {
      cwd: sdkRoot,
      env: backendChildEnv(),
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

function expectedProjectRoot() {
  if (app.isPackaged) return path.resolve(process.resourcesPath);
  return path.resolve(__dirname);
}

function isSameApiProject(payload) {
  const incoming = path.resolve(payload?.project_root || '');
  const expected = expectedProjectRoot();
  if (incoming === expected) return true;
  // Compat: API antiga reportava o root do repo / asar
  if (incoming === path.resolve(__dirname)) return true;
  if (app.isPackaged && incoming.startsWith(path.resolve(process.resourcesPath))) return true;
  return false;
}

function isApiFromCurrentProject(payload) {
  // Exigir a feature mais recente força restart de instâncias antigas que
  // ficaram rodando sem as rotas novas (ex.: /history/suggestions).
  if (!payload?.success || !payload?.features?.includes?.('smart-suggestions')) {
    return false;
  }

  return isSameApiProject(payload);
}

/** @returns {'ready'|'starting'|'stale'|'down'} */
async function probeApiDsx() {
  const ready = await httpGetJson('/ready');
  if (ready?.json) {
    if (ready.status === 200 && ready.json.success) {
      return isApiFromCurrentProject(ready.json) ? 'ready' : 'stale';
    }

    // Listen cedo: DB/Redis ainda subindo (ou hydrate demorado no cold start).
    if (
      ready.json.starting === true &&
      isSameApiProject(ready.json) &&
      Array.isArray(ready.json.features) &&
      ready.json.features.includes('smart-suggestions')
    ) {
      return 'starting';
    }
  }

  // Uma API sem /ready compatível é antiga ou de outra pasta; libere a porta.
  // Não tratar /health sozinho como stale — a API nova responde health enquanto starting.
  const users = await httpGetJson('/users');
  if (users && users.status === 200 && users.json?.success === true) {
    return 'stale';
  }

  const health = await httpGetJson('/health');
  if (health && health.status === 200 && health.json?.starting !== true) {
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

async function waitForApiReady(timeoutMs = 90000) {
  const started = Date.now();
  let lastStatus = 'down';
  while (Date.now() - started < timeoutMs) {
    const status = await probeApiDsx();
    lastStatus = status;
    if (status === 'ready') return true;
    // starting = processo vivo materializando/DB; down = ainda pode estar no hydrate.
    const delay = status === 'starting' ? 350 : 500;
    await new Promise((r) => setTimeout(r, delay));
  }
  console.warn(`[API-DSX] waitForApiReady esgotou (último status=${lastStatus})`);
  return false;
}

let apiRestartAttempt = 0;
let apiStartInFlight = null;

async function startApiDsx() {
  if (apiStartInFlight) return apiStartInFlight;
  apiStartInFlight = startApiDsxInner().finally(() => {
    apiStartInFlight = null;
  });
  return apiStartInFlight;
}

async function startApiDsxInner() {
  if (apiDsxProcess) {
    await waitForApiReady(90000);
    return;
  }

  const status = await probeApiDsx();
  if (status === 'ready') {
    console.log('[API-DSX] já em execução (pronta) em http://localhost:3333');
    apiRestartAttempt = 0;
    return;
  }

  if (status === 'starting') {
    console.log('[API-DSX] já em execução (inicializando)…');
    const ready = await waitForApiReady(90000);
    if (ready) {
      console.log('[API-DSX] pronta em http://localhost:3333');
      apiRestartAttempt = 0;
    } else {
      console.warn('[API-DSX] ainda não respondeu /ready a tempo');
    }
    return;
  }

  if (status === 'stale') {
    console.warn('[API-DSX] instância antiga detectada. Reiniciando…');
  }

  // Sempre liberar a porta antes de subir: sockets zumbis (ex.: processo morto
  // sem fechar o bind) deixam o probe como "down" mas impedem o novo listen.
  await freePort3333();
  await new Promise((r) => setTimeout(r, 500));

  // boot.js materializa arquivos (iCloud/Desktop) antes do require — evita ETIMEDOUT no cold start.
  const apiRoot = resolveBackendPath('API-DSX');
  const apiEntry = path.join(apiRoot, 'boot.js');

  try {
    apiDsxProcess = spawn(process.execPath, [apiEntry], {
      cwd: apiRoot,
      env: backendChildEnv(),
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
        apiRestartAttempt += 1;
        const delay = Math.min(2000 * 2 ** Math.min(apiRestartAttempt - 1, 4), 30000);
        console.warn(
          `[API-DSX] reinício em ${delay}ms (tentativa ${apiRestartAttempt})` +
            (code === 1
              ? ' — se o erro for ETIMEDOUT, o projeto pode estar em pasta iCloud/Desktop ainda hidratando'
              : '')
        );
        setTimeout(() => {
          startApiDsx();
        }, delay);
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

  const ready = await waitForApiReady(90000);
  if (ready) {
    console.log('[API-DSX] pronta em http://localhost:3333');
    apiRestartAttempt = 0;
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
/** @type {Map<number, object>} snapshot de aba para nova janela (Janelas detach) */
const pendingWindowTabs = new Map();
/** @type {Map<number, { x: number, y: number, width: number, height: number }>} */
const tabsDropBoundsByHost = new Map();
/** @type {Map<number, { userId: string|null, cleanSession: boolean }>} */
const pendingWindowBoot = new Map();

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

function createBrowserWindow(pending = null) {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      // Mantém timers/compositor ativos com foco em outro monitor (RGB, UI).
      backgroundThrottling: false,
    },
  });

  let pendingUrl = null;
  let pendingTab = null;
  let bootUserId = activeUserId;
  let cleanSession = false;

  if (typeof pending === 'string') {
    pendingUrl = pending;
    cleanSession = true;
  } else if (pending && typeof pending === 'object') {
    pendingUrl = pending.url || null;
    pendingTab = pending.tab || null;
    if (pending.userId) bootUserId = pending.userId;
    cleanSession = Boolean(
      pending.cleanSession || pendingUrl || pendingTab
    );
  }

  if (pendingTab && typeof pendingTab === 'object') {
    pendingWindowTabs.set(win.webContents.id, pendingTab);
    cleanSession = true;
  } else if (pendingUrl && isAllowedNavigationUrl(pendingUrl)) {
    pendingWindowUrls.set(win.webContents.id, pendingUrl);
    cleanSession = true;
  }

  if (bootUserId || cleanSession) {
    pendingWindowBoot.set(win.webContents.id, {
      userId: bootUserId || null,
      cleanSession,
    });
  }

  attachWebviewPopupHandler(win);

  try {
    win.webContents.setBackgroundThrottling(false);
  } catch (_) {
    /* Electron antigo */
  }

  win.on('closed', () => {
    pendingWindowUrls.delete(win.webContents.id);
    pendingWindowTabs.delete(win.webContents.id);
    pendingWindowBoot.delete(win.webContents.id);
    tabsDropBoundsByHost.delete(win.webContents.id);
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

ipcMain.handle('cursor:create-window', async (_event, { url, userId } = {}) => {
  if (!url || typeof url !== 'string' || !isAllowedNavigationUrl(url)) {
    return { ok: false, error: 'invalid-url' };
  }
  try {
    createBrowserWindow({
      url,
      userId: userId || activeUserId || null,
      cleanSession: true,
    });
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

function sanitizePendingTab(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const isHome = Boolean(snapshot.is_home || snapshot.isHomeTab);
  const url = typeof snapshot.url === 'string' ? snapshot.url : null;
  if (!isHome && (!url || !isAllowedNavigationUrl(url))) return null;
  return {
    url: isHome ? null : url,
    title: typeof snapshot.title === 'string' ? snapshot.title : null,
    favicon_url: typeof snapshot.favicon_url === 'string' ? snapshot.favicon_url : null,
    is_home: isHome,
    active: true,
  };
}

ipcMain.handle('janelas:create-with-tab', async (_event, { snapshot, userId } = {}) => {
  const tab = sanitizePendingTab(snapshot);
  if (!tab) {
    return { ok: false, error: 'invalid-snapshot' };
  }
  try {
    createBrowserWindow({
      tab,
      userId: userId || activeUserId || null,
      cleanSession: true,
    });
    return { ok: true };
  } catch (err) {
    console.error('[Janelas] falha ao criar janela com aba:', err);
    return { ok: false, error: 'window-failed' };
  }
});

ipcMain.handle('janelas:consume-pending-tab', (event) => {
  const tab = pendingWindowTabs.get(event.sender.id);
  if (tab) {
    pendingWindowTabs.delete(event.sender.id);
    return tab;
  }
  return null;
});

ipcMain.handle('janelas:consume-pending-boot', (event) => {
  const boot = pendingWindowBoot.get(event.sender.id);
  if (boot) {
    pendingWindowBoot.delete(event.sender.id);
    return boot;
  }
  return null;
});

ipcMain.on('janelas:report-tabs-bounds', (event, bounds) => {
  if (
    !bounds ||
    typeof bounds.x !== 'number' ||
    typeof bounds.y !== 'number' ||
    typeof bounds.width !== 'number' ||
    typeof bounds.height !== 'number'
  ) {
    return;
  }
  tabsDropBoundsByHost.set(event.sender.id, {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  });
});

function pointInBounds(x, y, b) {
  return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
}

ipcMain.handle('janelas:resolve-drop-target', (event) => {
  const point = screen.getCursorScreenPoint();
  const sourceId = event.sender.id;

  for (const win of BrowserWindow.getAllWindows()) {
    if (!win || win.isDestroyed()) continue;
    // Ignora a janela fantasma do drag
    if (dragGhostWin && win === dragGhostWin) continue;

    const id = win.webContents.id;
    if (id === sourceId) continue;

    const reported = tabsDropBoundsByHost.get(id);
    if (reported && pointInBounds(point.x, point.y, reported)) {
      return { windowId: id, zone: 'tabs', screenX: point.x, screenY: point.y };
    }

    // Fallback: faixa superior do content (nav + abas)
    try {
      const content = win.getContentBounds();
      const tabsZone = {
        x: content.x,
        y: content.y,
        width: content.width,
        height: Math.min(160, Math.max(84, Math.round(content.height * 0.18))),
      };
      if (pointInBounds(point.x, point.y, tabsZone)) {
        return { windowId: id, zone: 'tabs', screenX: point.x, screenY: point.y };
      }
    } catch (_) {
      /* ignore */
    }
  }

  return null;
});

function broadcastDropIndicator(targetWindowId, screenX) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win || win.isDestroyed()) continue;
    const id = win.webContents.id;
    try {
      if (targetWindowId && id === targetWindowId) {
        win.webContents.send('janelas:drop-indicator', {
          show: true,
          screenX: screenX || null,
        });
      } else {
        win.webContents.send('janelas:drop-indicator', { show: false });
      }
    } catch (_) {
      /* ignore */
    }
  }
}

ipcMain.on('janelas:drag-hover', (event, payload = {}) => {
  const targetWindowId = Number(payload.targetWindowId);
  if (!Number.isFinite(targetWindowId)) {
    broadcastDropIndicator(null, null);
    return;
  }
  // Não destacar a própria janela origem aqui — o placeholder local cuida disso
  if (targetWindowId === event.sender.id) {
    broadcastDropIndicator(null, null);
    return;
  }
  broadcastDropIndicator(targetWindowId, payload.screenX);
});

ipcMain.on('janelas:drag-hover-clear', () => {
  broadcastDropIndicator(null, null);
});

ipcMain.handle('janelas:move-tab', async (event, { targetWindowId, snapshot } = {}) => {
  const tab = sanitizePendingTab(snapshot);
  if (!tab) {
    return { ok: false, error: 'invalid-snapshot' };
  }

  const targetId = Number(targetWindowId);
  if (!Number.isFinite(targetId)) {
    return { ok: false, error: 'invalid-target' };
  }

  if (targetId === event.sender.id) {
    return { ok: false, error: 'same-window' };
  }

  const target = BrowserWindow.getAllWindows().find(
    (w) => !w.isDestroyed() && w.webContents.id === targetId
  );
  if (!target) {
    return { ok: false, error: 'target-gone' };
  }

  try {
    target.webContents.send('janelas:receive-tab', tab);
    if (!target.isDestroyed()) {
      if (target.isMinimized()) target.restore();
      target.focus();
    }
    return { ok: true };
  } catch (err) {
    console.error('[Janelas] falha ao mover aba:', err);
    return { ok: false, error: 'send-failed' };
  }
});

/* ─── Ghost flutuante (drag entre janelas / monitores) ───────────────────── */
let dragGhostWin = null;
let dragGhostFollowTimer = null;
let dragGhostMeta = {
  offsetX: 40,
  offsetY: 14,
  mode: 'tab',
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDragGhostHtml(payload) {
  const title = escapeHtml(payload.title || 'Aba');
  const favicon = payload.favicon ? String(payload.favicon) : '';
  const thumb = payload.thumbnail ? String(payload.thumbnail) : '';
  const mode = payload.mode || 'tab';
  const faviconHtml = favicon
    ? `<img class="icon" src="${escapeHtml(favicon)}" alt="" />`
    : `<span class="icon-fallback">•</span>`;
  const bodyHtml =
    mode === 'detach' && thumb
      ? `<div class="shot"><img src="${escapeHtml(thumb)}" alt="" /></div>`
      : mode === 'detach'
        ? `<div class="shot hint">Nova janela</div>`
        : `<div class="row">${faviconHtml}<span class="title">${title}</span></div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<style>
  html,body{margin:0;padding:0;background:transparent;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
  .ghost{box-sizing:border-box;width:100%;height:100%;border-radius:12px;background:linear-gradient(to bottom,rgba(100,100,100,.95),rgba(80,80,80,.92));
    box-shadow:0 10px 28px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.2);color:#fff;display:flex;align-items:stretch;overflow:hidden;}
  .ghost.transfer{box-shadow:0 10px 28px rgba(0,0,0,.45),0 0 0 2px rgba(120,180,255,.9);}
  .ghost.detach{flex-direction:column;}
  .row{display:flex;align-items:center;gap:8px;padding:6px 10px 6px 12px;width:100%;}
  .icon{width:14px;height:14px;object-fit:contain;flex:0 0 auto;}
  .icon-fallback{width:14px;text-align:center;opacity:.7;}
  .title{flex:1;min-width:0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .shot{flex:1;background:#0e0e12;display:flex;align-items:center;justify-content:center;}
  .shot img{width:100%;height:100%;object-fit:cover;object-position:top center;}
  .hint{font-size:11px;color:rgba(255,255,255,.55);}
</style></head><body>
<div class="ghost ${escapeHtml(mode)}" id="g">${bodyHtml}</div>
<script>
  window.__setMode = function(mode){
    var el = document.getElementById('g');
    if(!el) return;
    el.className = 'ghost ' + (mode || 'tab');
  };
</script>
</body></html>`;
}

function stopDragGhostFollow() {
  if (dragGhostFollowTimer) {
    clearInterval(dragGhostFollowTimer);
    dragGhostFollowTimer = null;
  }
}

function destroyDragGhostWindow() {
  stopDragGhostFollow();
  if (dragGhostWin && !dragGhostWin.isDestroyed()) {
    try {
      dragGhostWin.close();
    } catch (_) {
      /* ignore */
    }
  }
  dragGhostWin = null;
}

function ensureDragGhostWindow() {
  if (dragGhostWin && !dragGhostWin.isDestroyed()) return dragGhostWin;
  dragGhostWin = new BrowserWindow({
    width: 180,
    height: 36,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    focusable: false,
    show: false,
    hasShadow: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  try {
    dragGhostWin.setIgnoreMouseEvents(true, { forward: true });
  } catch (_) {
    dragGhostWin.setIgnoreMouseEvents(true);
  }
  dragGhostWin.on('closed', () => {
    dragGhostWin = null;
    stopDragGhostFollow();
  });
  return dragGhostWin;
}

function followDragGhostCursor() {
  stopDragGhostFollow();
  dragGhostFollowTimer = setInterval(() => {
    if (!dragGhostWin || dragGhostWin.isDestroyed()) {
      stopDragGhostFollow();
      return;
    }
    const point = screen.getCursorScreenPoint();
    const x = Math.round(point.x - (dragGhostMeta.offsetX || 40));
    const y = Math.round(point.y - (dragGhostMeta.offsetY || 14));
    try {
      dragGhostWin.setPosition(x, y, false);
    } catch (_) {
      /* ignore */
    }
  }, 16);
}

ipcMain.on('janelas:drag-ghost-start', (event, payload = {}) => {
  const win = ensureDragGhostWindow();
  const mode = payload.mode || 'tab';
  const width = mode === 'detach' ? 168 : Math.max(80, Number(payload.width) || 160);
  const height = mode === 'detach' ? 128 : Math.max(28, Number(payload.height) || 32);
  dragGhostMeta = {
    offsetX: Number(payload.offsetX) || Math.round(width / 2),
    offsetY: Number(payload.offsetY) || Math.round(height / 2),
    mode,
  };

  const html = buildDragGhostHtml({
    title: payload.title,
    favicon: payload.favicon,
    thumbnail: payload.thumbnail,
    mode,
  });

  win.setSize(Math.round(width), Math.round(height), false);
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  const point = screen.getCursorScreenPoint();
  win.setPosition(
    Math.round(point.x - dragGhostMeta.offsetX),
    Math.round(point.y - dragGhostMeta.offsetY),
    false
  );
  if (!win.isVisible()) win.showInactive();
  followDragGhostCursor();
});

ipcMain.on('janelas:drag-ghost-update', (_event, payload = {}) => {
  if (!dragGhostWin || dragGhostWin.isDestroyed()) return;
  const mode = payload.mode || 'tab';
  const prevMode = dragGhostMeta.mode;
  dragGhostMeta.mode = mode;
  const width = mode === 'detach' ? 168 : Math.max(80, Number(payload.width) || dragGhostWin.getSize()[0]);
  const height = mode === 'detach' ? 128 : Math.max(28, Number(payload.height) || dragGhostWin.getSize()[1]);
  try {
    dragGhostWin.setSize(Math.round(width), Math.round(height), false);
    // Só reconstrói HTML quando o modo muda (evita ghost “sumindo” a cada frame)
    if (mode !== prevMode) {
      const html = buildDragGhostHtml({
        title: payload.title,
        favicon: payload.favicon,
        thumbnail: payload.thumbnail,
        mode,
      });
      dragGhostWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    } else {
      dragGhostWin.webContents
        .executeJavaScript(`window.__setMode && window.__setMode(${JSON.stringify(mode)})`, true)
        .catch(() => {});
    }
  } catch (_) {
    /* ignore */
  }
});

ipcMain.on('janelas:drag-ghost-end', () => {
  destroyDragGhostWindow();
});

ipcMain.handle('janelas:get-cursor-screen-point', () => {
  return screen.getCursorScreenPoint();
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

ipcMain.handle('session:listKnownOrigins', async () => {
  if (!activeUserId) return [];
  const partition = `persist:dragon-${activeUserId}`;
  const cookies = await session.fromPartition(partition).cookies.get({});
  const authName = /(^|[_-])(session|sess|sid|auth|token|login|account)([_-]|$)/i;
  const domains = new Set();
  cookies.forEach((cookie) => {
    if (!cookie?.domain) return;
    if (!authName.test(cookie.name || '') && !(cookie.httpOnly && cookie.secure)) return;
    const domain = cookie.domain.replace(/^\./, '').toLowerCase();
    if (domain && domain.includes('.')) domains.add(`https://${domain}`);
  });
  return Array.from(domains).slice(0, 100);
});

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
  // Só lê o wallpaper do userId explícito — nunca cai no activeUserId
  // para evitar vazar estado entre perfis.
  const userId = payload && payload.userId;
  if (!userId) return null;
  try {
    const raw = await fs.readFile(WALLPAPER_STATE_FILE(userId), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
});

ipcMain.handle('wallpaper:saveState', async (_event, payload) => {
  const userId = (payload && payload.userId) || activeUserId;
  if (!userId) throw new Error('userId obrigatório para salvar wallpaper');
  const state = payload && payload.state !== undefined ? payload.state : payload;
  await ensureWallpaperDir(userId);
  await fs.writeFile(WALLPAPER_STATE_FILE(userId), JSON.stringify(state), 'utf8');
  return true;
});

ipcMain.handle('wallpaper:importFile', async (_event, { sourcePath, type, userId }) => {
  if (!sourcePath) throw new Error('sourcePath obrigatorio');
  const uid = userId || activeUserId;
  if (!uid) throw new Error('userId obrigatório');
  await ensureWallpaperDir(uid);
  const ext = path.extname(sourcePath) || (type === 'video' ? '.mp4' : '.jpg');
  const destPath = path.join(WALLPAPER_DIR(uid), `wallpaper${ext}`);
  await fs.copyFile(sourcePath, destPath);
  return destPath;
});

ipcMain.handle('wallpaper:importDataUrl', async (_event, { dataUrl, userId }) => {
  if (!dataUrl || !dataUrl.startsWith('data:')) throw new Error('dataUrl invalido');
  const uid = userId || activeUserId;
  if (!uid) throw new Error('userId obrigatório');
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
  if (!uid) throw new Error('userId obrigatório');
  await ensureWallpaperDir(uid);
  const safeExt = ext && ext.startsWith('.') ? ext : '.mp4';
  const destPath = path.join(WALLPAPER_DIR(uid), `wallpaper${safeExt}`);
  await fs.writeFile(destPath, Buffer.from(buffer));
  return destPath;
});

const DEFAULT_WALLPAPER_FILES = ['WWP.jpg', 'WWP1.png', 'WWP3.jpg'];

function defaultWallpaperSourcePath(fileName) {
  return path.join(__dirname, 'UserINTer', 'Tabline', 'idget', 'Wallpaper', fileName);
}

ipcMain.handle('wallpaper:seedDefault', async (_event, { userId } = {}) => {
  const uid = userId || activeUserId;
  if (!uid) return { seeded: false, reason: 'no-user' };
  await ensureWallpaperDir(uid);
  try {
    await fs.access(WALLPAPER_STATE_FILE(uid));
    return { seeded: false, reason: 'already-has-state' };
  } catch {
    /* sem state — segue */
  }

  const available = [];
  for (const file of DEFAULT_WALLPAPER_FILES) {
    const src = defaultWallpaperSourcePath(file);
    try {
      await fs.access(src);
      available.push({ file, src });
    } catch {
      /* skip missing */
    }
  }
  if (!available.length) return { seeded: false, reason: 'no-assets' };

  const pick = available[Math.floor(Math.random() * available.length)];
  const ext = path.extname(pick.file) || '.jpg';
  const destPath = path.join(WALLPAPER_DIR(uid), `wallpaper${ext}`);
  await fs.copyFile(pick.src, destPath);
  const state = {
    type: 'image',
    dataUrl: destPath,
    transform: { x: 0, y: 0, rotate: 0, flipX: 1, flipY: 1 },
    source: pick.file,
  };
  await fs.writeFile(WALLPAPER_STATE_FILE(uid), JSON.stringify(state), 'utf8');
  return { seeded: true, path: destPath, source: pick.file };
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
  try {
    hardenSession(contents.session);
  } catch (_) {
    /* ignore */
  }

  // navigator.userAgent por domínio: acompanha o override de header por navegação.
  const applyUaForUrl = (url) => {
    try {
      if (typeof contents.setUserAgent === 'function' && url) {
        contents.setUserAgent(dsxUserAgentForUrl(url));
      }
    } catch (_) {
      /* ignore */
    }
  };

  try {
    applyUaForUrl(contents.getURL());
  } catch (_) {
    /* ignore */
  }

  contents.on('did-start-navigation', (_e, url, isInPlace, isMainFrame) => {
    if (isMainFrame) applyUaForUrl(url);
  });
});

app.whenReady().then(async () => {
  configureBrowserIdentity();
  setupApplicationMenu();
  startMediaSdk();
  await startApiDsx();
  createWindow();
});

app.on('activate', async () => {
  // macOS: reabrir janela sem matar a API (fica no dock).
  if (BrowserWindow.getAllWindows().length === 0) {
    await startApiDsx();
    createWindow();
  }
});

app.on('window-all-closed', () => {
  // No macOS o app costuma ficar vivo no dock — manter API/SDK ligados
  // evita cold start lento (e ETIMEDOUT) ao reabrir no mesmo dia/noite.
  if (process.platform === 'darwin') return;
  stopBackgroundServices();
  app.quit();
});

app.on('before-quit', () => {
  isAppQuitting = true;
  try {
    destroyDragGhostWindow();
  } catch (_) {
    /* ignore */
  }
  stopBackgroundServices();
});
app.on('will-quit', () => {
  isAppQuitting = true;
  stopBackgroundServices();
});

process.on('exit', stopBackgroundServices);
process.on('SIGINT', () => { stopBackgroundServices(); process.exit(0); });
process.on('SIGTERM', () => { stopBackgroundServices(); process.exit(0); });
