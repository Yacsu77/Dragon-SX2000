/**
 * Ações de links do CursorControll.
 */
(function () {
  function validateLink(url) {
    if (!url) return { ok: false, error: 'no-url' };
    const normalized = window.CursorUrlUtils?.normalizeUrl(url);
    if (!normalized || !window.CursorUrlUtils?.isAllowedUrl(normalized)) {
      return { ok: false, error: 'url-not-allowed' };
    }
    return { ok: true, url: normalized };
  }

  function openInCurrentTab(webview, url) {
    const check = validateLink(url);
    if (!check.ok) return check;
    return window.CursorNavigationActions?.navigateInPlace(webview, check.url) || { ok: false, error: 'navigation-failed' };
  }

  function openInNewTab(referenceTabId, url, title) {
    const check = validateLink(url);
    if (!check.ok) return check;

    if (typeof window.createTabAfter === 'function' && referenceTabId) {
      const tabId = window.createTabAfter(referenceTabId, check.url, title || check.url, null, true);
      return tabId ? { ok: true, tabId } : { ok: false, error: 'create-failed' };
    }

    if (typeof window.createTab === 'function') {
      const tabId = window.createTab(check.url, title || check.url);
      return tabId ? { ok: true, tabId } : { ok: false, error: 'create-failed' };
    }

    return { ok: false, error: 'api-unavailable' };
  }

  async function openInNewWindow(url) {
    const check = validateLink(url);
    if (!check.ok) return check;

    const userId = window.UserSession?.getActiveUserId?.() || null;

    if (window.DragonJanelas?.createWithTab) {
      try {
        const result = await window.DragonJanelas.createWithTab(
          { url: check.url, title: null, is_home: false, active: true },
          userId
        );
        return result?.ok ? { ok: true } : { ok: false, error: result?.error || 'window-failed' };
      } catch (err) {
        window.CursorLogger?.error('Falha ao abrir nova janela', err);
        return { ok: false, error: 'window-failed' };
      }
    }

    if (window.DragonCursorControl && typeof window.DragonCursorControl.createWindow === 'function') {
      try {
        const result = await window.DragonCursorControl.createWindow(check.url, userId);
        return result?.ok ? { ok: true } : { ok: false, error: result?.error || 'window-failed' };
      } catch (err) {
        window.CursorLogger?.error('Falha ao abrir nova janela', err);
        return { ok: false, error: 'window-failed' };
      }
    }

    return { ok: false, error: 'ipc-unavailable' };
  }

  async function copyLink(url) {
    const check = validateLink(url);
    if (!check.ok) return check;
    return window.CursorClipboardActions?.copyText(check.url) || { ok: false, error: 'clipboard-unavailable' };
  }

  window.CursorLinkActions = {
    openInCurrentTab,
    openInNewTab,
    openInNewWindow,
    copyLink,
    validateLink,
  };
})();
