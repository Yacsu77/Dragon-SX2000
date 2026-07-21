/**
 * Layout: janela padrão (comportamento visual atual).
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  NS.LayoutRegistry?.register('window-standard', {
    id: 'window-standard',
    apply() {
      document.body.classList.remove(
        'janelas-window-floating',
        'janelas-multi-standard',
        'janelas-multi-floating'
      );
    },
  });
})();
