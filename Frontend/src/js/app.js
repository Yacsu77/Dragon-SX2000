/**
 * Bootstrap da aplicação — orquestração global.
 */
async function initApp() {
  if (window.Shell && typeof window.Shell.mountAll === 'function') {
    await window.Shell.mountAll();
  }

  if (window.Browser && typeof window.Browser.init === 'function') {
    await window.Browser.init();
  }

  if (window.CursorControll && typeof window.CursorControll.init === 'function') {
    window.CursorControll.init();
  }

  if (window.Tabline && typeof window.Tabline.init === 'function') {
    await window.Tabline.init();
  }

  if (window.TopBar) window.TopBar.init();

  if (window.ConnectionPrefetch && typeof window.ConnectionPrefetch.init === 'function') {
    window.ConnectionPrefetch.init();
  }

  if (window.PerfSettings && typeof window.PerfSettings.init === 'function') {
    window.PerfSettings.init();
  }

  if (window.SessionTabs && typeof window.SessionTabs.init === 'function') {
    window.SessionTabs.init();
  }

  if (window.Home) await window.Home.init();

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  let restored = false;
  if (window.SessionTabs && typeof window.SessionTabs.restore === 'function') {
    restored = !!window.SessionTabs.restore();
  }

  if (!restored && window.AppShell && typeof window.AppShell.showHome === 'function') {
    window.AppShell.showHome();
  }

  if (typeof updateTabsBarVisibility === 'function') {
    setTimeout(() => updateTabsBarVisibility(), 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initApp().catch(console.error);
  });
} else {
  initApp().catch(console.error);
}
