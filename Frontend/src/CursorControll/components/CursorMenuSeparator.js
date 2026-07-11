/**
 * Separador do menu de contexto.
 */
(function () {
  function createSeparator() {
    const sep = document.createElement('div');
    sep.className = 'cursor-menu-separator';
    sep.setAttribute('role', 'separator');
    return sep;
  }

  window.CursorMenuSeparator = { createSeparator };
})();
