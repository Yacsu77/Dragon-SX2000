/**
 * Hook do menu de contexto.
 */
(function () {
  function openContextMenu(context) {
    if (!context) return;
    const actions = window.CursorContextMenuService?.getActionsForContext(context) || [];
    if (!actions.length) return;
    window.CursorContextMenu?.open(context.position, actions);
  }

  window.useCursorContextMenu = {
    openContextMenu,
  };
})();
