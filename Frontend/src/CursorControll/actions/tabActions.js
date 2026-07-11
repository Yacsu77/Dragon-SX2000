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

  window.CursorTabActions = {
    duplicateTab,
    closeTabById,
    copyTabUrl,
    toggleTabMute,
    getTabUrl,
    getTabTitle,
    updateTabMuteIndicator,
    syncTabMuteIndicator,
  };
})();
