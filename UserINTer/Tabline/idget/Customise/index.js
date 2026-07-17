/**
 * Customise — orquestrador (API pública).
 *
 * Arquitetura:
 *  - Adapters: Storage / Runtime / Settings (por chave)
 *  - Factory: EditorFactory.register(key, editor)
 *  - Components: radialMenu | searchPalette | topoGlobal
 *
 * Novos editores: pasta em components/{nome}/ + register no EditorFactory.
 */
(function () {
  if (window.Customise) return;

  const NS = window.CustomiseNS;
  if (!NS?.Shell || !NS?.Store || !NS?.RuntimeAdapter) {
    console.error("[Customise] Dependências não carregadas. Verifique a ordem dos scripts na Tabline.");
    return;
  }

  function reloadFromStorage() {
    NS.RuntimeAdapter.emitReloaded();
  }

  document.addEventListener("user:changed", () => {
    reloadFromStorage();
  });

  window.Customise = {
    open: NS.Shell.openCatalog,
    close: NS.Shell.closeCatalog,
    openFactory: NS.Shell.openFactory,
    closeFactory: NS.Shell.closeFactory,
    getRecord: NS.Store.getRecord.bind(NS.Store),
    updateRecord: NS.Store.updateRecord.bind(NS.Store),
    reloadFromStorage,
    /** Namespace interno (debug / extensão) */
    NS,
  };

  function boot() {
    if (NS.Shell.init()) return;
    const bootWatch = setInterval(() => {
      if (NS.Shell.init()) clearInterval(bootWatch);
    }, 100);
    setTimeout(() => clearInterval(bootWatch), 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
