/**
 * Radial Menu — defaults + settings adapter.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  const { Keys, Store, SettingsAdapterRegistry } = NS;
  if (!Keys || SettingsAdapterRegistry.has(Keys.RADIAL)) return;

  const DEFAULTS = Object.freeze({
    color: "#7a8cff",
    size: 280,
    items: Object.freeze(["wallpaper", "tema", "autotune", "customise", "donate"]),
  });

  const IDGET_FALLBACK = Object.freeze([
    { id: "wallpaper", label: "Wallpaper", icon: "image", description: "Abrir seletor de wallpaper" },
    { id: "tema", label: "Tema", icon: "moon", description: "Alternar tema claro/escuro/sistema" },
    { id: "customise", label: "Customise", icon: "sliders", description: "Abrir painel Customise" },
    { id: "donate", label: "Donate", icon: "heart", description: "Donate (em breve)" },
    { id: "autotune", label: "AutoTune", icon: "sparkles", description: "Abrir catálogo AutoTune" },
  ]);

  function normalize(input) {
    const current = input && typeof input === "object" ? input : null;
    if (!current) {
      return { color: DEFAULTS.color, size: DEFAULTS.size, items: DEFAULTS.items.slice() };
    }
    return {
      color: typeof current.color === "string" ? current.color : DEFAULTS.color,
      size: Number(current.size) > 0 ? Number(current.size) : DEFAULTS.size,
      items:
        Array.isArray(current.items) && current.items.length
          ? current.items.slice()
          : DEFAULTS.items.slice(),
    };
  }

  function getIdgetCatalog() {
    if (Array.isArray(window.DragonIdgetCatalog) && window.DragonIdgetCatalog.length) {
      return window.DragonIdgetCatalog;
    }
    if (window.RadialMenu?.getCatalog) {
      const list = window.RadialMenu.getCatalog();
      if (list && list.length) return list;
    }
    return IDGET_FALLBACK.slice();
  }

  SettingsAdapterRegistry.register(
    Keys.RADIAL,
    Store.createCustomiseBagAdapter({ key: Keys.RADIAL, normalize })
  );

  NS.RadialMenuComponent = {
    DEFAULTS,
    normalize,
    getIdgetCatalog,
  };
})();
