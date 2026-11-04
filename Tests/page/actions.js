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
  inspectSplit,
  focusSplit,
  closeSplitAndCount,
  cycleOpenTabs,
  typeQuery,
  inspectSdk,
  loadUntilFrozen,
  exerciseSecurity,
};
