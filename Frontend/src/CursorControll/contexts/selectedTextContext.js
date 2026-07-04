/**
 * Ações do menu para texto selecionado.
 */
(function () {
  /**
   * @param {import('../types/cursorControll.types').CursorContext} context
   * @returns {import('../types/cursorControll.types').CursorMenuAction[]}
   */
  function getActions(context) {
    const text = context.selectedText || '';
    const tabId = context.tabId || '';

    return [
      {
        id: 'search-google',
        label: 'Pesquisar no Google',
        icon: 'search',
        disabled: !text.trim(),
        execute: async () => {
          await window.CursorSearchActions?.searchGoogleInNewTab(tabId, text);
        },
      },
      {
        id: 'copy-selection',
        label: 'Copiar',
        icon: 'copy',
        shortcut: 'Ctrl+C',
        disabled: !text.trim(),
        execute: async () => {
          await window.CursorClipboardActions?.copyText(text);
        },
      },
      window.CursorTranslationActions?.getTranslateAction(),
    ].filter(Boolean);
  }

  window.CursorSelectedTextContext = { getActions };
})();
