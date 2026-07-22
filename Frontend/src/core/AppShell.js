/**
 * AppShell — estado global da aplicação (home vs navegador).
 *
 * Troca new-tab ↔ conteúdo com crossfade + blur leve na superfície que sai.
 */
(function () {
  const SURFACE_MS = 320;
  let swapTimer = 0;

  function getSurfaces() {
    return {
      home: document.getElementById('homePage'),
      browser: document.getElementById('browser'),
    };
  }

  function clearSwapState() {
    document.body.classList.remove('surface-crossfade');
    const { home, browser } = getSurfaces();
    [home, browser].forEach((el) => {
      if (!el) return;
      el.classList.remove(
        'surface-leaving',
        'surface-entering',
        'surface-on-top',
        'is-fading',
        'is-shown'
      );
    });
  }

  function syncHomeActiveTab() {
    const active = window.TabsState?.currentActiveTab;
    if (active && String(active).startsWith('home-tab')) {
      window.currentActiveTab = active;
    } else {
      window.currentActiveTab = null;
    }
  }

  function isFloatingLayout() {
    return (
      document.body.classList.contains('janelas-window-floating') ||
      document.body.classList.contains('janelas-multi-floating')
    );
  }

  /** True se a New Tab (home) está na frente. */
  function isHomeSurfaceVisible(home, browser) {
    if (!home) return false;
    if (home.classList.contains('hidden')) return false;
    if (browser?.classList.contains('active') && home.classList.contains('hidden')) {
      return false;
    }
    // Home sem .hidden = New Tab visível
    return true;
  }

  /**
   * Crossfade: blur só em quem sai (evita hitch ao aplicar blur(0) no destino).
   */
  function crossfade(fromEl, toEl, after) {
    if (!fromEl || !toEl) {
      after?.();
      return;
    }

    if (swapTimer) {
      window.clearTimeout(swapTimer);
      swapTimer = 0;
      clearSwapState();
    }

    document.body.classList.add('surface-crossfade');
    toEl.classList.add('surface-entering');
    fromEl.classList.add('surface-leaving', 'surface-on-top');
    void fromEl.offsetWidth;

    requestAnimationFrame(() => {
      fromEl.classList.add('is-fading');
      toEl.classList.add('is-shown');
    });

    swapTimer = window.setTimeout(() => {
      swapTimer = 0;
      after?.();
      clearSwapState();
    }, SURFACE_MS);
  }

  function showHome() {
    const { home, browser } = getSurfaces();
    const fromBrowser = Boolean(browser?.classList.contains('active'));

    if (typeof window.setAutoTuneHomeVisible === 'function') {
      window.setAutoTuneHomeVisible(true);
    }

    const applyHomeChrome = () => {
      syncHomeActiveTab();
      if (typeof updateTabsBarVisibility === 'function') updateTabsBarVisibility();
      if (window.NavSearch?.clearAddressBar) window.NavSearch.clearAddressBar();
      if (typeof updateNavigationButtons === 'function') updateNavigationButtons();
      document.dispatchEvent(new CustomEvent('app:home-shown', { detail: {} }));
    };

    if (fromBrowser && home && !isFloatingLayout()) {
      home.classList.remove('hidden');
      applyHomeChrome();
      crossfade(browser, home, () => {
        browser.classList.remove('active');
      });
      return;
    }

    if (home) home.classList.remove('hidden');
    if (browser) browser.classList.remove('active');
    applyHomeChrome();
  }

  function showBrowser() {
    const { home, browser } = getSurfaces();
    const fromHome = isHomeSurfaceVisible(home, browser);

    if (typeof window.setAutoTuneHomeVisible === 'function') {
      window.setAutoTuneHomeVisible(false);
    }

    const applyBrowserChrome = () => {
      document.dispatchEvent(new CustomEvent('app:browser-shown', { detail: {} }));
    };

    if (fromHome && browser && !isFloatingLayout()) {
      // Garante home visível para o crossfade (fundo sólido no CSS de leave)
      home.classList.remove('hidden');
      browser.classList.add('active');
      applyBrowserChrome();
      crossfade(home, browser, () => {
        home.classList.add('hidden');
      });
      return;
    }

    if (home) home.classList.add('hidden');
    if (browser) browser.classList.add('active');
    applyBrowserChrome();
  }

  window.AppShell = {
    showHome,
    showBrowser,
    SURFACE_MS,
    init() {},
  };

  window.showHome = showHome;
  window.showBrowser = showBrowser;
})();
