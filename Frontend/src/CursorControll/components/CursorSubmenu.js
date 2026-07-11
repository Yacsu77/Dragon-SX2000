/**
 * Submenu do menu de contexto (estrutura preparada para expansão futura).
 */
(function () {
  function createSubmenuTrigger(label, icon) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'cursor-menu-item cursor-menu-item--submenu';
    item.setAttribute('role', 'menuitem');
    item.setAttribute('aria-haspopup', 'true');

    if (icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'cursor-menu-item__icon';
      iconSpan.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>`;
      item.appendChild(iconSpan);
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = 'cursor-menu-item__label';
    labelSpan.textContent = label;
    item.appendChild(labelSpan);

    const chevron = document.createElement('span');
    chevron.className = 'cursor-menu-item__chevron';
    chevron.innerHTML = '<i data-lucide="chevron-right" aria-hidden="true"></i>';
    item.appendChild(chevron);

    return item;
  }

  window.CursorSubmenu = { createSubmenuTrigger };
})();
