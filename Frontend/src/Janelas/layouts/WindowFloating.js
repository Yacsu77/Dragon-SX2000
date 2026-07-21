/**
 * Layout: janela flutuante (arredondada + gap + fundo transparente).
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  NS.LayoutRegistry?.register('window-floating', {
    id: 'window-floating',
    apply() {
      document.body.classList.add('janelas-window-floating');
      document.body.classList.remove('janelas-multi-standard', 'janelas-multi-floating');
    },
  });
})();
