/**
 * Serviço de eventos do mouse — webviews e abas.
 */
(function () {
  function attachWebviewEvents(webview) {
    if (!webview || webview.dataset.cursorEvents === 'true') return;
    webview.dataset.cursorEvents = 'true';

    webview.addEventListener('context-menu', (event) => {
      event.preventDefault();
      const params = event.params || {};
      const rect = webview.getBoundingClientRect();
      const screenX = event.clientX ?? (rect.left + (params.x || 0));
      const screenY = event.clientY ?? (rect.top + (params.y || 0));
      const context = window.CursorContextDetection.fromWebviewContextMenu(
        params,
        webview,
        { x: screenX, y: screenY },
      );
      window.useCursorContextMenu.openContextMenu(context);
    });

    window.useMiddleMouseScroll.attachToWebview(webview);
  }

  function attachTabEvents(tabElement) {
    if (!tabElement || tabElement.dataset.cursorTabEvents === 'true') return;
    tabElement.dataset.cursorTabEvents = 'true';

    tabElement.addEventListener('contextmenu', (e) => {
      // X da aba tem prioridade — não abrir menu em cima do fechar.
      if (e.target?.closest?.('.tab-close')) return;
      e.preventDefault();
      e.stopPropagation();
      const context = window.CursorContextDetection.fromTabElement(
        tabElement,
        { x: e.clientX, y: e.clientY },
      );
      window.useCursorContextMenu.openContextMenu(context);
    });

    tabElement.addEventListener('auxclick', (e) => {
      if (e.button !== 1) return;
      if (e.target?.closest?.('.tab-close')) return;
      e.preventDefault();
      e.stopPropagation();
      const tabId = tabElement.dataset.id;
      if (tabId && typeof window.closeTab === 'function') {
        window.CursorMiddleMouseScroll?.stop();
        window.closeTab(tabId);
      }
    });

    tabElement.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault();
    });
  }

  function observeWebviews() {
    const browser = document.getElementById('browser');
    if (!browser) return;

    browser.querySelectorAll('webview').forEach(attachWebviewEvents);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'WEBVIEW') attachWebviewEvents(node);
        });
      });
    });

    observer.observe(browser, { childList: true });
  }

  function observeTabs() {
    const tabsContainer = document.getElementById('tabs');
    if (!tabsContainer) return;

    tabsContainer.querySelectorAll('.tab').forEach(attachTabEvents);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.classList && node.classList.contains('tab')) attachTabEvents(node);
        });
      });
    });

    observer.observe(tabsContainer, { childList: true });
  }

  function init() {
    observeWebviews();
    observeTabs();

    // Fecha menu só ao trocar de aba — NÃO em app:webview-navigated.
    // Durante load/redirects o webview emite navegação várias vezes e
    // matava o menu aberto pelo botão direito na aba.
    document.addEventListener('app:tab-changed', () => {
      window.CursorMiddleMouseScroll?.stop();
      window.CursorContextMenu?.close();
    });
  }

  window.CursorMouseEventService = { init, attachWebviewEvents, attachTabEvents };
})();
