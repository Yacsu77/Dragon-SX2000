/**
 * Janelas — store de preferências + estado runtime de split.
 * Persistência via UserStorage quando disponível; senão localStorage.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.Store) return;

  const { Types, Bus, createDefaults, createRuntimeState } = NS;
  if (!Types || !createDefaults) return;

  let settings = createDefaults();
  let runtime = createRuntimeState();

  function readStorage() {
    try {
      if (window.UserStorage?.get) {
        const raw = window.UserStorage.get(Types.STORAGE_KEY);
        if (raw && typeof raw === 'object') return { ...createDefaults(), ...raw };
      }
      const ls = localStorage.getItem(Types.STORAGE_KEY);
      if (ls) return { ...createDefaults(), ...JSON.parse(ls) };
    } catch (_) {
      /* ignore */
    }
    return createDefaults();
  }

  function writeStorage(next) {
    try {
      if (window.UserStorage?.set) {
        window.UserStorage.set(Types.STORAGE_KEY, next);
        return;
      }
      localStorage.setItem(Types.STORAGE_KEY, JSON.stringify(next));
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
})();
