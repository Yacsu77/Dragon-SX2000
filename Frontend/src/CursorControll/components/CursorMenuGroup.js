/**
 * Grupo do menu de contexto (reservado para submenus futuros).
 */
(function () {
  function createGroup(label) {
    const group = document.createElement('div');
    group.className = 'cursor-menu-group';
    group.setAttribute('role', 'group');

    if (label) {
      const heading = document.createElement('div');
      heading.className = 'cursor-menu-group__label';
      heading.textContent = label;
      group.appendChild(heading);
    }

    return group;
  }

  window.CursorMenuGroup = { createGroup };
})();
