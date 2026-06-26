/**
 * Botões Voltar e Avançar da barra superior.
 */
(function () {
  function getActiveWebview() {
    return document.querySelector('webview.active');
  }

  function goBack() {
    const webview = getActiveWebview();
    if (webview && webview.canGoBack()) {
      webview.goBack();
    }
  }

  function goForward() {
    const webview = getActiveWebview();
    if (webview && webview.canGoForward()) {
      webview.goForward();
    }
  }

  function updateNavigationButtons() {
    const backBtn = document.getElementById('backBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const webview = getActiveWebview();
    const setState = window.ButtonGoAnim && window.ButtonGoAnim.setButtonState;

    if (!setState) return;

    if (webview) {
      setState(backBtn, webview.canGoBack());
      setState(forwardBtn, webview.canGoForward());
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
