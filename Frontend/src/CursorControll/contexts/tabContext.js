/**
 * Ações do menu para abas.
 */
(function () {
  /**
   * @param {import('../types/cursorControll.types').CursorContext} context
   * @returns {import('../types/cursorControll.types').CursorMenuAction[]}
   */
  function getActions(context) {
    const tabId = context.tabId || '';
    const isHomeTab = tabId.startsWith('home-tab');
    const hasUrl = Boolean(context.currentUrl && context.currentUrl !== 'about:blank');
    const isFavorite = Boolean(context.isFavorite);
    const isMuted = Boolean(context.isMuted);

    const actions = [];

    if (!isHomeTab) {
      actions.push({
        id: 'duplicate-tab',
        label: 'Duplicar aba',
        icon: 'copy-plus',
        execute: async () => {
          await window.CursorTabActions?.duplicateTab(tabId);
        },
      });
    }

    actions.push({
      id: 'close-tab',
      label: 'Fechar aba',
      icon: 'x',
      destructive: true,
      separatorBefore: !isHomeTab,
      execute: async () => {
        await window.CursorTabActions?.closeTabById(tabId);
      },
    });

    if (!isHomeTab && hasUrl) {
      actions.push({
        id: 'copy-tab-url',
        label: 'Copiar URL',
        icon: 'link',
        separatorBefore: true,
        execute: async () => {
          await window.CursorTabActions?.copyTabUrl(tabId);
        },
      });

      actions.push({
        id: 'toggle-tab-mute',
        label: isMuted ? 'Ativar som da aba' : 'Silenciar aba',
        icon: isMuted ? 'volume-2' : 'volume-x',
        execute: async () => {
          await window.CursorTabActions?.toggleTabMute(tabId);
        },
      });

      actions.push({
        id: 'toggle-tab-favorite',
        label: isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
        icon: isFavorite ? 'star-off' : 'star',
        execute: async () => {
          const title = context.tabTitle || context.currentUrl || '';
          await window.CursorFavoriteActions?.toggleFavorite(title, context.currentUrl);
        },
      });
    }

    return actions;
  }

  window.CursorTabContext = { getActions };
})();
