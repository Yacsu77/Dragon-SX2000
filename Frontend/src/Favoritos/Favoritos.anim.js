/**
 * Animações da tela de Favoritos.
 */
(function () {
  function open(overlayEl) {
    if (!overlayEl) return;
    overlayEl.classList.add('is-open');
    overlayEl.setAttribute('aria-hidden', 'false');
  }

  function close(overlayEl) {
    if (!overlayEl) return;
    overlayEl.classList.remove('is-open');
    overlayEl.setAttribute('aria-hidden', 'true');
  }

  window.FavoritosAnim = { open, close };
})();
