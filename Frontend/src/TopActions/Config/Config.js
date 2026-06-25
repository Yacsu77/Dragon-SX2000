/**
 * Visão geral de abas estilo Safari.
 */
(function () {
  const TEMPLATE_PATH = 'TopActions/Config/Config.html';

  let overlayEl = null;
  let gridEl = null;
  let emptyEl = null;
  let isOpen = false;
  let isBuilt = false;

  function getTabIconMarkup(tab) {
    const img = tab.querySelector('.tab-icon img');
    if (img && img.src) {
      return `<img src="${img.src}" alt="" />`;
    }

    const iconSpan = tab.querySelector('.tab-icon');
    const text = iconSpan ? iconSpan.textContent.trim() : '';
    if (text) return `<span aria-hidden="true">${text}</span>`;

    return '<span aria-hidden="true">🌐</span>';
  }

  function renderGrid() {
    if (!gridEl || !emptyEl) return;

    const tabs = Array.from(document.querySelectorAll('.tab'));
    gridEl.innerHTML = '';
    emptyEl.hidden = tabs.length > 0;

    tabs.forEach((tab) => {
      const tabId = tab.dataset.id;
      const titleEl = tab.querySelector('.tab-title');
      const title = titleEl ? titleEl.textContent.trim() : 'Aba';
      const isHome = tabId && tabId.startsWith('home-tab');
      const isActive = tab.classList.contains('active');

      const card = document.createElement('article');
      card.className = `config-card${isActive ? ' config-card--active' : ''}`;
      card.dataset.tabId = tabId;

      card.innerHTML = `
        <button type="button" class="config-card__close" data-role="close-tab" aria-label="Fechar aba">×</button>
        <div class="config-card__preview">${getTabIconMarkup(tab)}</div>
        <div class="config-card__meta">
          <div class="config-card__title">${escapeHtml(title)}</div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-role="close-tab"]')) return;

        if (isHome && typeof window.activateHomeTab === 'function') {
          window.activateHomeTab(tabId);
        } else if (typeof window.activateTab === 'function') {
          window.activateTab(tabId);
        }
        close();
      });

      card.querySelector('[data-role="close-tab"]').addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.closeTab === 'function') {
          window.closeTab(tabId);
        }
        renderGrid();
      });

      gridEl.appendChild(card);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function onTabEvent() {
    if (isOpen) renderGrid();
  }

  async function ensureBuilt() {
    if (isBuilt) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'config-screen-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');

    const response = await fetch(TEMPLATE_PATH);
    overlayEl.innerHTML = (await response.text()).trim();

    gridEl = overlayEl.querySelector('[data-role="grid"]');
    emptyEl = overlayEl.querySelector('[data-role="empty"]');

    overlayEl.querySelector('[data-role="close"]').addEventListener('click', close);
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });

    document.addEventListener('keydown', (e) => {
      if (isOpen && e.key === 'Escape') close();
    });

    ['app:tab-changed', 'app:tab-created', 'app:tab-closed'].forEach((eventName) => {
      document.addEventListener(eventName, onTabEvent);
    });

    document.body.appendChild(overlayEl);
    isBuilt = true;
  }

  async function open() {
    await ensureBuilt();
    renderGrid();
    isOpen = true;
    if (window.ConfigAnim) window.ConfigAnim.open(overlayEl);
  }

  function close() {
    if (!overlayEl) return;
    isOpen = false;
    if (window.ConfigAnim) window.ConfigAnim.close(overlayEl);
  }

  function init() {
    const configBtn = document.getElementById('configBtn');
    if (!configBtn) return;

    configBtn.addEventListener('click', open);
  }

  window.ConfigOverview = { open, close, init, renderGrid };
})();
