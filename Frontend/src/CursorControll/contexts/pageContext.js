/**
 * Ações do menu para páginas comuns.
 */
(function () {
  /**
   * @param {import('../types/cursorControll.types').CursorContext} context
   * @returns {import('../types/cursorControll.types').CursorMenuAction[]}
   */
  function getActions(context) {
    const webview = context.webview;
    const hasUrl = Boolean(context.currentUrl && context.currentUrl !== 'about:blank');
    const isFavorite = Boolean(context.isFavorite);
    const title = document.querySelector('.tab.active .tab-title')?.textContent?.trim()
      || context.currentUrl
      || '';

    return [
      {
        id: 'go-back',
        label: 'Voltar',
        icon: 'arrow-left',
        shortcut: 'Alt+←',
        disabled: !context.canGoBack,
        execute: async () => {
          await window.CursorNavigationActions?.goBack(webview);
        },
      },
      {
        id: 'reload-page',
        label: 'Recarregar página',
        icon: 'rotate-cw',
        shortcut: 'Ctrl+R',
        separatorBefore: false,
        execute: async () => {
          await window.CursorNavigationActions?.reload(webview);
        },
      },
      {
        id: 'toggle-page-favorite',
        label: isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
        icon: isFavorite ? 'star-off' : 'star',
        separatorBefore: true,
        disabled: !hasUrl,
        execute: async () => {
          if (context.currentUrl) {
            await window.CursorFavoriteActions?.toggleFavorite(title, context.currentUrl);
          }
        },
      },
    ];
  }

  window.CursorPageContext = { getActions };
})();
