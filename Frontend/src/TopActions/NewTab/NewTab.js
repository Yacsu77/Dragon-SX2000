/**
 * Botão Nova Aba.
 */
(function () {
  function init() {
    const newTabBtn = document.getElementById('newTabBtn');
    if (!newTabBtn) return;

    newTabBtn.addEventListener('click', () => {
      if (typeof window.createNewTab === 'function') {
        window.createNewTab();
      }
    });
  }

  window.TopNewTab = { init };
})();
