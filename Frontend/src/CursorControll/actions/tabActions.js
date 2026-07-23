/**
 * Ações de abas do CursorControll.
 */
(function () {
  function getTabElement(tabId) {
    return document.querySelector(`.tab[data-id="${tabId}"]`);
  }

  function getWebview(tabId) {
    return document.querySelector(`webview[data-id="${tabId}"]`);
  }

  function getTabUrl(tabId) {
    const webview = getWebview(tabId);
    if (!webview) return '';
    try {
      return webview.getURL() || '';
    } catch {
      return '';
    }
  }

  function getTabTitle(tabId) {
    const tab = getTabElement(tabId);
    const titleEl = tab?.querySelector('.tab-title');
    return titleEl?.textContent?.trim() || '';
  }

  function duplicateTab(tabId) {
    if (!tabId || tabId.startsWith('home-tab')) {
      return { ok: false, error: 'invalid-tab' };
    }

    const url = getTabUrl(tabId);
    if (!url || url === 'about:blank') {
      return { ok: false, error: 'no-url' };
    }

    const title = getTabTitle(tabId);

    if (typeof window.createTabAfter === 'function') {
      const newTabId = window.createTabAfter(tabId, url, title, null, true);
      return newTabId ? { ok: true, tabId: newTabId } : { ok: false, error: 'create-failed' };
    }

    if (typeof window.createTab === 'function') {
      const newTabId = window.createTab(url, title);
      return newTabId ? { ok: true, tabId: newTabId } : { ok: false, error: 'create-failed' };
    }

    return { ok: false, error: 'api-unavailable' };
  }

  function closeTabById(tabId) {
    if (!tabId || typeof window.closeTab !== 'function') {
      return { ok: false, error: 'invalid' };
    }
    try {
      window.closeTab(tabId);
      return { ok: true };
    } catch (err) {
      window.CursorLogger?.error('Falha ao fechar aba', err);
      return { ok: false, error: 'close-failed' };
    }
  }

  function copyTabUrl(tabId) {
    const url = getTabUrl(tabId);
    if (!url || url === 'about:blank') {
      return { ok: false, error: 'no-url' };
    }
    return window.CursorClipboardActions?.copyText(url) || { ok: false, error: 'clipboard-unavailable' };
  }

  function toggleTabMute(tabId) {
    const webview = getWebview(tabId);
    if (!webview || typeof webview.setAudioMuted !== 'function') {
      return { ok: false, error: 'no-webview' };
    }

    try {
      const currentlyMuted = webview.isAudioMuted();
      webview.setAudioMuted(!currentlyMuted);
      updateTabMuteIndicator(tabId, !currentlyMuted);
      return { ok: true, isMuted: !currentlyMuted };
    } catch (err) {
      window.CursorLogger?.error('Falha ao alternar áudio da aba', err);
      return { ok: false, error: 'mute-failed' };
    }
  }

  function updateTabMuteIndicator(tabId, isMuted) {
    const tab = getTabElement(tabId);
    if (!tab) return;
    tab.classList.toggle('tab--muted', Boolean(isMuted));
    tab.dataset.muted = isMuted ? 'true' : 'false';
  }

  function syncTabMuteIndicator(tabId) {
    const webview = getWebview(tabId);
    if (!webview) return;
    try {
      updateTabMuteIndicator(tabId, webview.isAudioMuted());
    } catch {
      // ignore
    }
  }

  function pickGroup(title = 'Escolha um grupo') {
    const groups = window.TabGroupsState?.getGroups?.() || [];
    if (!groups.length) return Promise.resolve(null);

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:120000',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'background:rgba(0,0,0,.35)',
        'backdrop-filter:blur(6px)',
      ].join(';');

      const panel = document.createElement('div');
      panel.style.cssText = [
        'width:min(320px,calc(100vw - 32px))',
        'border-radius:16px',
        'background:rgba(18,20,28,.96)',
        'border:1px solid rgba(255,255,255,.14)',
        'box-shadow:0 18px 60px rgba(0,0,0,.45)',
        'padding:12px',
        'color:#fff',
      ].join(';');

      const heading = document.createElement('strong');
      heading.textContent = title;
      heading.style.display = 'block';
      heading.style.margin = '0 0 10px';
      panel.appendChild(heading);

      let onKeyDown = null;
      const close = () => {
        if (onKeyDown) {
          document.removeEventListener('keydown', onKeyDown);
          onKeyDown = null;
        }
        overlay.remove();
      };

      groups.forEach((group) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = `${group.icon || 'folder'}  ${group.name || 'Grupo'}`;
        button.style.cssText = [
          'width:100%',
          'display:block',
          'text-align:left',
          'margin:6px 0',
          'padding:9px 10px',
          'border-radius:10px',
          `border:1px solid ${group.color || '#7a8cff'}`,
          'background:rgba(255,255,255,.07)',
          'color:#fff',
          'cursor:pointer',
        ].join(';');
        button.addEventListener('click', () => {
          close();
          resolve(group);
        });
        panel.appendChild(button);
      });

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          close();
          resolve(null);
        }
      });
      onKeyDown = function handleKeyDown(event) {
        if (event.key !== 'Escape') return;
        close();
        resolve(null);
      };
      document.addEventListener('keydown', onKeyDown);

      overlay.appendChild(panel);
      document.body.appendChild(overlay);
    });
  }

  async function addTabToGroup(tabId) {
    const group = await pickGroup('Adicionar aba ao grupo');
    if (!group) return { ok: false, error: 'cancelled' };
    return window.TabGroupsRuntime?.addTabToGroup?.(tabId, group.id) || { ok: false, error: 'unavailable' };
  }

  async function moveTabToGroup(tabId) {
    const group = await pickGroup('Mover aba para o grupo');
    if (!group) return { ok: false, error: 'cancelled' };
    return window.TabGroupsRuntime?.moveTabToGroup?.(tabId, group.id) || { ok: false, error: 'unavailable' };
  }

  async function createGroupFromTab(tabId) {
    const title = getTabTitle(tabId) || 'Novo grupo';
    const group = await window.TabGroupsRuntime?.createGroupFromTab?.(tabId, {
      name: title.slice(0, 32),
      color: '#7a8cff',
      icon: 'folder',
    });
    return group ? { ok: true, groupId: group.id } : { ok: false, error: 'create-failed' };
  }

  window.CursorTabActions = {
    duplicateTab,
    closeTabById,
    copyTabUrl,
    toggleTabMute,
    getTabUrl,
    getTabTitle,
    addTabToGroup,
    moveTabToGroup,
    createGroupFromTab,
    updateTabMuteIndicator,
    syncTabMuteIndicator,
  };
})();
