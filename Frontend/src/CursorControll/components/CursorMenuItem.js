/**
 * Componente de item do menu de contexto.
 */
(function () {
  /**
   * @param {import('../types/cursorControll.types').CursorMenuAction} action
   * @param {number} index
   * @param {(action: import('../types/cursorControll.types').CursorMenuAction) => void} onSelect
   */
  function createMenuItem(action, index, onSelect) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'cursor-menu-item';
    item.dataset.index = String(index);
    item.dataset.actionId = action.id;
    item.setAttribute('role', 'menuitem');
    item.disabled = Boolean(action.disabled);

    if (action.destructive) item.classList.add('cursor-menu-item--destructive');
    if (action.comingSoon) item.classList.add('cursor-menu-item--soon');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'cursor-menu-item__icon';
    if (action.icon) {
      iconSpan.innerHTML = `<i data-lucide="${action.icon}" aria-hidden="true"></i>`;
    }
    item.appendChild(iconSpan);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'cursor-menu-item__label';
    labelSpan.textContent = action.label;
    item.appendChild(labelSpan);

    if (action.comingSoon) {
      const badge = document.createElement('span');
      badge.className = 'cursor-menu-item__badge';
      badge.textContent = 'Em breve';
      item.appendChild(badge);
    }

    if (action.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.className = 'cursor-menu-item__shortcut';
      shortcut.textContent = action.shortcut;
      item.appendChild(shortcut);
    }

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!item.disabled) onSelect(action);
    });

    return item;
  }

  window.CursorMenuItem = { createMenuItem };
})();
