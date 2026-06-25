/**
 * Botão Downloads — abre tela fullscreen em Telas/Downloads/.
 */
(function () {
  function init() {
    const downloadBtn = document.getElementById('downloadBtn');
    if (!downloadBtn) return;

    downloadBtn.addEventListener('click', () => {
      if (window.DownloadsScreen && typeof window.DownloadsScreen.open === 'function') {
        window.DownloadsScreen.open();
      }
    });
  }

  window.TopDownloads = { init };
})();
