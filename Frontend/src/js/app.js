/**
 * Bootstrap da aplicação — orquestração global + gate de usuário.
 */
async function closeAllBrowserTabs() {
  if (typeof window.clearTabsForGroupSwitch === 'function') {
    window.clearTabsForGroupSwitch(false);
    return;
  }

  const tabs = Array.from(document.querySelectorAll('.tab'));
  for (const tab of tabs) {
    const id = tab.dataset.id;
    if (id && typeof window.closeTab === 'function') {
      try {
        window.closeTab(id);
      } catch {
        tab.remove();
      }
    } else {
      tab.remove();
    }
  }
  document.querySelectorAll('webview').forEach((v) => v.remove());
}

async function reloadForActiveUser() {
  await closeAllBrowserTabs();

  if (window.DragonTheme && typeof window.DragonTheme.applyFromStorage === 'function') {
    window.DragonTheme.applyFromStorage();
  }

  if (window.WallpaperUserReload) {
    await window.WallpaperUserReload();
  }

  if (window.AutoTune && typeof window.AutoTune.reloadFromStorage === 'function') {
    window.AutoTune.reloadFromStorage();
  } else if (window.AutoTuneFactory && typeof window.AutoTuneFactory.reloadFromStorage === 'function') {
    window.AutoTuneFactory.reloadFromStorage();
  }

  if (window.Customise && typeof window.Customise.reloadFromStorage === 'function') {
    window.Customise.reloadFromStorage();
  }

  if (window.Favoritos && typeof window.Favoritos.reload === 'function') {
    await window.Favoritos.reload();
  }

  let restored = false;
  if (window.TabGroupsRuntime && typeof window.TabGroupsRuntime.reload === 'function') {
    restored = !!(await window.TabGroupsRuntime.reload());
  } else if (window.SessionTabs && typeof window.SessionTabs.restore === 'function') {
    restored = !!window.SessionTabs.restore();
  }
  if (!restored && window.AppShell && typeof window.AppShell.showHome === 'function') {
    window.AppShell.showHome();
    if (typeof window.createHomeTab === 'function') {
      window.createHomeTab();
    }
  }

  if (typeof updateTabsBarVisibility === 'function') {
    setTimeout(() => updateTabsBarVisibility(), 100);
  }
}

window.reloadForActiveUser = reloadForActiveUser;

async function waitForUserSelection(bootPromise) {
  const gatePromise = window.UserGate.open({
    loading: true,
    statusText: 'Preparando perfis…',
  });

  let boot;
  try {
    boot = await bootPromise;
  } catch (err) {
    console.error('[initApp] boot falhou:', err);
    window.UserGate.updateUsers(
      [],
      'Não foi possível conectar à API local. Aguarde e toque no + quando estiver pronto, ou reinicie o app.'
    );
    const recovered = await recoverBoot();
    boot = recovered;
  }

  if (boot.users) {
    window.UserGate.updateUsers(
      boot.users,
      boot.users.length ? '' : 'Toque no + para criar o primeiro perfil'
    );
  }

  return gatePromise;
}

async function recoverBoot() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const online = await window.DsxApi.waitForApi(4, 500);
      if (!online) continue;
      return window.UserSession.resolveForBoot();
    } catch {
      /* keep trying */
    }
  }
  return { needsOnboarding: true, needsSwitcher: false, users: [] };
}

async function mountWorkspace() {
  if (window.UserGate && typeof window.UserGate.showBootLoader === 'function') {
    window.UserGate.showBootLoader('Carregando seu espaço…');
  }

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

  if (window.TabGroupsRuntime && typeof window.TabGroupsRuntime.init === 'function') {
    await window.TabGroupsRuntime.init();
  }

  if (window.TabGroupsRender && typeof window.TabGroupsRender.init === 'function') {
    window.TabGroupsRender.init();
  }

  if (window.Home) await window.Home.init();

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  let restored = false;
  if (window.TabGroupsRuntime && typeof window.TabGroupsRuntime.restoreActiveGroup === 'function') {
    restored = !!(await window.TabGroupsRuntime.restoreActiveGroup());
  } else if (window.SessionTabs && typeof window.SessionTabs.restore === 'function') {
    restored = !!window.SessionTabs.restore();
  }

  if (!restored && window.AppShell && typeof window.AppShell.showHome === 'function') {
    window.AppShell.showHome();
    if (!document.querySelector('.tab') && typeof window.createHomeTab === 'function') {
      window.createHomeTab();
    }
  }

  if (typeof updateTabsBarVisibility === 'function') {
    setTimeout(() => updateTabsBarVisibility(), 100);
  }

  if (window.UserGate) {
    if (typeof window.UserGate.hideBootLoader === 'function') window.UserGate.hideBootLoader();
    window.UserGate.close();
  }
}

async function initApp() {
  if (!window.UserSession || !window.UserGate) {
    console.error('[initApp] UserSession/UserGate indisponíveis');
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#07090d;color:#fff;font-family:sans-serif;z-index:999999">Falha ao iniciar DSX. Recarregue o app.</div>'
    );
    return;
  }

  const bootPromise = window.UserSession.resolveForBoot();
  await waitForUserSelection(bootPromise);

  if (!window.UserSession.getActiveUserId()) {
    console.error('[initApp] Nenhum usuário ativo após o gate');
    return;
  }

  await mountWorkspace();

  document.addEventListener('user:changed', async (event) => {
    const previousUserId = event.detail?.previousUserId;
    const reason = event.detail?.reason;
    if (reason === 'photo') return;
    if (!previousUserId && reason === 'create') return;
    if (!previousUserId && (reason === 'unlock' || reason === 'select')) return;
    if (!previousUserId) return;
    await reloadForActiveUser();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initApp().catch((err) => {
      console.error(err);
      document.body.insertAdjacentHTML(
        'afterbegin',
        `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#07090d;color:#fff;font-family:sans-serif;z-index:999999;padding:24px;text-align:center">${
          (err && err.message) || 'Erro ao iniciar'
        }</div>`
      );
    });
  });
} else {
  initApp().catch(console.error);
}
