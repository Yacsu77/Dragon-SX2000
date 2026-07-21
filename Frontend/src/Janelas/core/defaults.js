/**
 * Janelas — seed de preferências (layouts, bordas, animações).
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.createDefaults) return;

  NS.createDefaults = function createDefaults() {
    return {
      version: 1,
      windowLayout: 'standard',
      multiLayout: 'standard',
      borders: false,
      bordersAnimated: false,
      bordersRgb: false,
      tabTransition: 'none',
    };
  };

  NS.createRuntimeState = function createRuntimeState() {
    return {
      mode: 'single',
      focusPane: 'left',
      leftTabId: null,
      rightTabId: null,
    };
  };
})();
