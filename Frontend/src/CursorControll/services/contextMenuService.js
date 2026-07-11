/**
 * Serviço de montagem de ações do menu por contexto.
 */
(function () {
  const CONTEXT_MAP = {
    'selected-text': () => window.CursorSelectedTextContext,
    tab: () => window.CursorTabContext,
    'text-input': () => window.CursorTextInputContext,
    page: () => window.CursorPageContext,
    link: () => window.CursorLinkContext,
  };

  /**
   * @param {import('../types/cursorControll.types').CursorContext} context
   * @returns {import('../types/cursorControll.types').CursorMenuAction[]}
   */
  function getActionsForContext(context) {
    if (!context) return [];

    const provider = CONTEXT_MAP[context.type]?.();
    if (!provider || typeof provider.getActions !== 'function') return [];

    const actions = provider.getActions(context);
    const seen = new Set();

    return actions.filter((action) => {
      if (!action || action.visible === false) return false;
      if (seen.has(action.id)) return false;
      seen.add(action.id);
      return true;
    });
  }

  /**
   * Calcula posição do menu evitando estouro da viewport.
   */
  function calculateMenuPosition(anchor, menuSize, margin = 8) {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    let x = anchor.x;
    let y = anchor.y;

    if (x + menuSize.width + margin > viewportW) {
      x = Math.max(margin, anchor.x - menuSize.width);
    }

    if (y + menuSize.height + margin > viewportH) {
      y = Math.max(margin, anchor.y - menuSize.height);
    }

    x = Math.max(margin, Math.min(x, viewportW - menuSize.width - margin));
    y = Math.max(margin, Math.min(y, viewportH - menuSize.height - margin));

    return { x, y };
  }

  window.CursorContextMenuService = {
    getActionsForContext,
    calculateMenuPosition,
  };
})();
