/**
 * Ações de menu “Dividir” (esquerda / direita).
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.SplitActions) return;

  /**
   * @param {string} tabId
   * @returns {Array}
   */
  function getMenuActions(tabId) {
    if (!tabId || String(tabId).startsWith('home-tab')) return [];

    const state = NS.SplitHost?.getState?.();
    const actions = [
      {
        id: 'janelas-split-left',
        label: 'Dividir — lado esquerdo',
        icon: 'panel-left',
        separatorBefore: true,
        execute: async () => {
          NS.SplitHost?.openSplit?.(tabId, 'left');
        },
      },
      {
        id: 'janelas-split-right',
        label: 'Dividir — lado direito',
        icon: 'panel-right',
        execute: async () => {
          NS.SplitHost?.openSplit?.(tabId, 'right');
        },
      },
    ];

    if (state?.mode === 'split') {
      actions.push({
        id: 'janelas-split-close',
        label: 'Fechar divisão',
        icon: 'x',
        execute: async () => {
          NS.SplitHost?.closeSplit?.();
        },
      });
    }

    return actions;
  }

  NS.SplitActions = { getMenuActions };
})();
