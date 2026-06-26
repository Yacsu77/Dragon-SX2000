/**
 * Animações e posicionamento do Menu.
 */
(function () {
  function positionMenu(rootEl) {
    const menuBtn = document.getElementById('menuBtn');
    if (!menuBtn || !rootEl) return;

    const rect = menuBtn.getBoundingClientRect();
    rootEl.style.setProperty('--menu-top', `${rect.bottom + 8}px`);
    rootEl.style.setProperty('--menu-left', `${rect.left}px`);
  }

  function open(rootEl) {
    positionMenu(rootEl);
    rootEl.classList.add('is-open');
    rootEl.setAttribute('aria-hidden', 'false');
  }

  function close(rootEl) {
    if (!rootEl) return;
    rootEl.classList.remove('is-open');
    rootEl.setAttribute('aria-hidden', 'true');
  }

  window.MenuAnim = { positionMenu, open, close };
})();
