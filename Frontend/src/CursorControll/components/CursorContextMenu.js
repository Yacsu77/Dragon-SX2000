/**
 * Menu de contexto visual do CursorControll.
 */
(function () {
  let menuEl = null;
  let isOpen = false;
  let focusedIndex = -1;
  let currentActions = [];
  let onCloseCallback = null;
  let previousFocus = null;

  function ensureMenu() {
    if (menuEl) return menuEl;
    menuEl = document.createElement('div');
    menuEl.id = 'cursor-context-menu';
    menuEl.className = 'cursor-context-menu';
    menuEl.setAttribute('role', 'menu');
    menuEl.setAttribute('aria-hidden', 'true');
    menuEl.tabIndex = -1;
    document.body.appendChild(menuEl);
    return menuEl;
  }

  function getFocusableItems() {
    if (!menuEl) return [];
    return Array.from(menuEl.querySelectorAll('.cursor-menu-item:not(:disabled)'));
  }

  function setFocusedIndex(index) {
    const items = getFocusableItems();
    if (!items.length) return;

    focusedIndex = Math.max(0, Math.min(index, items.length - 1));
    items.forEach((el, i) => {
      el.classList.toggle('cursor-menu-item--focused', i === focusedIndex);
    });
    items[focusedIndex]?.focus();
  }

  function close() {
    if (!menuEl || !isOpen) return;
    isOpen = false;
    menuEl.setAttribute('aria-hidden', 'true');
    menuEl.classList.remove('cursor-context-menu--open');
    menuEl.innerHTML = '';
    currentActions = [];
    focusedIndex = -1;

    document.removeEventListener('mousedown', onOutsideClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('app:tab-changed', close);
    document.removeEventListener('app:tab-closed', close);
    window.removeEventListener('blur', close);

    if (previousFocus && typeof previousFocus.focus === 'function') {
      try { previousFocus.focus(); } catch { /* ignore */ }
    }
    previousFocus = null;

    if (typeof onCloseCallback === 'function') onCloseCallback();
  }

  function onOutsideClick(e) {
    if (menuEl && !menuEl.contains(e.target)) close();
  }

  function onKeyDown(e) {
    if (!isOpen) return;
    const items = getFocusableItems();
    if (!items.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(focusedIndex + 1 >= items.length ? 0 : focusedIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(focusedIndex - 1 < 0 ? items.length - 1 : focusedIndex - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && items[focusedIndex]) items[focusedIndex].click();
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      default:
        break;
    }
  }

  async function executeAction(action) {
    try {
      await action.execute();
    } catch (err) {
      window.CursorLogger?.error(`Falha na ação ${action.id}`, err);
    }
    close();
  }

  function renderActions(actions) {
    const menu = ensureMenu();
    menu.innerHTML = '';

    actions.forEach((action, index) => {
      if (action.separatorBefore && index > 0) {
        menu.appendChild(window.CursorMenuSeparator.createSeparator());
      }
      menu.appendChild(window.CursorMenuItem.createMenuItem(action, index, executeAction));
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ nodes: [menu] });
    }
  }

  function open(position, actions, onClose) {
    if (!actions || !actions.length) return;

    close();
    previousFocus = document.activeElement;
    onCloseCallback = onClose || null;
    currentActions = actions;
    isOpen = true;

    const menu = ensureMenu();
    renderActions(actions);

    menu.style.visibility = 'hidden';
    menu.style.left = `${position.x}px`;
    menu.style.top = `${position.y}px`;
    menu.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      const adjusted = window.CursorContextMenuService.calculateMenuPosition(
        position,
        { width: rect.width, height: rect.height },
      );
      menu.style.left = `${adjusted.x}px`;
      menu.style.top = `${adjusted.y}px`;
      menu.style.visibility = 'visible';
      menu.classList.add('cursor-context-menu--open');

      const firstEnabled = getFocusableItems();
      if (firstEnabled.length) setFocusedIndex(0);

      document.addEventListener('mousedown', onOutsideClick, true);
      document.addEventListener('keydown', onKeyDown, true);
      // Fecha ao trocar/fechar aba — não escuta webview-navigated
      // (load/redirects fechavam o menu enquanto a página carregava).
      document.addEventListener('app:tab-changed', close);
      document.addEventListener('app:tab-closed', close);
      window.addEventListener('blur', close);
    });
  }

  window.CursorContextMenu = {
    open,
    close,
    isOpen: () => isOpen,
  };
})();
