/**
 * Janelas — store de preferências + estado runtime de split.
 * Persistência sempre via UserStorage (isolado por usuário).
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.Store) return;

  const { Types, Bus, createDefaults, createRuntimeState } = NS;
  if (!Types || !createDefaults) return;

  let settings = createDefaults();
  let runtime = createRuntimeState();

  function storageGet(key) {
    try {
      if (window.UserStorage?.getItem) return window.UserStorage.getItem(key);
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      if (window.UserStorage?.setItem) {
        window.UserStorage.setItem(key, value);
        return;
      }
      localStorage.setItem(key, value);
    } catch (_) {
      /* ignore */
    }
  }

  function migrateLegacyIfNeeded() {
    try {
      const namespaced = storageGet(Types.STORAGE_KEY);
      if (namespaced) return;
      const legacy = localStorage.getItem(Types.STORAGE_KEY);
      if (!legacy) return;
      // Só migra se a chave legada for exatamente a global (não namespaced).
      storageSet(Types.STORAGE_KEY, legacy);
    } catch (_) {
      /* ignore */
    }
  }

  function readStorage() {
    try {
      migrateLegacyIfNeeded();
      const raw = storageGet(Types.STORAGE_KEY);
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && typeof parsed === 'object') {
          return { ...createDefaults(), ...parsed };
        }
      }
    } catch (_) {
      /* ignore */
    }
    return createDefaults();
  }

  function writeStorage(next) {
    try {
      storageSet(Types.STORAGE_KEY, JSON.stringify(next));
    } catch (_) {
      /* ignore */
    }
  }

  function getSettings() {
    return { ...settings };
  }

  function setSettings(patch) {
    settings = { ...settings, ...(patch && typeof patch === 'object' ? patch : {}) };
    writeStorage(settings);
    Bus?.emit(Types.EVENTS.SETTINGS_CHANGED, { settings: getSettings() });
    return getSettings();
  }

  function getRuntime() {
    return { ...runtime };
  }

  function setRuntime(patch) {
    runtime = { ...runtime, ...(patch && typeof patch === 'object' ? patch : {}) };
    return getRuntime();
  }

  function resetRuntime() {
    runtime = createRuntimeState();
    return getRuntime();
  }

  function reload() {
    settings = readStorage();
    return getSettings();
  }

  NS.Store = {
    getSettings,
    setSettings,
    getRuntime,
    setRuntime,
    resetRuntime,
    reload,
  };

  settings = readStorage();

  document.addEventListener('user:changed', () => {
    reload();
    NS.LayoutRegistry?.apply?.();
    NS.RgbClock?.sync?.();
  });

  document.addEventListener('customise:reloaded', () => {
    reload();
    NS.LayoutRegistry?.apply?.();
    NS.RgbClock?.sync?.();
  });
})();
