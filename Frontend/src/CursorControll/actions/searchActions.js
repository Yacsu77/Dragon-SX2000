/**
 * Ações de busca do CursorControll.
 */
(function () {
  function searchGoogleInNewTab(referenceTabId, query) {
    const trimmed = (query || '').trim();
    if (!trimmed) return { ok: false, error: 'empty' };

    const url = window.CursorUrlUtils?.buildGoogleSearchUrl(trimmed);
    if (!url) return { ok: false, error: 'invalid' };

    if (typeof window.createTabAfter === 'function' && referenceTabId) {
      const tabId = window.createTabAfter(referenceTabId, url, `Busca: ${trimmed}`, null, true);
      return tabId ? { ok: true, tabId } : { ok: false, error: 'create-failed' };
    }

    if (typeof window.createTab === 'function') {
      const tabId = window.createTab(url, `Busca: ${trimmed}`);
      return tabId ? { ok: true, tabId } : { ok: false, error: 'create-failed' };
    }

    return { ok: false, error: 'api-unavailable' };
  }

  async function pasteAndGo(webview) {
    const clip = await window.CursorClipboardActions?.readText();
    if (!clip?.ok || !clip.text?.trim()) {
      return { ok: false, error: 'empty-clipboard' };
    }

    const target = window.CursorUrlUtils?.resolveNavigationTarget(clip.text);
    if (!target) return { ok: false, error: 'invalid' };

    return window.CursorNavigationActions?.navigateInPlace(webview, target) || { ok: false, error: 'navigation-failed' };
  }

  window.CursorSearchActions = {
    searchGoogleInNewTab,
    pasteAndGo,
  };
})();
