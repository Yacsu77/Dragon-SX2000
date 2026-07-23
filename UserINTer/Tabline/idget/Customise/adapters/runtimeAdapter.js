/**
 * Adapter — notifica runtimes externos quando settings mudam.
 * Isola acoplamento com RadialMenu / SearchPalette / ChromeLayout.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.RuntimeAdapter) return;

  const { Keys } = NS;

  NS.RuntimeAdapter = {
    emitSettingsChanged(key) {
      try {
        window.dispatchEvent(
          new CustomEvent("customise:settings-changed", { detail: { key } })
        );
      } catch (_) { /* ignore */ }
    },

    emitReloaded() {
      try {
        document.dispatchEvent(new CustomEvent("customise:reloaded"));
      } catch (_) { /* ignore */ }
    },

    notifyKey(key) {
      this.emitSettingsChanged(key);

      if (key === Keys.RADIAL && window.RadialMenu?.reload) {
        window.RadialMenu.reload();
      }
      if (key === Keys.SEARCH && window.SearchPalette?.reload) {
        window.SearchPalette.reload();
      }
      if (key === Keys.CHROME && window.ChromeLayout?.apply) {
        window.ChromeLayout.apply(window.ChromeLayoutSettings?.read?.());
      }
      if (key === Keys.SIDEBAR) {
        if (window.SidebarNS?.Store?.reload) window.SidebarNS.Store.reload();
        if (window.Tabline?.refresh) window.Tabline.refresh();
      }
      if (key === Keys.JANELAS) {
        if (window.JanelasNS?.Store?.reload) window.JanelasNS.Store.reload();
        if (window.JanelasNS?.LayoutRegistry?.apply) window.JanelasNS.LayoutRegistry.apply();
      }
    },
  };
})();
