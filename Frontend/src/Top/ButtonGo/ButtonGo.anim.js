/**
 * Transições de estado dos botões voltar/avançar.
 */
(function () {
  function setButtonState(btn, enabled) {
    if (!btn) return;
    btn.classList.toggle('is-disabled', !enabled);
    btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
  }

  window.ButtonGoAnim = { setButtonState };
})();
