/**
 * Botões Voltar e Avançar da barra superior.
 */
(function () {
  function getActiveWebview() {
    return document.querySelector('webview.active');
  }

  function safeCanGoBack(webview) {
    try {
      return !!(webview && typeof webview.canGoBack === 'function' && webview.canGoBack());
    } catch {
      return false;
    }
  }

  function safeCanGoForward(webview) {
    try {
      return !!(webview && typeof webview.canGoForward === 'function' && webview.canGoForward());
    } catch {
      return false;
    }
  }

  function goBack() {
    const webview = getActiveWebview();
    if (!webview) return;
    try {
      if (webview.canGoBack()) webview.goBack();
    } catch {
      /* webview ainda sem dom-ready */
    }
  }

  function goForward() {
    const webview = getActiveWebview();
    if (!webview) return;
    try {
      if (webview.canGoForward()) webview.goForward();
    } catch {
      /* webview ainda sem dom-ready */
    }
  }

  function updateNavigationButtons() {
    const backBtn = document.getElementById('backBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const webview = getActiveWebview();
    const setState = window.ButtonGoAnim && window.ButtonGoAnim.setButtonState;

    if (!setState) return;

    if (webview) {
      setState(backBtn, safeCanGoBack(webview));
      setState(forwardBtn, safeCanGoForward(webview));
    } else {
      setState(backBtn, false);
      setState(forwardBtn, false);
    }
  }

  function onWebviewNavigated(e) {
    const { canGoBack, canGoForward } = e.detail || {};
    const backBtn = document.getElementById('backBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const setState = window.ButtonGoAnim && window.ButtonGoAnim.setButtonState;
    if (!setState) return;

    if (typeof canGoBack === 'boolean') setState(backBtn, canGoBack);
    if (typeof canGoForward === 'boolean') setState(forwardBtn, canGoForward);
  }

  function onTabChanged() {
    updateNavigationButtons();
  }

  function init() {
    const backBtn = document.getElementById('backBtn');
    const forwardBtn = document.getElementById('forwardBtn');

    if (backBtn) backBtn.addEventListener('click', goBack);
    if (forwardBtn) forwardBtn.addEventListener('click', goForward);

    document.addEventListener('app:webview-navigated', onWebviewNavigated);
    document.addEventListener('app:tab-changed', onTabChanged);

    updateNavigationButtons();
  }

  window.ButtonGo = { init, goBack, goForward, updateNavigationButtons };
  window.updateNavigationButtons = updateNavigationButtons;
})();
