/**
 * Favoritos — CRUD via API-DSX isolado por usuário.
 */
(function () {
  const TEMPLATE_PATH = 'Favoritos/Favoritos.html';
  const PREVIEW_LIMIT = 6;
  let cache = [];
  let cacheUserId = null;

  let overlayEl = null;
  let listEl = null;
  let emptyEl = null;
  let formEl = null;
  let titleInput = null;
  let urlInput = null;
  let isOpen = false;
  let isBuilt = false;

  function userId() {
    return window.UserSession?.getActiveUserId?.() || null;
  }

  async function syncFromApi() {
    const uid = userId();
    if (!uid || !window.FavoritesApi) {
      cache = [];
      cacheUserId = null;
      return cache;
    }
    try {
      cache = await window.FavoritesApi.list(uid);
      cacheUserId = uid;
    } catch (err) {
      console.warn('[Favoritos]', err.message);
      if (cacheUserId !== uid) cache = [];
    }
    return cache;
  }

  function loadAll() {
    if (cacheUserId !== userId()) {
      syncFromApi();
    }
    return cache.slice();
  }

  function normalizeUrl(url) {
    const trimmed = (url || '').trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function isFavorite(url) {
    if (!url) return false;
    const normalized = normalizeUrl(url);
    return loadAll().some((item) => {
      try {
        return new URL(normalizeUrl(item.url)).href === new URL(normalized).href;
      } catch {
        return item.url === url;
      }
    });
  }

  async function removeByUrl(url) {
    if (!url) return false;
    const uid = userId();
    const normalized = normalizeUrl(url);
    if (uid && window.FavoritesApi) {
      try {
        await window.FavoritesApi.removeByUrl(uid, normalized);
      } catch (err) {
        console.warn('[Favoritos]', err.message);
      }
    }
    cache = cache.filter((item) => {
      try {
        return new URL(normalizeUrl(item.url)).href !== new URL(normalized).href;
      } catch {
        return item.url !== url;
      }
    });
    return true;
  }

  async function add(title, url) {
    const uid = userId();
    const normalized = normalizeUrl(url);
    if (!normalized || !uid) return null;

    let item = null;
    try {
      item = await window.FavoritesApi.create({
        user_id: uid,
        title: title || normalized,
        url: normalized,
      });
    } catch (err) {
      console.warn('[Favoritos]', err.message);
      item = {
        id: `fav-${Date.now()}`,
        title: title || normalized,
        url: normalized,
        created_at: new Date().toISOString(),
      };
    }

    cache = [item, ...cache.filter((e) => e.url !== item.url)];
    return item;
  }

  async function toggle(title, url) {
    const normalized = normalizeUrl(url);
    if (!normalized) return { isFavorite: false };

    if (isFavorite(normalized)) {
      await removeByUrl(normalized);
      return { isFavorite: false };
    }

    await add(title || normalized, normalized);
    return { isFavorite: true };
  }

  function faviconFor(url) {
    try {
      const { origin } = new URL(url);
      return `${origin}/favicon.ico`;
    } catch {
      return '';
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
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

      li.querySelector('[data-role="remove"]').addEventListener('click', async () => {
        const uid = userId();
        if (uid && window.FavoritesApi) {
          try {
            await window.FavoritesApi.remove(item.id, uid);
          } catch (err) {
            console.warn('[Favoritos]', err.message);
          }
        }
        cache = cache.filter((entry) => entry.id !== item.id);
        renderList();
      });

      listEl.appendChild(li);
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!titleInput || !urlInput) return;

    const title = titleInput.value.trim();
    const url = normalizeUrl(urlInput.value);
    if (!title || !url) return;

    await add(title, url);
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
  }

  async function open() {
    await ensureBuilt();
    await syncFromApi();
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
    await syncFromApi();
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

  async function reload() {
    await syncFromApi();
    if (isOpen) renderList();
  }

  window.Favoritos = {
    open,
    close,
    loadPreview,
    loadAll,
    isFavorite,
    removeByUrl,
    toggle,
    add,
    reload,
  };

  document.addEventListener('user:changed', () => {
    cache = [];
    cacheUserId = null;
    syncFromApi();
  });
})();
