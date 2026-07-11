/**
 * Ações de navegação do CursorControll.
 */
(function () {
  function getActiveWebview() {
    return document.querySelector('webview.active');
  }

  function goBack(webview) {
    const view = webview || getActiveWebview();
    if (!view) return { ok: false, error: 'no-webview' };
    try {
      if (!view.canGoBack()) return { ok: false, error: 'no-history' };
      view.goBack();
      return { ok: true };
    } catch (err) {
      window.CursorLogger?.error('Falha ao voltar', err);
      return { ok: false, error: 'navigation-failed' };
    }
  }

  function reload(webview) {
    const view = webview || getActiveWebview();
    if (!view) return { ok: false, error: 'no-webview' };
    try {
      if (typeof view.reload === 'function') {
        view.reload();
      } else {
        const url = view.getURL();
        if (url) view.src = url;
      }
      return { ok: true };
    } catch (err) {
      window.CursorLogger?.error('Falha ao recarregar', err);
      return { ok: false, error: 'reload-failed' };
    }
  }

  function navigateInPlace(webview, url) {
    const view = webview || getActiveWebview();
    if (!view || !url) return { ok: false, error: 'invalid' };
    if (!window.CursorUrlUtils?.isAllowedUrl(url)) {
      return { ok: false, error: 'url-not-allowed' };
    }
    try {
      view.src = url;
      return { ok: true };
    } catch (err) {
      window.CursorLogger?.error('Falha ao navegar', err);
      return { ok: false, error: 'navigation-failed' };
    }
  }

  window.CursorNavigationActions = {
    goBack,
    reload,
    navigateInPlace,
  };
})();
