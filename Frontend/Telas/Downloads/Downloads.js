/**
 * Histórico de downloads do usuário ativo.
 */
(function () {
  const TEMPLATE_PATH = '../Telas/Downloads/Downloads.html';

  let overlayEl = null;
  let listEl = null;
  let emptyEl = null;
  let isOpen = false;
  let isBuilt = false;

  function userId() {
    return window.UserSession?.getActiveUserId?.() || null;
  }

  async function ensureBuilt() {
    if (isBuilt) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'downloads-screen-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');

    const response = await fetch(TEMPLATE_PATH);
    overlayEl.innerHTML = (await response.text()).trim();

    listEl = overlayEl.querySelector('[data-role="list"]');
    emptyEl = overlayEl.querySelector('[data-role="empty"]');

    overlayEl.querySelector('[data-role="close"]').addEventListener('click', close);
    overlayEl.querySelector('[data-role="clear"]').addEventListener('click', async () => {
      const uid = userId();
      if (!uid || !window.DownloadsApi) return;
      await window.DownloadsApi.clear(uid);
      await render();
    });
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });
    document.addEventListener('keydown', (e) => {
      if (isOpen && e.key === 'Escape') close();
    });

    document.body.appendChild(overlayEl);
    isBuilt = true;
  }

  function formatSize(size) {
    if (!size || size <= 0) return '—';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function render() {
    const uid = userId();
    if (!listEl || !emptyEl) return;
    listEl.innerHTML = '';
    if (!uid || !window.DownloadsApi) {
      emptyEl.hidden = false;
      return;
    }

    const items = await window.DownloadsApi.list(uid);
    emptyEl.hidden = items.length > 0;

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'downloads-screen__item';
      li.innerHTML = `
        <div class="downloads-screen__item-main">
          <strong>${escapeHtml(item.filename || item.url)}</strong>
          <span>${escapeHtml(item.state || '')} · ${formatSize(item.size)}</span>
          <small>${escapeHtml(item.save_path || item.url || '')}</small>
        </div>
        <button type="button" data-role="remove" aria-label="Remover">×</button>
      `;
      li.querySelector('[data-role="remove"]').addEventListener('click', async () => {
        await window.DownloadsApi.remove(item.id, uid);
        await render();
      });
      listEl.appendChild(li);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  async function open() {
    await ensureBuilt();
    await render();
    isOpen = true;
    overlayEl.classList.add('is-open');
    overlayEl.setAttribute('aria-hidden', 'false');
  }

  function close() {
    if (!overlayEl) return;
    isOpen = false;
    overlayEl.classList.remove('is-open');
    overlayEl.setAttribute('aria-hidden', 'true');
  }

  window.DownloadsScreen = { open, close };
})();
