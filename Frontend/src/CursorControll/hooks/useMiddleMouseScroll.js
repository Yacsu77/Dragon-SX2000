/**
 * Hook do autoscroll com botão do meio.
 */
(function () {
  function attachToWebview(webview) {
    if (!webview || webview.dataset.cursorMiddleScroll === 'true') return;
    webview.dataset.cursorMiddleScroll = 'true';

    webview.addEventListener('mousedown', (e) => {
      if (e.button !== 1) return;
      e.preventDefault();
      window.CursorMiddleMouseScroll?.start(webview, e.clientX, e.clientY);
    });

    webview.addEventListener('auxclick', (e) => {
      if (e.button === 1) e.preventDefault();
    });

    const stopOnNav = () => window.CursorMiddleMouseScroll?.stop();
    webview.addEventListener('did-start-navigation', stopOnNav);
    webview.addEventListener('did-navigate', stopOnNav);
  }

  window.useMiddleMouseScroll = {
    attachToWebview,
  };
})();
