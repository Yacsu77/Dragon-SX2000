/**
 * Janelas — constantes, limiares e nomes de eventos.
 * Single source of truth para contratos entre módulos.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.Types) return;

  NS.Types = Object.freeze({
    STORAGE_KEY: 'dragonsx.janelas',

    /** Pixels abaixo do bottom da barra de abas para armar detach (feature 2). */
    DETACH_Y_THRESHOLD: 48,

    /** Hover parado na aba antes de mostrar mini visualizador (feature 1). */
    PREVIEW_HOVER_MS: 500,

    WINDOW_LAYOUTS: Object.freeze(['standard', 'floating']),
    MULTI_LAYOUTS: Object.freeze(['standard', 'floating']),
    TAB_TRANSITIONS: Object.freeze(['none', 'flip', 'file-drop']),

    EVENTS: Object.freeze({
      SETTINGS_CHANGED: 'janelas:settings-changed',
      SPLIT_OPENED: 'janelas:split-opened',
      SPLIT_CLOSED: 'janelas:split-closed',
      PANE_FOCUSED: 'janelas:pane-focused',
      DETACH_ARMED: 'janelas:detach-armed',
      DETACH_DISARMED: 'janelas:detach-disarmed',
      PREVIEW_SHOW: 'janelas:preview-show',
      PREVIEW_HIDE: 'janelas:preview-hide',
    }),
  });
})();
