/**
 * Container do navegador e eventos de navegação dos webviews.
 * Emite `app:webview-navigated` para ButtonGo e Search.
 */
(function () {
  const TEMPLATE_PATH = 'Browser/Browser.html';

  let isBuilt = false;

  function setupWebviewNavigation(webview) {
    if (!webview) return;

    function emitNavigated() {
      let url = '';
      let canGoBack = false;
      let canGoForward = false;

      try {
        url = webview.getURL();
        canGoBack = webview.canGoBack();
        canGoForward = webview.canGoForward();
      } catch (e) {
        // Ignorar
      }

      document.dispatchEvent(new CustomEvent('app:webview-navigated', {
        detail: { url, canGoBack, canGoForward, webview },
      }));
    }

    webview.addEventListener('did-start-navigation', emitNavigated);
    webview.addEventListener('did-finish-load', emitNavigated);
    webview.addEventListener('did-navigate', emitNavigated);
    webview.addEventListener('did-navigate-in-page', emitNavigated);
  }

  async function ensureBuilt() {
    if (isBuilt) return;

    if (document.getElementById('browser')) {
      isBuilt = true;
      return;
    }

    const mount = document.getElementById('browserMount');
    if (!mount) return;

    const response = await fetch(TEMPLATE_PATH);
    mount.innerHTML = (await response.text()).trim();
    isBuilt = true;
  }

  function setupExternalLinkHandler() {
    if (!window.DragonBrowser || typeof window.DragonBrowser.onOpenUrl !== 'function') return;

    window.DragonBrowser.onOpenUrl((url) => {
      if (!url || typeof url !== 'string') return;
      const trimmed = url.trim();
      if (!trimmed || trimmed === 'about:blank') return;

      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
      } catch {
        return;
      }

      // Evita aba duplicada se o destino já está aberto (redirects de encurtador).
      try {
        const open = document.querySelectorAll('#browser webview[data-id]');
        for (let i = 0; i < open.length; i += 1) {
          const view = open[i];
          let current = '';
          try {
            current =
              (typeof view.getURL === 'function' && view.getURL()) || view.src || '';
          } catch (_) {
            current = view.src || '';
          }
          if (current && window.CursorUrlUtils?.urlsMatch?.(current, trimmed)) {
            const tabId = view.dataset.id;
            if (tabId && typeof window.activateTab === 'function') {
              window.activateTab(tabId);
              return;
            }
          }
        }
      } catch (_) {
        /* segue para createTab */
      }

      if (typeof window.createTab === 'function') {
        window.createTab(trimmed);
      }
    });
  }

  async function init() {
    await ensureBuilt();
    setupExternalLinkHandler();
  }

  window.Browser = {
    init,
    setupWebviewNavigation,
  };

  window.setupWebviewNavigation = setupWebviewNavigation;
})();
