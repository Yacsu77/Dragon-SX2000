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

  async function init() {
    await ensureBuilt();
  }

  window.Browser = {
    init,
    setupWebviewNavigation,
  };

  window.setupWebviewNavigation = setupWebviewNavigation;
})();
