/**
 * Janelas — preferências fixas (createDefaults) + estado runtime de split.
 * Layout, bordas e transição não são preferência do usuário.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.Store) return;

  const { Types, Bus, createDefaults, createRuntimeState } = NS;
  if (!Types || !createDefaults) return;

  let settings = createDefaults();
  let runtime = createRuntimeState();

  function getSettings() {
    return { ...settings };
  }

  function setSettings(patch) {
    settings = { ...createDefaults(), ...(patch && typeof patch === 'object' ? patch : {}) };
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
    settings = createDefaults();
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

  settings = createDefaults();
})();
