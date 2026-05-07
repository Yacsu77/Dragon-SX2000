/**
 * Bootstrap dos atalhos do Dragon SX2000.
 *
 * Esse arquivo é carregado por último, depois de:
 *   1. core/ShortcutManager.js     (cria window.ShortcutManager)
 *   2. overlays/<each>/index.js    (cada overlay registra seu shortcut)
 *
 * Aqui apenas chamamos `ShortcutManager.start()`, que liga o listener global
 * e emite o snapshot inicial para a futura tela de configuração.
 *
 * Para adicionar um novo atalho, NÃO edite este arquivo.
 * Crie um overlay em `overlays/<nome>/` e dentro dele chame
 * `window.ShortcutManager.register({ ... })`. Veja o README.md.
 */
(function () {
  function boot() {
    if (!window.ShortcutManager) {
      // Em casos extremos onde o core ainda não rodou; tenta de novo
      setTimeout(boot, 30);
      return;
    }
    window.ShortcutManager.start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
