/**
 * Botão Arquivos — abre tela fullscreen em Telas/Arquivos/.
 */
(function () {
  function init() {
    const arquivosBtn = document.getElementById('arquivosBtn');
    if (!arquivosBtn) return;

    arquivosBtn.addEventListener('click', () => {
      if (window.ArquivosScreen && typeof window.ArquivosScreen.open === 'function') {
        window.ArquivosScreen.open();
      }
    });
  }

  window.TopArquivos = { init };
})();
