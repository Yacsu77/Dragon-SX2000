/**
 * Orquestra os módulos da barra superior.
 */
(function () {
  function init() {
    if (window.ButtonGo) window.ButtonGo.init();
    if (window.NavSearch) window.NavSearch.init();
    if (window.MainMenu) window.MainMenu.init();
    if (window.TopDownloads) window.TopDownloads.init();
    if (window.TopArquivos) window.TopArquivos.init();
    if (window.TopNewTab) window.TopNewTab.init();
    if (window.ConfigOverview) window.ConfigOverview.init();

    const editarBtn = document.getElementById('editarBtn');
    if (editarBtn) {
      editarBtn.addEventListener('click', () => {
        if (window.EditarScreen && typeof window.EditarScreen.open === 'function') {
          window.EditarScreen.open();
        }
      });
    }
  }

  window.TopBar = { init };
})();
