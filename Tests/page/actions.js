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
  const formReady = await waitFor(() => {
    const form = document.querySelector('[data-role="create-form"]');
    return form && !form.closest('[hidden]');
  }, 5000);
  const form = document.querySelector('[data-role="create-form"]');
  if (!formReady || !form) {
    return { ok: false, error: 'formulário de perfil não abriu', durationMs: Date.now() - started };
  }
  form.elements.nickname.value = nickname;
  form.elements.password.value = password;
  form.requestSubmit();
  const userReady = await waitFor(
    () => window.UserSession && window.UserSession.getActiveUserId && window.UserSession.getActiveUserId(),
    30000
  );
  const userAt = Date.now();
  if (!userReady) {
    const formError = document.querySelector('[data-role="form-error"]');
    const message = formError && !formError.hidden ? formError.textContent : 'usuário não ficou ativo';
    return { ok: false, error: message, durationMs: userAt - started };
  }
  const workspace = await waitFor(() => {
    return document.getElementById('tabs')
      && document.querySelector('[data-autotune-preview]')
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

async function exerciseAutotuneGrid() {
  const started = Date.now();
  const steps = [];
  const push = (name, ok, detail) => {
    const at = Date.now();
    steps.push({
      name,
      ok,
      durationMs: at - started,
      loadMs: at - started,
      note: ok ? detail || null : null,
      error: ok ? null : detail || 'falhou',
    });
  };

  if (!window.AutoTune || typeof window.AutoTune.place !== 'function') {
    push('Grade', false, 'motor da grade não iniciou');
    return { ok: false, steps };
  }

  window.location.hash = 'autotune-widget';
  const cells = document.querySelectorAll('.autotune-cell').length;
  const size = window.AutoTune.grid || {};
  push(
    'Grade 9×12',
    cells === 108 && size.cols === 12 && size.rows === 9,
    cells === 108 ? '108 células' : `${cells} células`,
  );

  const clock = window.AutoTune.place('clock', 0, 0);
  const clockEl = document.querySelector('.autotune-block[data-widget-type="clock"]');
  push(
    'Relógio em 6×3',
    !!(clock.ok && clock.item && clock.item.cols === 6 && clock.item.rows === 3
      && clockEl && clockEl.style.left === '' && clockEl.style.top === ''
      && clockEl.style.gridColumn.indexOf('span 6') !== -1),
    clock.ok ? null : clock.error,
  );

  const occupied = window.AutoTune.place('timer', 0, 0);
  push('Célula ocupada', !occupied.ok && !document.querySelector('.autotune-block[data-widget-type="timer"]'), occupied.ok ? 'gravou em célula ocupada' : null);

  const offGrid = window.AutoTune.place('tasklist', 10, 4);
  push('Fora da grade', !offGrid.ok, offGrid.ok ? 'gravou fora da grade' : null);

  window.location.hash = '';
  const locked = window.AutoTune.place('share', 9, 0);
  push('Fora do modo de edição', !locked.ok && !document.querySelector('.autotune-block[data-widget-type="share"]'), locked.ok ? 'gravou fora do modo de edição' : null);

  window.location.hash = 'autotune-widget';
  const list = window.AutoTune.place('tasklist', 0, 3);
  const timer = window.AutoTune.place('timer', 6, 0);
  const share = window.AutoTune.place('share', 9, 0);
  const music = window.AutoTune.place('music', 6, 3);
  const listEl = document.querySelector('.autotune-block[data-widget-type="tasklist"]');
  push(
    'Lista em 3×6',
    !!(list.ok && list.item && list.item.cols === 3 && list.item.rows === 6 && listEl && listEl.style.gridRow.indexOf('span 6') !== -1),
    list.ok ? null : list.error,
  );
  push('Timer em 3×3', !!(timer.ok && timer.item && timer.item.cols === 3 && timer.item.rows === 3), timer.ok ? null : timer.error);
  push('Share em 3×3', !!(share.ok && share.item && share.item.cols === 3 && share.item.rows === 3), share.ok ? null : share.error);
  push(
    'Música em 3×3',
    !!(music.ok && music.item && music.item.cols === 3 && document.querySelector('.autotune-music-card')),
    music.ok ? null : music.error,
  );

  const smaller = window.AutoTune.resize('clock', 4, 2);
  const grown = window.AutoTune.resize('share', 3, 4);
  const blocked = window.AutoTune.resize('clock', 7, 3);
  const clockNow = document.querySelector('.autotune-block[data-widget-type="clock"]');
  push(
    'Diminuir o relógio',
    !!(smaller.ok && smaller.item && smaller.item.cols === 4 && smaller.item.rows === 2
      && clockNow && clockNow.style.gridColumn.indexOf('span 4') !== -1 && clockNow.style.left === ''),
    smaller.ok ? null : smaller.error,
  );
  push('Aumentar o share', !!(grown.ok && grown.item && grown.item.rows === 4), grown.ok ? null : grown.error);
  push('Aumento em célula ocupada', !blocked.ok, blocked.ok ? 'o relógio invadiu o timer' : null);

  window.location.hash = '';
  const lockedResize = window.AutoTune.resize('clock', 5, 2);
  push('Redimensionar fora do modo de edição', !lockedResize.ok, lockedResize.ok ? 'redimensionou fora do modo de edição' : null);

  const before = window.AutoTune.getSettings();
  window.AutoTune.reloadFromStorage();
  const after = window.AutoTune.getSettings();
  const saved = after && after.items && after.items.find((item) => item.id === 'clock');
  const restored = document.querySelector('.autotune-block[data-widget-type="clock"]');
  const sameCount = before.items.length === after.items.length;
  push(
    'Restaura pelas células',
    !!(saved && saved.col === 0 && saved.row === 0 && saved.cols === 4 && saved.rows === 2
      && !('x' in saved) && !('y' in saved)
      && restored && restored.style.left === '' && restored.style.top === '' && sameCount),
    saved ? null : 'o relógio não voltou pela célula',
  );

  window.location.hash = '';
  return { ok: steps.every((step) => step.ok), steps };
}

async function mediaCommand(action) {
  const started = Date.now();
  if (!window.DragonMedia || !window.DragonMedia.command) {
    return { ok: false, action, error: 'SDK de mídia indisponível', durationMs: Date.now() - started };
  }
  const result = await new Promise((resolve) => {
    let settled = false;
    let off = function () {};
    const timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), 20000);
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

function countTabs() {
  const webviews = Array.from(document.querySelectorAll('#browser webview[data-id]'));
  const home = webviews.filter((view) => String(view.dataset.id || '').startsWith('home-tab')).length;
  const discarded = webviews.filter((view) => view.dataset.discarded === '1').length;
  const warm = webviews.filter((view) => (
    !String(view.dataset.id || '').startsWith('home-tab')
    && view.dataset.discarded !== '1'
    && !view.dataset.pendingSrc
  )).length;
  return {
    total: webviews.length,
    bar: document.querySelectorAll('#tabs .tab').length,
    home,
    warm,
    discarded,
  };
}

async function inspectSplit() {
  const started = Date.now();
  const tabs = Array.from(document.querySelectorAll('#tabs .tab'))
    .map((tab) => tab.dataset.id)
    .filter((id) => id && !String(id).startsWith('home-tab'));
  if (!window.Janelas || !window.Janelas.splitTab || tabs.length < 2) {
    return { ok: false, error: 'faltam duas abas para dividir', durationMs: Date.now() - started };
  }
  let state = window.Janelas.splitTab(tabs[0], 'right');
  if (window.Janelas.assignTabToSide) {
    state = window.Janelas.assignTabToSide(tabs[1], 'left') || state;
  }
  state = (window.Janelas.getSplitState && window.Janelas.getSplitState()) || state;
  const leftEl = state && state.leftTabId
    ? document.querySelector(`webview[data-id="${state.leftTabId}"]`)
    : null;
  const rightEl = state && state.rightTabId
    ? document.querySelector(`webview[data-id="${state.rightTabId}"]`)
    : null;
  const distinct = !!(state && state.leftTabId && state.rightTabId && state.leftTabId !== state.rightTabId);
  const marked = !!(leftEl && rightEl
    && leftEl.classList.contains('janelas-pane-left')
    && rightEl.classList.contains('janelas-pane-right'));
  const ok = !!(state && state.mode === 'split' && distinct && leftEl && rightEl && (marked || document.documentElement.dataset.janelasMode === 'split'));
  return {
    ok,
    mode: state && state.mode,
    leftTabId: state && state.leftTabId,
    rightTabId: state && state.rightTabId,
    tabs: countTabs(),
    loadMs: Date.now() - started,
    durationMs: Date.now() - started,
    error: ok ? null : `divisão incompleta mode=${state && state.mode} left=${state && state.leftTabId} right=${state && state.rightTabId}`,
  };
}

async function focusSplit(side) {
  const started = Date.now();
  if (!window.Janelas || !window.Janelas.focusPane) {
    return { ok: false, error: 'foco da divisão indisponível', durationMs: Date.now() - started };
  }
  const next = window.Janelas.focusPane(side);
  const ok = !!(next && next.focusPane === side);
  return {
    ok,
    focusPane: next && next.focusPane,
    loadMs: Date.now() - started,
    durationMs: Date.now() - started,
    error: ok ? null : 'o foco não mudou',
  };
}

async function closeSplitAndCount() {
  const started = Date.now();
  const before = countTabs();
  if (!window.Janelas || !window.Janelas.closeSplit) {
    return { ok: false, error: 'fechar divisão indisponível', tabs: before, durationMs: Date.now() - started };
  }
  const next = window.Janelas.closeSplit();
  const after = countTabs();
  const ok = !next || next.mode !== 'split';
  return {
    ok,
    mode: next && next.mode,
    tabs: { before, after },
    loadMs: Date.now() - started,
    durationMs: Date.now() - started,
    error: ok ? null : 'a divisão continuou aberta',
  };
}

async function cycleOpenTabs() {
  const started = Date.now();
  const tabs = Array.from(document.querySelectorAll('#tabs .tab'))
    .map((tab) => tab.dataset.id)
    .filter(Boolean);
  const samples = [];
  for (let index = 0; index < tabs.length; index += 1) {
    if (index > 0) await sleep(STEP_DELAY_MS);
    const id = tabs[index];
    if (typeof window.activateTab === 'function') window.activateTab(id);
    if (window.TabWarmth && window.TabWarmth.maybeDiscardCold) window.TabWarmth.maybeDiscardCold();
    samples.push({ id, ...countTabs() });
  }
  const last = samples[samples.length - 1] || countTabs();
  return {
    ok: tabs.length > 0,
    tabs: last,
    samples,
    note: `total ${last.total}, quentes ${last.warm}, congeladas ${last.discarded}, home ${last.home}`,
    loadMs: Date.now() - started,
    durationMs: Date.now() - started,
    error: tabs.length ? null : 'nenhuma aba para percorrer',
  };
}

async function typeQuery(text, expect) {
  const input = document.getElementById('addressInput');
  if (!input) return { ok: false, error: 'barra de endereço ausente', query: text };
  input.focus();
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  for (const char of text) {
    await sleep(90);
    input.value += char;
    input.setSelectionRange(input.value.length, input.value.length);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: char }));
  }
  const typedAt = Date.now();
  const needle = String(expect || '').toLowerCase();
  const found = await waitFor(() => {
    const panel = document.querySelector('.smart-search-panel.is-open');
    const item = panel && panel.querySelector('.smart-search-item');
    const itemText = item ? (item.textContent || '').toLowerCase() : '';
    const completed = input.selectionStart < input.selectionEnd
      && (input.value || '').toLowerCase().includes(needle);
    if (!needle) return !!item;
    return itemText.includes(needle) || completed;
  }, 15000);
  const recommendMs = Date.now() - typedAt;
  return {
    ok: found,
    query: text,
    recommendMs,
    loadMs: recommendMs,
    durationMs: recommendMs + (text.length * 90),
    error: found ? null : 'nenhuma recomendação no tempo limite',
  };
}

const SNAPSHOT_KEYS = ['app', 'title', 'artist', 'album', 'paused', 'position', 'duration'];

async function inspectSdk() {
  const started = Date.now();
  const commands = ['pause', 'play', 'next', 'previous', 'stop'];
  const results = [];
  for (const action of commands) {
    results.push(await mediaCommand(action));
  }
  const snapshot = window.DragonMedia ? window.DragonMedia.snapshot : null;
  const hasMedia = !!(snapshot && String(snapshot.title || '').trim());
  const missing = snapshot
    ? SNAPSHOT_KEYS.filter((key) => !(key in snapshot))
    : [];
  const commandsOk = results.every((item) => item.ok);
  const shapeOk = !hasMedia || missing.length === 0;
  return {
    ok: commandsOk && shapeOk,
    commands: results.map((item) => ({ action: item.action, ok: item.ok, error: item.error })),
    note: hasMedia
      ? `mídia presente, pausa ${snapshot.paused ? 'paused' : 'playing'}`
      : 'sem mídia tocando; campos de faixa podem vir vazios',
    playbackStatus: snapshot ? (snapshot.paused ? 'paused' : 'playing') : null,
    missing,
    loadMs: Date.now() - started,
    durationMs: Date.now() - started,
    error: commandsOk ? (shapeOk ? null : `faltam campos: ${missing.join(', ')}`) : 'algum comando do SDK não respondeu',
  };
}

async function loadUntilFrozen() {
  const started = Date.now();
  const initial = countTabs();
  const steps = [];
  let frozenAt = null;
  for (let index = 1; index <= 16; index += 1) {
    const opened = await openTab(`https://example.com/?suite=${index}`, `Carga ${index}`, 12000);
    if (window.TabWarmth && window.TabWarmth.maybeDiscardCold) window.TabWarmth.maybeDiscardCold();
    const map = countTabs();
    steps.push({ index, ok: opened.ok, loadMs: opened.loadMs, tabs: map });
    if (map.discarded > initial.discarded) {
      frozenAt = map.total;
      break;
    }
  }
  const last = steps[steps.length - 1];
  return {
    ok: frozenAt != null || steps.length === 16,
    frozenAt,
    tabs: last && last.tabs,
    opened: steps.length,
    note: frozenAt
      ? `primeira aba congelada com ${frozenAt} webviews`
      : `nenhuma aba congelada após ${steps.length} aberturas`,
    loadMs: Date.now() - started,
    durationMs: Date.now() - started,
    error: null,
  };
}

async function exerciseSecurity(password) {
  const userId = window.UserSession.getActiveUserId();
  const steps = [];
  const record = (step) => {
    steps.push({
      name: step.name,
      ok: step.ok,
      durationMs: step.durationMs,
      loadMs: step.loadMs,
      error: step.error || null,
    });
  };

  const wrong = await timeCall('senha errada', () => window.UsersApi.unlock(userId, 'errada'));
  const rejected = !wrong.ok && /401|incorreta|senha/i.test(wrong.error || '');
  record({
    name: 'senha errada',
    ok: rejected,
    durationMs: wrong.durationMs,
    loadMs: wrong.loadMs,
    error: rejected ? null : (wrong.ok ? 'a senha errada foi aceita' : wrong.error),
  });

  const injection = "' OR 1=1 --";
  const before = await window.UsersApi.list();
  const created = await timeCall('apelido injetado', () => window.UsersApi.create({
    nickname: injection,
    password: 'suite-pass-1',
  }));
  const after = await window.UsersApi.list();
  const leaked = after.some((user) => user && user.id && user.nickname == null);
  record({
    name: 'injeção no apelido',
    ok: !leaked && after.length >= before.length,
    durationMs: created.durationMs,
    loadMs: created.loadMs,
    error: leaked ? 'a listagem vazou um usuário sem apelido' : null,
  });
  if (created.ok && created.value && created.value.id) {
    await window.UsersApi.remove(created.value.id);
  }

  const search = await timeCall('busca com aspas', () => window.HistoryApi.searchHistory(injection, userId));
  record({
    ...search,
    name: 'busca com aspas',
    ok: search.ok && Array.isArray(search.value),
    error: search.ok ? null : search.error,
  });

  const unlocked = await timeCall('cofre para segurança', () => window.VaultApi.unlock(userId, password));
  const vaultToken = unlocked.ok && unlocked.value ? unlocked.value.token : null;
  if (vaultToken) {
    const secret = await timeCall('cofre sem vazar senha', () => window.VaultApi.create({
      user_id: userId,
      origin: 'https://suite.dsx.local/seguranca',
      username: 'suite',
      password: 'segredo-suite',
      token: vaultToken,
    }));
    const leakedSecret = !!(secret.value && ('password' in secret.value || 'ciphertext' in secret.value));
    record({
      name: 'cofre sem vazar senha',
      ok: secret.ok && !leakedSecret,
      durationMs: secret.durationMs,
      loadMs: secret.loadMs,
      error: leakedSecret ? 'a resposta do cofre devolveu a senha' : (secret.ok ? null : secret.error),
    });
    if (secret.ok && secret.value && secret.value.id) {
      await window.VaultApi.remove(secret.value.id, userId);
    }
  } else {
    record({
      name: 'cofre sem vazar senha',
      ok: false,
      durationMs: unlocked.durationMs || 0,
      loadMs: unlocked.loadMs || 0,
      error: 'não foi possível abrir o cofre para o teste',
    });
  }

  const mine = await window.HistoryApi.createHistoryEntry({
    url: 'https://suite.dsx.local/segura',
    title: 'Visita segura',
    user_id: userId,
  });
  const listed = await window.HistoryApi.fetchHistory({ user_id: userId });
  const foreign = await timeCall('apagar id alheio', () => window.HistoryApi.deleteHistoryItem('0'));
  const listedAfter = await window.HistoryApi.fetchHistory({ user_id: userId });
  const kept = listedAfter.some((row) => row.url === 'https://suite.dsx.local/segura');
  record({
    name: 'apagar id alheio',
    ok: !foreign.ok && kept,
    durationMs: foreign.durationMs,
    loadMs: foreign.loadMs,
    error: kept ? null : 'a visita da suíte sumiu',
  });
  if (mine && mine.id) {
    try { await window.HistoryApi.deleteHistoryItem(mine.id); } catch (_) { /* limpeza */ }
  }

  return { ok: steps.every((step) => step.ok), steps };
}

async function probeGlobalCursor() {
  const started = Date.now();
  const views = Array.from(document.querySelectorAll('#browser webview[data-dsx-side-mouse="true"]'));
  views.sort((a, b) => {
    const rank = (view) => (view.dataset.discarded === '1' ? 0 : 2) + (view.classList.contains('active') ? 1 : 0);
    return rank(b) - rank(a);
  });
  let webview = null;
  for (const view of views) {
    try {
      const bound = await view.executeJavaScript('!!window.__dsxSideMouseBound', false);
      if (bound) {
        webview = view;
        break;
      }
    } catch (_) { /* a próxima página */ }
  }
  if (!webview) {
    return {
      error: 'nenhuma página com a verificação global já injetada',
      durationMs: Date.now() - started,
      note: '',
    };
  }
  try {
    const measured = await webview.executeJavaScript(`(() => {
      const burst = (button, kind) => {
        const t0 = performance.now();
        let prevented = 0;
        for (let i = 0; i < 80; i++) {
          const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: button });
          const up = new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: button });
          window.dispatchEvent(down);
          window.dispatchEvent(up);
          if (kind === 'wheel') {
            window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 4 }));
          }
          if (kind === 'side') {
            const aux = new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: button });
            window.dispatchEvent(aux);
            if (down.defaultPrevented || aux.defaultPrevented) prevented += 1;
          } else if (down.defaultPrevented) {
            prevented += 1;
          }
        }
        return { ms: Math.round((performance.now() - t0) * 10) / 10, prevented };
      };
      return {
        bound: !!window.__dsxSideMouseBound,
        left: burst(0, 'wheel'),
        side: burst(3, 'side'),
      };
    })()`, false);
    const durationMs = Date.now() - started;
    const leftOk = measured && measured.left && measured.left.prevented === 0;
    const sideOk = measured && measured.side && measured.side.prevented === 80;
    return {
      error: leftOk && sideOk ? null : 'o filtro do botão não se comportou como esperado',
      durationMs,
      note: `80 cliques esquerdos com scroll levaram ${measured.left.ms} ms e bloquearam ${measured.left.prevented}. 80 botões laterais levaram ${measured.side.ms} ms e bloquearam ${measured.side.prevented}. O listener fica em captura em cada página, em mousedown, mouseup e auxclick.`,
    };
  } catch (err) {
    return {
      error: err && err.message ? err.message : String(err),
      durationMs: Date.now() - started,
      note: '',
    };
  }
}

async function exerciseCursor() {
  const started = Date.now();
  const steps = [];
  const push = (step) => steps.push(step);

  if (!window.CursorMouseEventService || !window.CursorContextMenu) {
    return { ok: false, error: 'CursorControll não iniciou', steps };
  }

  const coverage = {
    webviews: document.querySelectorAll('#browser webview').length,
    webviewsWithCursor: document.querySelectorAll('#browser webview[data-cursor-events="true"]').length,
    tabs: document.querySelectorAll('#tabs .tab').length,
    tabsWithCursor: document.querySelectorAll('#tabs .tab[data-cursor-tab-events="true"]').length,
  };

  const contentTab = Array.from(document.querySelectorAll('#tabs .tab'))
    .find((tab) => tab.dataset.id && !String(tab.dataset.id).startsWith('home-tab'));
  if (contentTab) {
    const stepStart = Date.now();
    const tabId = contentTab.dataset.id;
    contentTab.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    const active = window.currentActiveTab === tabId || contentTab.classList.contains('active');
    push({
      name: 'Clique esquerdo na aba',
      ok: active,
      durationMs: Date.now() - stepStart,
      loadMs: Date.now() - stepStart,
      error: active ? null : 'a aba não ficou ativa',
    });

    const rightStart = Date.now();
    contentTab.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
      clientX: 30,
      clientY: 20,
    }));
    const menuOpen = !!(window.CursorContextMenu.isOpen && window.CursorContextMenu.isOpen());
    const items = document.querySelectorAll('.cursor-context-menu [data-action], .cursor-context-menu button').length;
    if (window.CursorContextMenu.close) window.CursorContextMenu.close();
    push({
      name: 'Clique direito na aba',
      ok: menuOpen && items > 0,
      durationMs: Date.now() - rightStart,
      loadMs: Date.now() - rightStart,
      error: menuOpen ? null : 'o menu de contexto da aba não abriu',
    });
  } else {
    push({ name: 'Clique na aba', ok: false, durationMs: 0, error: 'nenhuma aba de conteúdo' });
  }

  const homeTab = document.querySelector('#tabs .tab[data-id^="home-tab"]');
  if (homeTab) {
    const stepStart = Date.now();
    homeTab.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    const homeActive = window.currentActiveTab === homeTab.dataset.id || homeTab.classList.contains('active');
    homeTab.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
      clientX: 28,
      clientY: 18,
    }));
    const homeMenu = !!(window.CursorContextMenu.isOpen && window.CursorContextMenu.isOpen());
    if (window.CursorContextMenu.close) window.CursorContextMenu.close();
    push({
      name: 'Clique esquerdo e direito na aba inicial',
      ok: homeActive && homeMenu,
      durationMs: Date.now() - stepStart,
      loadMs: Date.now() - stepStart,
      error: homeActive && homeMenu ? null : 'a aba inicial não ativou ou não abriu o menu',
    });
  }

  const input = document.getElementById('addressInput');
  if (input) {
    const stepStart = Date.now();
    input.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    input.focus();
    push({
      name: 'Clique esquerdo na barra de endereço',
      ok: document.activeElement === input,
      durationMs: Date.now() - stepStart,
      loadMs: Date.now() - stepStart,
      error: document.activeElement === input ? null : 'a barra não recebeu o foco',
    });

    const rightStart = Date.now();
    input.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
      clientX: 40,
      clientY: 40,
    }));
    const handled = !!(window.CursorContextMenu.isOpen && window.CursorContextMenu.isOpen());
    if (window.CursorContextMenu.close) window.CursorContextMenu.close();
    push({
      name: 'Clique direito na barra de endereço',
      ok: true,
      durationMs: Date.now() - rightStart,
      loadMs: Date.now() - rightStart,
      note: handled
        ? 'o CursorControll abriu o menu'
        : 'a barra não tem menu do CursorControll; o clique não quebrou a página',
    });
  }

  const webview = document.querySelector('#browser webview.active[data-cursor-events="true"]')
    || document.querySelector('#browser webview[data-cursor-events="true"]');
  if (webview) {
    const rightStart = Date.now();
    const event = new MouseEvent('context-menu', {
      bubbles: true,
      cancelable: true,
      clientX: 80,
      clientY: 80,
    });
    webview.dispatchEvent(event);
    const menuOpen = !!(window.CursorContextMenu.isOpen && window.CursorContextMenu.isOpen());
    if (window.CursorContextMenu.close) window.CursorContextMenu.close();
    push({
      name: 'Clique direito na página',
      ok: menuOpen,
      durationMs: Date.now() - rightStart,
      loadMs: Date.now() - rightStart,
      error: menuOpen ? null : 'o menu de contexto da página não abriu',
    });

    const scrollStart = Date.now();
    let scrolled = false;
    try {
      const left = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, clientX: 90, clientY: 90 });
      webview.dispatchEvent(left);
      const side = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 3, clientX: 90, clientY: 90 });
      webview.dispatchEvent(side);
      webview.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 120 }));
      if (window.CursorMiddleMouseScroll.isActive && window.CursorMiddleMouseScroll.isActive()) {
        window.CursorMiddleMouseScroll.stop();
      }
      webview.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        button: 1,
        clientX: 110,
        clientY: 110,
      }));
      scrolled = !!(window.CursorMiddleMouseScroll.isActive && window.CursorMiddleMouseScroll.isActive());
      await sleep(180);
      window.CursorMiddleMouseScroll.stop();
      push({
        name: 'Clique esquerdo e botão lateral na página',
        ok: !left.defaultPrevented && side.defaultPrevented,
        durationMs: Date.now() - scrollStart,
        loadMs: Date.now() - scrollStart,
        note: 'o esquerdo segue livre; o botão lateral é interceptado pela verificação global',
        error: !left.defaultPrevented && side.defaultPrevented
          ? null
          : 'a verificação global segurou o clique errado',
      });
    } catch (err) {
      push({
        name: 'Scroll na página',
        ok: false,
        durationMs: Date.now() - scrollStart,
        error: err && err.message ? err.message : String(err),
      });
      scrolled = null;
    }
    if (scrolled !== null) {
      push({
        name: 'Scroll na página',
        ok: scrolled === true && !(window.CursorMiddleMouseScroll.isActive && window.CursorMiddleMouseScroll.isActive()),
        durationMs: Date.now() - scrollStart,
        loadMs: Date.now() - scrollStart,
        note: 'autoscroll do botão do meio ligou e foi encerrado',
        error: scrolled ? null : 'o autoscroll não ligou',
      });
    }
  } else {
    push({ name: 'Página', ok: false, durationMs: 0, error: 'nenhum webview com o cursor anexado' });
  }

  const disposableId = window.createTab('about:blank', 'Cursor meio');
  const disposable = document.querySelector(`#tabs .tab[data-id="${disposableId}"]`);
  if (disposable) {
    const stepStart = Date.now();
    disposable.dispatchEvent(new MouseEvent('auxclick', {
      bubbles: true,
      cancelable: true,
      button: 1,
    }));
    await sleep(80);
    const gone = !document.querySelector(`#tabs .tab[data-id="${disposableId}"]`);
    push({
      name: 'Clique do meio na aba',
      ok: gone,
      durationMs: Date.now() - stepStart,
      loadMs: Date.now() - stepStart,
      error: gone ? null : 'a aba não fechou com o botão do meio',
    });
  }

  const sideViews = document.querySelectorAll('.side-panel__webview');
  const sideWithCursor = document.querySelectorAll('.side-panel__webview[data-cursor-events="true"]').length;
  const sideWithCheck = document.querySelectorAll('.side-panel__webview[data-dsx-side-mouse="true"]').length;
  if (sideViews.length) {
    const side = sideViews[0];
    const stepStart = Date.now();
    let threw = null;
    try {
      side.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
      side.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 40 }));
      side.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
    } catch (err) {
      threw = err && err.message ? err.message : String(err);
    }
    push({
      name: 'Clique e scroll no painel lateral',
      ok: !threw,
      durationMs: Date.now() - stepStart,
      loadMs: Date.now() - stepStart,
      note: `menu do cursor ${sideWithCursor}/${sideViews.length}, verificação global ${sideWithCheck}/${sideViews.length}`,
      error: threw,
    });
  }

  const globalViews = document.querySelectorAll('#browser webview[data-dsx-side-mouse="true"]').length;
  const probe = await probeGlobalCursor();
  push({
    name: 'Custo da verificação global',
    ok: !probe.error,
    durationMs: probe.durationMs || 0,
    loadMs: probe.durationMs || 0,
    note: probe.note,
    error: probe.error || null,
  });

  const covered = coverage.webviews === 0 || coverage.webviewsWithCursor === coverage.webviews;
  const tabsCovered = coverage.tabs === 0 || coverage.tabsWithCursor === coverage.tabs;
  push({
    name: 'Cobertura dos listeners',
    ok: covered && tabsCovered,
    durationMs: Date.now() - started,
    loadMs: Date.now() - started,
    note: `${coverage.webviewsWithCursor}/${coverage.webviews} webviews com menu e scroll, ${coverage.tabsWithCursor}/${coverage.tabs} abas, ${globalViews}/${coverage.webviews} com a verificação global injetada`,
    error: covered && tabsCovered ? null : 'algum elemento novo ficou sem o listener do cursor',
  });

  return { ok: steps.every((step) => step.ok), steps };
}

module.exports = {
  STEP_DELAY_MS,
  createSuiteUser,
  openTab,
  openSidePanel,
  splitFirstTab,
  openWindowFromTab,
  exerciseAutotuneGrid,
  mediaCommand,
  applyWallpaper,
  exerciseShortcuts,
  exerciseDatabase,
  deleteSuiteUser,
  inspectSplit,
  focusSplit,
  closeSplitAndCount,
  cycleOpenTabs,
  typeQuery,
  inspectSdk,
  loadUntilFrozen,
  exerciseSecurity,
  exerciseCursor,
};
