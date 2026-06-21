/**
 * Mini visualizador de Histórico de Navegação (pré-visualização no menu).
 */
(function () {
  const RECENT_LIMIT = 8;
  const TEMPLATE_PATH = '../MiniTelas/MiniHistorico-Navegação/MiniHistorico-Navegação.html';

  let rootEl = null;
  let listEl = null;
  let loadingEl = null;
  let errorEl = null;
  let emptyEl = null;
  let isBuilt = false;
  let recentItems = [];

  function formatDateTime(value) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  function getFaviconMarkup(item) {
    if (item.favicon_url) {
      return `<img class="mini-historico__favicon" src="${item.favicon_url}" alt="" loading="lazy" />`;
    }
    return '<span class="mini-historico__favicon mini-historico__favicon--fallback" aria-hidden="true">🌐</span>';
  }

  async function ensureBuilt() {
    if (isBuilt && rootEl && rootEl.isConnected) return;
    isBuilt = false;
    rootEl = null;

    const response = await fetch(TEMPLATE_PATH);
    const html = await response.text();

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html.trim();
    rootEl = wrapper.firstElementChild;

    listEl = rootEl.querySelector('[data-role="list"]');
    loadingEl = rootEl.querySelector('[data-role="loading"]');
    errorEl = rootEl.querySelector('[data-role="error"]');
    emptyEl = rootEl.querySelector('[data-role="empty"]');

    rootEl.querySelector('[data-role="open-full"]').addEventListener('click', () => {
      openHistoryFullScreen();
      if (window.MainMenu) window.MainMenu.close();
    });

    isBuilt = true;
  }

  function setState(state, message) {
    if (!rootEl) return;
    loadingEl.hidden = state !== 'loading';
    errorEl.hidden = state !== 'error';
    emptyEl.hidden = state !== 'empty';
    listEl.hidden = state !== 'ready';

    if (state === 'error') errorEl.textContent = message;
  }

  async function fetchRecentHistory() {
    if (!window.HistoryApi) {
      throw new Error('Cliente da API indisponível.');
    }
    const all = await window.HistoryApi.fetchHistory();
    return all.slice(0, RECENT_LIMIT);
  }

  function renderRecentHistoryPreview(items) {
    recentItems = items;
    listEl.innerHTML = '';

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'mini-historico__item';
      li.innerHTML = `
        ${getFaviconMarkup(item)}
        <div class="mini-historico__content">
          <div class="mini-historico__item-title">${item.title || item.url}</div>
          <div class="mini-historico__item-url">${item.url}</div>
        </div>
        <time class="mini-historico__item-time">${formatDateTime(item.last_visit_time)}</time>
      `;

      li.addEventListener('click', () => {
        if (typeof window.openUrlFromHistory === 'function') {
          window.openUrlFromHistory(item.url);
        }
        if (window.MainMenu) window.MainMenu.close();
      });

      listEl.appendChild(li);
    });
  }

  async function load() {
    await ensureBuilt();
    setState('loading');

    try {
      const items = await fetchRecentHistory();
      if (items.length === 0) {
        setState('empty');
        return rootEl;
      }
      renderRecentHistoryPreview(items);
      setState('ready');
    } catch (err) {
      setState('error', err.message);
    }

    return rootEl;
  }

  function openHistoryFullScreen() {
    if (window.HistoryScreen && typeof window.HistoryScreen.open === 'function') {
      window.HistoryScreen.open();
    }
  }

  function getRoot() {
    return rootEl;
  }

  window.MiniHistorico = {
    load,
    fetchRecentHistory,
    renderRecentHistoryPreview,
    openHistoryFullScreen,
    getRoot,
  };
})();
