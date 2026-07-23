/**
 * PasswordManager — API pública + boot.
 */
(function () {
  if (window.PasswordManager) return;

  function init() {
    window.PasswordService?.init?.();
    window.PasswordIndicator?.init?.();
  }

  function dismiss() {
    window.PasswordIndicator?.dismiss?.();
  }

  function rescan() {
    const webview = document.querySelector('webview.active');
    if (!webview) return;
    try {
      webview.executeJavaScript(
        'window.__DSX_PASSWORD__ && window.__DSX_PASSWORD__.scan && window.__DSX_PASSWORD__.scan()',
        true
      ).catch(() => {});
    } catch (_) { /* ignore */ }
  }

  function armAutoLogin(url) {
    return window.PasswordService?.armForNavigation?.(url) || false;
  }

  window.PasswordManager = { init, dismiss, rescan, armAutoLogin };
})();
