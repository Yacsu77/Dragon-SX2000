/**
 * SessionTabs — persiste e restaura as abas abertas entre sessões.
 *
 * Ativado por PerfSettings.restoreSessionTabs (Editar → Sessão).
 * Snapshot em localStorage: dragonsx.session.tabs
 *
 * API:
 *   SessionTabs.init()
 *   SessionTabs.saveNow()
 *   SessionTabs.restore() → boolean (true se restaurou algo)
 *   SessionTabs.clear()
 */
(function () {
  if (window.SessionTabs) return;

  const STORAGE_KEY = 'dragonsx.session.tabs';
  const MAX_TABS = 30;
  const SAVE_DEBOUNCE_MS = 400;

  let saveTimer = null;
  let restoring = false;
  let started = false;

  function isEnabled() {
    return !!(window.PerfSettings && window.PerfSettings.isRestoreSessionTabs());
  }

  function readSnapshot() {
    try {
      const raw = ((window.UserStorage && window.UserStorage.getItem(STORAGE_KEY)) || null);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tabs)) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeSnapshot(payload) {
    try {
      (window.UserStorage ? window.UserStorage.setItem(STORAGE_KEY, JSON.stringify(payload)) : localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)));
    } catch (_) { /* ignore */ }
  }

  function clear() {
    try {
      (window.UserStorage ? window.UserStorage.removeItem(STORAGE_KEY) : localStorage.removeItem(STORAGE_KEY));
    } catch (_) { /* ignore */ }
  }

  function collectTabs() {
    const tabsRoot = document.getElementById('tabs');
    if (!tabsRoot) return [];

    const tabs = Array.from(tabsRoot.querySelectorAll('.tab'));
    const result = [];

    tabs.forEach((tab) => {
      if (result.length >= MAX_TABS) return;
      const id = tab.dataset.id || '';
      const isHomeTab = id.startsWith('home-tab');
      const titleEl = tab.querySelector('.tab-title');
      const title = titleEl ? titleEl.textContent.trim() : '';
      const active = tab.classList.contains('active');

      if (isHomeTab) {
        result.push({ isHomeTab: true, url: null, title: title || 'New Tab', active });
        return;
      }

      const webview = document.querySelector(`webview[data-id="${id}"]`);
      let url = null;
      try {
        url = (webview && typeof webview.getURL === 'function' && webview.getURL()) || (webview && webview.src) || null;
      } catch (_) {
        url = webview && webview.src ? webview.src : null;
      }

      if (!url || url === 'about:blank') return;

      result.push({
        isHomeTab: false,
        url,
        title: title || null,
        active,
      });
    });

    return result;
  }

  function saveNow() {
    if (!isEnabled() || restoring) return;
    const tabs = collectTabs();
    writeSnapshot({
      version: 1,
      savedAt: Date.now(),
      tabs,
    });
  }

  function scheduleSave() {
    if (!isEnabled() || restoring) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveNow();
    }, SAVE_DEBOUNCE_MS);
  }

  function restore() {
    if (!isEnabled()) return false;
    if (typeof window.createTab !== 'function' || typeof window.createHomeTab !== 'function') {
      return false;
    }

    const snapshot = readSnapshot();
    if (!snapshot || !snapshot.tabs.length) return false;

    restoring = true;
    let activeId = null;
    let lastId = null;

    try {
      snapshot.tabs.forEach((entry) => {
        if (!entry) return;

        if (entry.isHomeTab) {
          const id = window.createHomeTab(false);
          lastId = id;
          if (entry.active) activeId = id;
          return;
        }

        if (!entry.url) return;
        const id = window.createTabAfter
          ? window.createTabAfter(lastId, entry.url, entry.title || null, null, false)
          : window.createTab(entry.url, entry.title || null, null, false);
        lastId = id;
        if (entry.active) activeId = id;
      });

      if (!lastId) {
        restoring = false;
        return false;
      }

      if (activeId && typeof window.activateTab === 'function') {
        window.activateTab(activeId);
      } else if (lastId && typeof window.activateTab === 'function') {
        window.activateTab(lastId);
      }

      if (typeof updateTabsBarVisibility === 'function') {
        updateTabsBarVisibility();
      }
      return true;
    } catch (err) {
      console.warn('[SessionTabs] falha ao restaurar:', err);
      return false;
    } finally {
      restoring = false;
      // Regrava com os IDs novos da sessão atual.
      scheduleSave();
    }
  }

  function onBeforeUnload() {
    if (!isEnabled()) return;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    saveNow();
  }

  function init() {
    if (started) return;
    started = true;

    ['app:tab-created', 'app:tab-closed', 'app:tab-changed', 'app:webview-navigated'].forEach((name) => {
      document.addEventListener(name, scheduleSave);
    });

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onBeforeUnload);

    if (window.PerfSettings && typeof window.PerfSettings.onChange === 'function') {
      window.PerfSettings.onChange((snapshot) => {
        if (snapshot && snapshot.restoreSessionTabs) scheduleSave();
      });
    }
  }

  window.SessionTabs = {
    init,
    saveNow,
    restore,
    clear,
    collectTabs,
  };
})();
