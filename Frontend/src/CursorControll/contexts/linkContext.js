/**
 * Ações do menu para links.
 */
(function () {
  /**
   * @param {import('../types/cursorControll.types').CursorContext} context
   * @returns {import('../types/cursorControll.types').CursorMenuAction[]}
   */
  function getActions(context) {
    const url = context.linkUrl || '';
    const title = context.linkText || url;
    const tabId = context.tabId || '';
    const webview = context.webview;
    const isAllowed = window.CursorUrlUtils?.isAllowedUrl(
      window.CursorUrlUtils?.normalizeUrl(url),
    );

    return [
      {
        id: 'open-link',
        label: 'Abrir link',
        icon: 'external-link',
        disabled: !isAllowed,
        execute: async () => {
          await window.CursorLinkActions?.openInCurrentTab(webview, url);
        },
      },
      {
        id: 'open-link-new-tab',
        label: 'Abrir link em nova aba',
        icon: 'square-plus',
        disabled: !isAllowed,
        execute: async () => {
          await window.CursorLinkActions?.openInNewTab(tabId, url, title);
        },
      },
      {
        id: 'open-link-new-window',
        label: 'Abrir link em nova janela',
        icon: 'app-window',
        disabled: !isAllowed,
        execute: async () => {
          await window.CursorLinkActions?.openInNewWindow(url);
        },
      },
      {
        id: 'copy-link',
        label: 'Copiar link',
        icon: 'link',
        separatorBefore: true,
        disabled: !isAllowed,
        execute: async () => {
          await window.CursorLinkActions?.copyLink(url);
        },
      },
      {
        id: 'add-link-favorite',
        label: 'Adicionar link aos favoritos',
        icon: 'star',
        disabled: !isAllowed,
        execute: async () => {
          await window.CursorFavoriteActions?.toggleFavorite(title, url);
        },
      },
    ];
  }

  window.CursorLinkContext = { getActions };
})();
