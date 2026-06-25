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
  }

  window.TopBar = { init };
})();
