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

  function getSnapshotIconMarkup(snapshot) {
    if (snapshot.favicon_url) {
      return `<img src="${escapeHtml(snapshot.favicon_url)}" alt="" />`;
    }
    if (snapshot.is_home) {
      return '<span aria-hidden="true">⌂</span>';
    }
    return '<span aria-hidden="true">🌐</span>';
  }

  function createLiveTabCard(tab) {
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

      return card;
  }

  function createSnapshotCard(group, snapshot) {
    const title = snapshot.title || (snapshot.is_home ? 'New Tab' : snapshot.url || 'Aba');
    const card = document.createElement('article');
    card.className = `config-card${snapshot.active ? ' config-card--active' : ''}`;
    card.innerHTML = `
      <div class="config-card__preview">${getSnapshotIconMarkup(snapshot)}</div>
      <div class="config-card__meta">
        <div class="config-card__title">${escapeHtml(title)}</div>
      </div>
    `;
    card.addEventListener('click', async () => {
      await window.TabGroupsRuntime?.switchToGroup?.(group.id);
      close();
    });
    return card;
  }

  function renderGroupSection(group, isActiveGroup) {
    const section = document.createElement('section');
    section.className = 'config-group-section';
    section.style.setProperty('--group-color', group.color || '#7a8cff');

    const header = document.createElement('div');
    header.className = 'config-group-section__header';
    header.innerHTML = `
      <span class="config-group-section__dot" aria-hidden="true"></span>
      <strong>${escapeHtml(group.name || 'Grupo')}</strong>
      <small>${isActiveGroup ? 'Ativo' : 'Snapshot'}</small>
    `;
    section.appendChild(header);

    const groupGrid = document.createElement('div');
    groupGrid.className = 'config-grid';

    if (isActiveGroup) {
      Array.from(document.querySelectorAll('.tab')).forEach((tab) => {
        groupGrid.appendChild(createLiveTabCard(tab));
      });
    } else {
      (group.tabs || []).forEach((snapshot) => {
        groupGrid.appendChild(createSnapshotCard(group, snapshot));
      });
    }

    if (!groupGrid.childElementCount) {
      const empty = document.createElement('p');
      empty.className = 'config-empty config-empty--group';
      empty.textContent = 'Grupo sem abas salvas.';
      groupGrid.appendChild(empty);
    }

    section.appendChild(groupGrid);
    return section;
  }

  function renderGrid() {
    if (!gridEl || !emptyEl) return;

    const tabGroups = window.TabGroupsState?.getGroups?.() || [];
    const activeGroupId = window.TabGroupsState?.getActiveGroupId?.() || null;
    const tabs = Array.from(document.querySelectorAll('.tab'));
    gridEl.innerHTML = '';

    if (tabGroups.length) {
      const hasAnyTabs = tabGroups.some((group) => (group.tabs || []).length) || tabs.length > 0;
      emptyEl.hidden = hasAnyTabs;
      tabGroups.forEach((group) => {
        gridEl.appendChild(renderGroupSection(group, group.id === activeGroupId));
      });
      return;
    }

    emptyEl.hidden = tabs.length > 0;
    tabs.forEach((tab) => {
      gridEl.appendChild(createLiveTabCard(tab));
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
