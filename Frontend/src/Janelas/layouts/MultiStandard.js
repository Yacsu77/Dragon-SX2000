/**
 * Layout: multi-janela padrão (split E/D sem gap extra).
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  NS.LayoutRegistry?.register('multi-standard', {
    id: 'multi-standard',
    apply() {
      document.body.classList.add('janelas-multi-standard');
      document.body.classList.remove('janelas-multi-floating', 'janelas-window-floating');
    },
  });
})();
