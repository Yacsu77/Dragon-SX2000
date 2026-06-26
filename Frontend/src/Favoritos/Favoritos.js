/**
 * Favoritos — CRUD com localStorage.
 */
(function () {
  const TEMPLATE_PATH = 'Favoritos/Favoritos.html';
  const STORAGE_KEY = window.FAVORITOS_STORAGE_KEY || 'dragon-favoritos-v1';
  const PREVIEW_LIMIT = 6;

  let overlayEl = null;
  let listEl = null;
  let emptyEl = null;
  let formEl = null;
  let titleInput = null;
  let urlInput = null;
  let isOpen = false;
  let isBuilt = false;

  function loadAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveAll(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function normalizeUrl(url) {
    const trimmed = (url || '').trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function faviconFor(url) {
    try {
      const { origin } = new URL(url);
      return `${origin}/favicon.ico`;
    } catch {
      return '';
    }
  }

  function renderList() {
    if (!listEl || !emptyEl) return;

    const items = loadAll();
    listEl.innerHTML = '';
    emptyEl.hidden = items.length > 0;

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'favoritos-item';
      li.dataset.id = item.id;

      const favicon = faviconFor(item.url);
      const faviconMarkup = favicon
        ? `<img class="favoritos-item__favicon" src="${favicon}" alt="" loading="lazy" />`
        : '<span class="favoritos-item__favicon favoritos-item__favicon--fallback" aria-hidden="true">🌐</span>';

      li.innerHTML = `
        <button type="button" class="favoritos-item__open" data-role="open">
          ${faviconMarkup}
          <span class="favoritos-item__text">
            <span class="favoritos-item__title">${escapeHtml(item.title)}</span>
            <span class="favoritos-item__url">${escapeHtml(item.url)}</span>
          </span>
        </button>
        <button type="button" class="favoritos-item__remove" data-role="remove" aria-label="Remover">×</button>
      `;

      li.querySelector('[data-role="open"]').addEventListener('click', () => {
        if (typeof window.createTab === 'function') {
          window.createTab(item.url, item.title);
        }
        close();
      });

      li.querySelector('[data-role="remove"]').addEventListener('click', () => {
        saveAll(loadAll().filter((entry) => entry.id !== item.id));
        renderList();
      });

      listEl.appendChild(li);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!titleInput || !urlInput) return;

    const title = titleInput.value.trim();
    const url = normalizeUrl(urlInput.value);
    if (!title || !url) return;

    const items = loadAll();
    items.unshift({
      id: `fav-${Date.now()}`,
      title,
      url,
      createdAt: new Date().toISOString(),
    });
    saveAll(items);

    titleInput.value = '';
    urlInput.value = '';
    renderList();
  }

  async function ensureBuilt() {
    if (isBuilt) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'favoritos-screen-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');

    const response = await fetch(TEMPLATE_PATH);
    overlayEl.innerHTML = (await response.text()).trim();

    listEl = overlayEl.querySelector('[data-role="list"]');
    emptyEl = overlayEl.querySelector('[data-role="empty"]');
    formEl = overlayEl.querySelector('[data-role="form"]');
    titleInput = overlayEl.querySelector('[data-role="title"]');
    urlInput = overlayEl.querySelector('[data-role="url"]');

    overlayEl.querySelector('[data-role="close"]').addEventListener('click', close);
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });

    if (formEl) formEl.addEventListener('submit', handleSubmit);

    document.addEventListener('keydown', (e) => {
      if (isOpen && e.key === 'Escape') close();
    });

    document.body.appendChild(overlayEl);
    isBuilt = true;
    renderList();
  }

  async function open() {
    await ensureBuilt();
    renderList();
    isOpen = true;
    if (window.FavoritosAnim) window.FavoritosAnim.open(overlayEl);
  }

  function close() {
    if (!overlayEl) return;
    isOpen = false;
    if (window.FavoritosAnim) window.FavoritosAnim.close(overlayEl);
  }

  async function loadPreview() {
    const items = loadAll().slice(0, PREVIEW_LIMIT);
    const root = document.createElement('div');
    root.className = 'favoritos-preview';

    if (items.length === 0) {
      root.innerHTML = '<p class="favoritos-preview__empty">Nenhum favorito salvo.</p>';
      return root;
    }

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'favoritos-preview__item';
      row.textContent = item.title;
      root.appendChild(row);
    });

    return root;
  }

  window.Favoritos = {
    open,
    close,
    loadPreview,
    loadAll,
    add(title, url) {
      const items = loadAll();
      items.unshift({
        id: `fav-${Date.now()}`,
        title,
        url: normalizeUrl(url),
        createdAt: new Date().toISOString(),
      });
      saveAll(items);
    },
  };
})();
