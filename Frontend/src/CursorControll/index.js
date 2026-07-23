/**
 * CursorControll — ponto de entrada do módulo.
 * URL pendente de nova janela é aplicada em Janelas.applyPendingTab (sessão limpa).
 */
(function () {
  function init() {
    window.CursorMouseEventService?.init();
  }

  window.CursorControll = { init };
})();
