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

  if (window.Tabline && typeof window.Tabline.init === 'function') {
    await window.Tabline.init();
  }

  if (window.TopBar) window.TopBar.init();

  if (window.Home) await window.Home.init();

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  if (window.AppShell && typeof window.AppShell.showHome === 'function') {
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
