/**
 * Search Palette — defaults + settings adapter.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  const { Keys, Store, SettingsAdapterRegistry } = NS;
  if (!Keys || SettingsAdapterRegistry.has(Keys.SEARCH)) return;

  const DEFAULTS = Object.freeze({
    color: "#7a8cff",
    width: 640,
    backgroundOpacity: 92,
    placeholder: "Pesquisar na web ou colar URL…",
  });

  function normalize(input) {
    const current = input && typeof input === "object" ? input : null;
    if (!current) return { ...DEFAULTS };
    return {
      color: typeof current.color === "string" ? current.color : DEFAULTS.color,
      width: Number(current.width) > 0 ? Number(current.width) : DEFAULTS.width,
      backgroundOpacity:
        Number(current.backgroundOpacity) >= 0
          ? Number(current.backgroundOpacity)
          : DEFAULTS.backgroundOpacity,
      placeholder:
        typeof current.placeholder === "string" && current.placeholder.trim()
          ? current.placeholder.trim()
          : DEFAULTS.placeholder,
    };
  }

  SettingsAdapterRegistry.register(
    Keys.SEARCH,
    Store.createCustomiseBagAdapter({ key: Keys.SEARCH, normalize })
  );

  NS.SearchPaletteComponent = { DEFAULTS, normalize };
})();
