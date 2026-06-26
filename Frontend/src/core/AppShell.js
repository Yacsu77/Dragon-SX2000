/**
 * AppShell — estado global da aplicação (home vs navegador).
 *
 * ─── CustomEvents (document) ───────────────────────────────────────────────
 *
 * | app:home-shown          | AppShell | {} | AutoTune, Home |
 * | app:browser-shown       | AppShell | {} | AutoTune, ButtonGo, Search |
 *
 * ─── API pública ───────────────────────────────────────────────────────────
 *
 *   AppShell.showHome()
 *   AppShell.showBrowser()
 */
(function () {
  function showHome() {
    const homePage = document.getElementById('homePage');
    const browser = document.getElementById('browser');

    if (homePage) homePage.classList.remove('hidden');
    if (browser) browser.classList.remove('active');

    window.currentActiveTab = null;

    if (typeof updateTabsBarVisibility === 'function') {
      updateTabsBarVisibility();
    }

    if (window.NavSearch && typeof window.NavSearch.clearAddressBar === 'function') {
      window.NavSearch.clearAddressBar();
    }

    if (typeof updateNavigationButtons === 'function') {
      updateNavigationButtons();
    }

    if (typeof window.setAutoTuneHomeVisible === 'function') {
      window.setAutoTuneHomeVisible(true);
    }

    document.dispatchEvent(new CustomEvent('app:home-shown', { detail: {} }));
  }

  function showBrowser() {
    const homePage = document.getElementById('homePage');
    const browser = document.getElementById('browser');

    if (homePage) homePage.classList.add('hidden');
    if (browser) browser.classList.add('active');

    if (typeof window.setAutoTuneHomeVisible === 'function') {
      window.setAutoTuneHomeVisible(false);
    }

    document.dispatchEvent(new CustomEvent('app:browser-shown', { detail: {} }));
  }

  window.AppShell = {
    showHome,
    showBrowser,
    init() {},
  };

  window.showHome = showHome;
  window.showBrowser = showBrowser;
})();
