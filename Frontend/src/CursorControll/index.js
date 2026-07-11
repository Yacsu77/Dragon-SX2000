/**
 * CursorControll — ponto de entrada do módulo.
 */
(function () {
  async function handlePendingWindowUrl() {
    if (!window.DragonCursorControl || typeof window.DragonCursorControl.consumePendingUrl !== 'function') {
      return;
    }
    try {
      const url = await window.DragonCursorControl.consumePendingUrl();
      if (url && typeof window.createTab === 'function') {
        window.createTab(url);
      }
    } catch (err) {
      window.CursorLogger?.warn('Falha ao consumir URL pendente', err);
    }
  }

  function init() {
    window.CursorMouseEventService?.init();
    handlePendingWindowUrl();
  }

  window.CursorControll = { init };
})();
