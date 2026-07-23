/**
 * Layout: multi-janelas flutuantes (gap + divisor + bordas arredondadas).
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  NS.LayoutRegistry?.register('multi-floating', {
    id: 'multi-floating',
    apply() {
      document.body.classList.add('janelas-multi-floating');
      document.body.classList.remove('janelas-multi-standard', 'janelas-window-floating');
    },
  });
})();
