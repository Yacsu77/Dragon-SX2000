/**
 * Ações executadas dentro da janela real.
 *
 * Cada função usa a interface que o usuário já tem: formulário de perfil,
 * createTab, painel lateral, AutoTune, wallpaper, atalhos e a API local.
 * Nada aqui roda no processo principal.
 */

const STEP_DELAY_MS = 2000;
const LOAD_TIMEOUT_MS = 45000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(check, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (check()) return true;
    await sleep(100);
  }
  return false;
}

async function createSuiteUser(nickname, password) {
  const started = Date.now();
  const gateReady = await waitFor(() => document.querySelector('.user-gate__tile--add'), 60000);
  const add = document.querySelector('.user-gate__tile--add');
  if (!gateReady || !add) {
    return { ok: false, error: 'tela de perfil não apareceu', durationMs: Date.now() - started };
  }
  add.click();
  const form = document.querySelector('[data-role="create-form"]');
  if (!form) return { ok: false, error: 'formulário de perfil não abriu', durationMs: Date.now() - started };
  form.elements.nickname.value = nickname;
  form.elements.password.value = password;
  form.requestSubmit();
  const userReady = await waitFor(
    () => window.UserSession && window.UserSession.getActiveUserId && window.UserSession.getActiveUserId(),
    30000
  );
  const userAt = Date.now();
  if (!userReady) {
    return { ok: false, error: 'usuário não ficou ativo', durationMs: userAt - started };
  }
  const workspace = await waitFor(() => {
    return document.getElementById('tabs')
      && document.querySelector('[data-autotune-panel-toggle]')
      && document.querySelector('.wallpaper-recommended-card')
      && window.ShortcutManager
      && window.SidePanelHost;
  }, 90000);
  return {
    ok: workspace,
    userId: window.UserSession.getActiveUserId(),
    createMs: userAt - started,
    workspaceMs: Date.now() - userAt,
    durationMs: Date.now() - started,
    error: workspace ? null : 'área de abas não montou',
  };
}

function timeWebview(webview, timeoutMs) {
  const opened = Date.now();
  return new Promise((resolve) => {
    let start = null;
    let settled = false;
    const done = (reason) => {
      if (settled) return;
      settled = true;
      const end = Date.now();
      resolve({
        ok: reason === 'stop',
        reason,
        startedAt: start || opened,
        finishedAt: end,
        loadMs: end - (start || opened),
      });
    };
    const timer = setTimeout(() => done('timeout'), timeoutMs);
    webview.addEventListener('did-start-loading', () => {
      if (start == null) start = Date.now();
    });
    const finishLoad = () => {
      clearTimeout(timer);
      done('stop');
    };
    webview.addEventListener('did-finish-load', finishLoad);
    webview.addEventListener('did-stop-loading', finishLoad);
    webview.addEventListener('did-fail-load', (event) => {
      if (event && event.errorCode === -3) return;
      clearTimeout(timer);
      done('fail');
    });
    webview.addEventListener('dom-ready', () => {
      try {
        if (typeof webview.isLoading === 'function' && !webview.isLoading()) done('stop');
      } catch (_) {
        /* o guest ainda não aceita consulta */
      }
    });
  });
}

async function openTab(url, title) {
  const id = window.createTab(url, title);
  const webview = document.querySelector(`webview[data-id="${id}"]`);
  if (!webview) return { ok: false, error: 'webview não criado', tabId: id, url };
  const timing = await timeWebview(webview, LOAD_TIMEOUT_MS);
  return { tabId: id, url, title, ...timing, error: timing.ok ? null : timing.reason };
}

async function openSidePanel(url, title, itemId) {
  if (window.PerfSettings && window.PerfSettings.setKeepSidebarPanels) {
    window.PerfSettings.setKeepSidebarPanels(true);
  }
  const opened = Date.now();
  window.SidePanelHost.open({ url, title, itemId });
  const webview = document.querySelector(`.side-panel__webview[data-requested-url="${url}"]`)
    || document.querySelector('.side-panel__webview.is-active');
  if (!webview) return { ok: false, error: 'painel lateral sem webview', url };
  const timing = await timeWebview(webview, LOAD_TIMEOUT_MS);
  return {
    url,
    title,
    keepAlive: !!(window.PerfSettings && window.PerfSettings.isKeepSidebarPanels && window.PerfSettings.isKeepSidebarPanels()),
    openedAt: opened,
    ...timing,
    error: timing.ok ? null : timing.reason,
  };
}

async function splitFirstTab() {
  const started = Date.now();
  const tab = document.querySelector('#tabs .tab');
  if (!tab || !window.Janelas || !window.Janelas.splitTab) {
    return { ok: false, error: 'não há aba para dividir', durationMs: Date.now() - started };
  }
  const state = window.Janelas.splitTab(tab.dataset.id, 'right');
  const ok = !!(state && state.mode === 'split');
  return {
    ok,
    mode: state && state.mode,
    loadMs: Date.now() - started,
    durationMs: Date.now() - started,
    error: ok ? null : 'split não abriu',
  };
}

async function openWindowFromTab() {
  const started = Date.now();
  const tab = document.querySelector('#tabs .tab');
  const bridge = window.Janelas && window.Janelas.NS && window.Janelas.NS.WindowBridge;
  if (!tab || !bridge || !bridge.createWithTab) {
    return { ok: false, error: 'ponte de janela indisponível', durationMs: Date.now() - started };
  }
  const snapshot = window.getTabSnapshot ? window.getTabSnapshot(tab.dataset.id) : null;
  const payload = snapshot && (snapshot.url || snapshot.is_home)
    ? snapshot
    : { url: 'https://pt.wikipedia.org/wiki/Wikipédia', title: 'Wikipédia' };
  const ok = await bridge.createWithTab(payload);
  return {
    ok: !!ok,
    loadMs: Date.now() - started,
    durationMs: Date.now() - started,
    error: ok ? null : 'createWithTab recusou',
  };
}

async function toggleAutotune(type, active) {
  const started = Date.now();
  window.location.hash = 'autotune-widget';
  const input = document.querySelector(`[data-autotune-panel-toggle="${type}"]`);
  if (!input) {
    return { ok: false, type, active, error: 'interruptor não encontrado', durationMs: Date.now() - started };
  }
  input.checked = active;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true, type, active, loadMs: Date.now() - started, durationMs: Date.now() - started };
}

async function mediaCommand(action) {
  const started = Date.now();
  if (!window.DragonMedia || !window.DragonMedia.command) {
    return { ok: false, action, error: 'SDK de mídia indisponível', durationMs: Date.now() - started };
  }
  const result = await new Promise((resolve) => {
    let settled = false;
    let off = function () {};
    const timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), 8000);
    function finish(value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      off();
      resolve(value || { ok: false, error: 'vazio' });
    }
    off = window.DragonMedia.on('command_result', (data) => finish(data));
    window.DragonMedia.command(action).then((value) => {
      if (value && value.ok) finish(value);
    });
  });
  const ok = !!(result && result.ok);
  return {
    ok,
    action,
    error: ok ? null : (result && (result.error || result.message)) || 'sem resposta',
    loadMs: Date.now() - started,
    durationMs: Date.now() - started,
  };
}

async function applyWallpaper(index) {
  const started = Date.now();
  window.location.hash = 'wallpaper-widget';
  await sleep(300);
  const cards = document.querySelectorAll('.wallpaper-recommended-card');
  const card = cards[index];
  const button = document.getElementById('applyWallpaper');
  if (!card || !button) {
    return { ok: false, index, error: 'seletor de wallpaper não montou', durationMs: Date.now() - started };
  }
  card.click();
  button.click();
  const seen = await waitFor(() => {
    const label = document.getElementById('wallpaperStatus');
    return label && /aplicado/i.test(label.textContent || '');
  }, 20000);
  return {
    ok: seen,
    index,
    label: card.getAttribute('title') || String(index),
    loadMs: Date.now() - started,
    durationMs: Date.now() - started,
    error: seen ? null : 'wallpaper não confirmou aplicação',
  };
}

async function exerciseShortcuts() {
  const started = Date.now();
  try {
  if (!window.ShortcutManager || !window.AtalhosScreen) {
    return { ok: false, error: 'atalhos não carregaram', steps: [], durationMs: Date.now() - started };
  }
  await window.AtalhosScreen.open();
  const list = window.ShortcutManager.getAll().map((item) => ({
    id: item.id,
    category: item.category || 'Geral',
    keys: item.keys || '',
  }));
  const steps = [];
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i];
    if (i > 0) await sleep(STEP_DELAY_MS);
    const stepStart = Date.now();
    const temp = 'Alt+Shift+F13';
    const changed = window.ShortcutManager.setBinding(item.id, temp);
    let fired = false;
    try {
      fired = !!window.ShortcutManager.triggerCombo(temp, { phase: 'down', source: 'suite' });
    } catch (err) {
      fired = false;
    }
    window.ShortcutManager.setBinding(item.id, item.keys);
    const restored = window.ShortcutManager.getAll().find((entry) => entry.id === item.id);
    const ok = changed && restored && (restored.keys || '') === item.keys;
    steps.push({
      name: `${item.category}: ${item.id}`,
      ok,
      fired,
      delayBeforeMs: i > 0 ? STEP_DELAY_MS : 0,
      durationMs: Date.now() - stepStart,
      loadMs: Date.now() - stepStart,
      error: ok ? null : 'atalho não voltou ao valor original',
    });
  }
  if (window.AtalhosScreen.close) window.AtalhosScreen.close();
  return {
    ok: steps.every((step) => step.ok),
    steps,
    durationMs: Date.now() - started,
  };
  } catch (err) {
    return {
      ok: false,
      error: err && err.message ? err.message : String(err),
      steps: [],
      durationMs: Date.now() - started,
    };
  }
}

async function timeCall(name, run) {
  const started = Date.now();
  try {
    const value = await run();
    return { name, ok: true, durationMs: Date.now() - started, loadMs: Date.now() - started, value };
  } catch (err) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - started,
      loadMs: Date.now() - started,
      error: err && err.message ? err.message : String(err),
    };
  }
}

async function exerciseDatabase(password) {
  try {
  const userId = window.UserSession.getActiveUserId();
  const steps = [];
  const push = (step) => {
    steps.push({
      name: step.name,
      ok: step.ok,
      durationMs: step.durationMs,
      loadMs: step.loadMs,
      error: step.error || null,
    });
    return step;
  };

  push(await timeCall('histórico: criar', () => window.HistoryApi.createHistoryEntry({
    url: 'https://suite.dsx.local/visita',
    title: 'Visita da suíte',
    user_id: userId,
  })));
  push(await timeCall('histórico: listar', () => window.HistoryApi.fetchHistory({ user_id: userId })));

  push(await timeCall('favorito: criar', () => window.FavoritesApi.create({
    user_id: userId,
    url: 'https://suite.dsx.local/favorito',
    title: 'Favorito da suíte',
  })));
  const favorite = steps[steps.length - 1];
  push(await timeCall('favorito: listar', () => window.FavoritesApi.list(userId)));
  if (favorite.ok && favorite.value && favorite.value.id) {
    push(await timeCall('favorito: apagar', () => window.FavoritesApi.remove(favorite.value.id, userId)));
  }

  push(await timeCall('download: criar', () => window.DownloadsApi.create({
    user_id: userId,
    url: 'https://suite.dsx.local/arquivo.bin',
    filename: 'arquivo.bin',
    state: 'progressing',
  })));
  const download = steps[steps.length - 1];
  if (download.ok && download.value && download.value.id) {
    push(await timeCall('download: atualizar', () => window.DownloadsApi.update(download.value.id, {
      user_id: userId,
      state: 'completed',
    })));
    push(await timeCall('download: apagar', () => window.DownloadsApi.remove(download.value.id, userId)));
  }

  push(await timeCall('cofre: desbloquear', () => window.VaultApi.unlock(userId, password)));
  const unlock = steps[steps.length - 1];
  const token = unlock.ok && unlock.value ? unlock.value.token : window.UserSession.getVaultToken && window.UserSession.getVaultToken();
  if (token) {
    push(await timeCall('cofre: criar', () => window.VaultApi.create({
      user_id: userId,
      origin: 'https://suite.dsx.local',
      username: 'suite',
      password: 'segredo-suite',
      token,
    })));
    const secret = steps[steps.length - 1];
    if (secret.ok && secret.value && secret.value.id) {
      push(await timeCall('cofre: revelar', () => window.VaultApi.reveal(secret.value.id, userId, token)));
      push(await timeCall('cofre: apagar', () => window.VaultApi.remove(secret.value.id, userId)));
    }
    push(await timeCall('cofre: trancar', () => window.VaultApi.lock(userId, token)));
  }

  push(await timeCall('grupo: criar', () => window.TabGroupsApi.create({
    user_id: userId,
    name: 'Suíte',
    color: '#7a8cff',
  })));
  const group = steps[steps.length - 1];
  if (group.ok && group.value && group.value.id) {
    push(await timeCall('grupo: abas', () => window.TabGroupsApi.replaceTabs(group.value.id, {
      user_id: userId,
      tabs: [{ url: 'https://suite.dsx.local/aba', title: 'Aba', active: true }],
    })));
    push(await timeCall('grupo: apagar', () => window.TabGroupsApi.remove(group.value.id, userId)));
  }

  push(await timeCall('sessão: flush', () => window.SessionApi.flush()));

  const history = steps.find((step) => step.name === 'histórico: criar');
  if (history && history.ok && history.value && history.value.id) {
    push(await timeCall('histórico: apagar', () => window.HistoryApi.deleteHistoryItem(history.value.id)));
  }

  return {
    ok: steps.every((step) => step.ok),
    steps: steps.map((step) => ({
      name: step.name,
      ok: step.ok,
      durationMs: step.durationMs,
      loadMs: step.loadMs,
      error: step.error,
    })),
  };
  } catch (err) {
    return {
      ok: false,
      error: err && err.message ? err.message : String(err),
      steps: [],
    };
  }
}

async function deleteSuiteUser() {
  try {
    const userId = window.UserSession.getActiveUserId();
    if (!userId) return { ok: false, error: 'sem usuário' };
    await window.UsersApi.remove(userId);
    return { ok: true, userId };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

module.exports = {
  STEP_DELAY_MS,
  createSuiteUser,
  openTab,
  openSidePanel,
  splitFirstTab,
  openWindowFromTab,
  toggleAutotune,
  mediaCommand,
  applyWallpaper,
  exerciseShortcuts,
  exerciseDatabase,
  deleteSuiteUser,
};
