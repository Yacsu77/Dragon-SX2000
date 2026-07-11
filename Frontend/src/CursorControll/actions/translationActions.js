/**
 * Ação de tradução (recurso futuro).
 */
(function () {
  /**
   * @returns {import('../types/cursorControll.types').CursorMenuAction}
   */
  function getTranslateAction() {
    return {
      id: 'translate',
      label: 'Traduzir',
      icon: 'languages',
      comingSoon: true,
      disabled: true,
      execute: async () => {
        // Integração futura — sem chamadas de API nesta versão.
      },
    };
  }

  window.CursorTranslationActions = {
    getTranslateAction,
  };
})();
