/**
 * UI dos grupos de abas na barra de abas.
 */
(function () {
  if (window.TabGroupsRender) return;

  let initialized = false;
  let panelEl = null;
  let buttonEl = null;
  let listEl = null;
  let previewEl = null;
  const pendingTimers = new Map();
  let dragGroupId = null;

  function groups() {
    return window.TabGroupsState?.getGroups?.() || [];
  }

  function activeGroupId() {
    return window.TabGroupsState?.getActiveGroupId?.() || null;
  }

  function setPanelOpen(open) {
    if (!panelEl || !buttonEl) return;
    panelEl.hidden = !open;
    buttonEl.classList.toggle('is-open', open);
    buttonEl.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open) hidePreview();
  }

  function scheduleGroupUpdate(groupId, patch) {
    const previous = pendingTimers.get(groupId);
    if (previous) clearTimeout(previous);

    pendingTimers.set(
      groupId,
      setTimeout(async () => {
        pendingTimers.delete(groupId);
        try {
          await window.TabGroupsRuntime?.updateGroup?.(groupId, patch);
        } catch (err) {
          console.warn('[TabGroupsRender] falha ao atualizar grupo:', err);
        }
      }, 350)
    );
  }

  function tabTitle(tab) {
    if (tab.is_home) return tab.title || 'New Tab';
    return tab.title || tab.url || 'Aba';
  }

  function faviconFor(tab) {
    if (tab.favicon_url) return tab.favicon_url;
    if (tab.is_home || !tab.url) return null;
    try {
      const origin = new URL(tab.url).origin;
      return `${origin}/favicon.ico`;
    } catch {
      return null;
    }
  }

  function ensurePreviewHost() {
    if (previewEl || !panelEl) return;
    previewEl = document.createElement('div');
    previewEl.className = 'tab-groups-hover-preview';
    previewEl.hidden = true;
    previewEl.addEventListener('mouseleave', (event) => {
      if (event.relatedTarget?.closest?.('.tab-group-card')) return;
      hidePreview();
    });
    panelEl.appendChild(previewEl);
  }

  function hidePreview() {
    if (!previewEl) return;
    previewEl.hidden = true;
    previewEl.innerHTML = '';
  }

  function showPreview(group, card) {
    ensurePreviewHost();
    if (!previewEl || !group || !panelEl) return;

    const tabs = (group.tabs || [])
      .slice()
      .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
      .slice(0, 5);
    previewEl.innerHTML = '';

    if (!tabs.length) {
      const empty = document.createElement('p');
      empty.className = 'tab-groups-hover-preview__empty';
      empty.textContent = 'Sem abas';
      previewEl.appendChild(empty);
    } else {
      tabs.forEach((tab) => {
        const row = document.createElement('div');
        row.className = 'tab-groups-hover-preview__row';

        const icon = document.createElement('span');
        icon.className = 'tab-groups-hover-preview__icon';
        const favicon = faviconFor(tab);
        if (favicon) {
          const img = document.createElement('img');
          img.src = favicon;
          img.alt = '';
          img.draggable = false;
          img.onerror = () => {
            img.remove();
            icon.textContent = tab.is_home ? '⌂' : '•';
          };
          icon.appendChild(img);
        } else {
          icon.textContent = tab.is_home ? '⌂' : '•';
        }

        const title = document.createElement('span');
        title.className = 'tab-groups-hover-preview__title';
        title.textContent = tabTitle(tab);

        row.append(icon, title);
        previewEl.appendChild(row);
      });
    }

    const panelRect = panelEl.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    previewEl.hidden = false;
    previewEl.style.top = `${Math.max(8, cardRect.top - panelRect.top)}px`;
  }

  async function persistOrderFromDom() {
    const cards = Array.from(listEl.querySelectorAll('.tab-group-card'));
    const current = groups();
    const updates = cards
      .map((card, index) => ({
        id: card.dataset.groupId,
        position: index,
      }))
      .filter((item) => {
        if (!item.id) return false;
        const group = current.find((entry) => entry.id === item.id);
        return Number(group?.position) !== item.position;
      });

    for (const item of updates) {
      try {
        await window.TabGroupsRuntime?.updateGroup?.(item.id, { position: item.position });
      } catch (err) {
        console.warn('[TabGroupsRender] falha ao reordenar grupo:', err);
      }
    }
  }

  function setupCardDrag(card) {
    card.draggable = true;

    card.addEventListener('dragstart', (event) => {
      if (event.target.closest('input, button, a')) {
        event.preventDefault();
        return;
      }
      dragGroupId = card.dataset.groupId;
      card.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', dragGroupId || '');
      hidePreview();
    });

    card.addEventListener('dragend', async () => {
      card.classList.remove('is-dragging');
      dragGroupId = null;
      listEl.querySelectorAll('.tab-group-card.is-drop-target').forEach((el) => {
        el.classList.remove('is-drop-target');
      });
      await persistOrderFromDom();
      render();
    });

    card.addEventListener('dragover', (event) => {
      if (!dragGroupId || dragGroupId === card.dataset.groupId) return;
      event.preventDefault();
      card.classList.add('is-drop-target');

      const rect = card.getBoundingClientRect();
      const before = event.clientY < rect.top + rect.height / 2;
      const dragging = listEl.querySelector(`.tab-group-card[data-group-id="${dragGroupId}"]`);
      if (!dragging || dragging === card) return;
      if (before) listEl.insertBefore(dragging, card);
      else listEl.insertBefore(dragging, card.nextSibling);
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('is-drop-target');
    });

    card.addEventListener('drop', (event) => {
      event.preventDefault();
      card.classList.remove('is-drop-target');
    });
  }

  function renderGroup(group, totalGroups) {
    const active = group.id === activeGroupId();
    const totalTabs = Array.isArray(group.tabs) ? group.tabs.length : 0;

    const card = document.createElement('article');
    card.className = `tab-group-card${active ? ' is-active' : ''}`;
    card.dataset.groupId = group.id;
    card.style.setProperty('--group-color', group.color || '#7a8cff');
    card.title = 'Arraste para reordenar';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'tab-group-card__delete';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Excluir grupo';
    deleteBtn.disabled = totalGroups <= 1;

    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.className = 'tab-group-card__color';
    swatch.value = group.color || '#7a8cff';
    swatch.title = 'Cor';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'tab-group-card__name';
    nameInput.value = group.name || 'Grupo';
    nameInput.title = 'Nome';
    nameInput.maxLength = 48;

    const count = document.createElement('span');
    count.className = 'tab-group-card__count';
    count.textContent = String(totalTabs);

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'tab-group-card__open';
    openBtn.textContent = active ? 'Ativo' : 'Abrir';

    nameInput.addEventListener('input', () => scheduleGroupUpdate(group.id, { name: nameInput.value }));
    swatch.addEventListener('input', () => {
      card.style.setProperty('--group-color', swatch.value);
      scheduleGroupUpdate(group.id, { color: swatch.value });
    });

    openBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      await window.TabGroupsRuntime?.switchToGroup?.(group.id);
      setPanelOpen(false);
    });

    deleteBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (deleteBtn.disabled) return;
      await window.TabGroupsRuntime?.deleteGroup?.(group.id);
      render();
    });

    card.addEventListener('mouseenter', () => {
      if (dragGroupId) return;
      showPreview(group, card);
    });
    card.addEventListener('mouseleave', (event) => {
      if (previewEl && (previewEl === event.relatedTarget || previewEl.contains(event.relatedTarget))) {
        return;
      }
      hidePreview();
    });

    card.append(deleteBtn, swatch, nameInput, count, openBtn);
    setupCardDrag(card);
    return card;
  }

  function render() {
    if (!listEl || !buttonEl) return;
    ensurePreviewHost();
    const allGroups = groups();
    const activeGroup = allGroups.find((group) => group.id === activeGroupId()) || allGroups[0];
    buttonEl.style.setProperty('--active-tab-group-color', activeGroup?.color || '#7a8cff');

    hidePreview();
    listEl.innerHTML = '';
    if (!allGroups.length) {
      const empty = document.createElement('p');
      empty.className = 'tab-groups-panel__empty';
      empty.textContent = 'Nenhum grupo.';
      listEl.appendChild(empty);
      return;
    }

    allGroups.forEach((group) => {
      listEl.appendChild(renderGroup(group, allGroups.length));
    });
  }

  async function createGroup() {
    const group = await window.TabGroupsRuntime?.createGroup?.({
      name: `Grupo ${groups().length + 1}`,
      color: '#7a8cff',
      icon: 'folder',
    });
    if (group) render();
  }

  function init() {
    if (initialized) return;
    buttonEl = document.getElementById('tabGroupsBtn');
    panelEl = document.getElementById('tabGroupsPanel');
    listEl = panelEl?.querySelector('[data-role="groups-list"]') || null;
    if (!buttonEl || !panelEl || !listEl) return;

    buttonEl.setAttribute('aria-haspopup', 'dialog');
    buttonEl.setAttribute('aria-expanded', 'false');
    buttonEl.addEventListener('click', (event) => {
      event.stopPropagation();
      setPanelOpen(panelEl.hidden);
      render();
    });

    panelEl.querySelector('[data-role="create-group"]')?.addEventListener('click', createGroup);
    document.addEventListener('click', (event) => {
      if (panelEl.hidden) return;
      if (panelEl.contains(event.target) || buttonEl.contains(event.target)) return;
      setPanelOpen(false);
    });

    document.addEventListener('tab-groups:changed', render);
    document.addEventListener('tab-groups:active-changed', render);
    ['app:tab-created', 'app:tab-closed', 'app:tab-changed'].forEach((eventName) => {
      document.addEventListener(eventName, () => {
        if (!panelEl.hidden) render();
      });
    });

    initialized = true;
    render();
  }

  window.TabGroupsRender = { init, render, setPanelOpen };
})();
