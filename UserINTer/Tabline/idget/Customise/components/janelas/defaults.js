/**
 * Customise — Janelas: defaults + settings adapter.
 * Runtime: Frontend/src/Janelas (JanelasNS.Store).
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  const { Keys, SettingsAdapterRegistry, RuntimeAdapter } = NS;
  if (!Keys?.JANELAS || !SettingsAdapterRegistry || SettingsAdapterRegistry.has(Keys.JANELAS)) {
    return;
  }

  function read() {
    if (window.JanelasNS?.Store?.getSettings) {
      return window.JanelasNS.Store.getSettings();
    }
    return window.JanelasNS?.createDefaults?.() || {
      version: 1,
      windowLayout: 'standard',
      multiLayout: 'standard',
      borders: false,
      bordersAnimated: false,
      bordersRgb: false,
      tabTransition: 'none',
    };
  }

  function update(patch) {
    let next = read();
    if (patch && typeof patch === 'object') {
      next = window.JanelasNS?.Store?.setSettings
        ? window.JanelasNS.Store.setSettings({ ...next, ...patch })
        : { ...next, ...patch };
    }
    RuntimeAdapter?.notifyKey?.(Keys.JANELAS);
    window.JanelasNS?.LayoutRegistry?.apply?.();
    return next;
  }

  SettingsAdapterRegistry.register(Keys.JANELAS, { read, update });

  NS.JanelasComponent = {
    WINDOW_LAYOUTS: Object.freeze([
      { id: 'standard', label: 'Janela padrão' },
      { id: 'floating', label: 'Janela flutuante' },
    ]),
    MULTI_LAYOUTS: Object.freeze([
      { id: 'standard', label: 'Multijanela padrão' },
      { id: 'floating', label: 'Multijanelas flutuantes' },
    ]),
    TAB_TRANSITIONS: Object.freeze([
      { id: 'none', label: 'Sem animação' },
      { id: 'flip', label: 'Giro de janela' },
      { id: 'file-drop', label: 'Arquivo descendo' },
    ]),
  };
})();
