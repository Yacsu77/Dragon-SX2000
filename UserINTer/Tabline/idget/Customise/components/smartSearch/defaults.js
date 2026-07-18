/**
 * Buscadores (Smart Search) — defaults + settings adapter.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  const { Keys, Store, SettingsAdapterRegistry } = NS;
  if (!Keys || SettingsAdapterRegistry.has(Keys.SMART)) return;

  const DEFAULTS = Object.freeze({
    border: "rgb",            // "rgb" | "solid"
    borderColor: "#7a8cff",   // usado quando border === "solid"
    animation: "descida",     // "descida" | "none"
    backgroundOpacity: 82,    // 40–100 (%)
    fontScale: 100,           // 90–140 (%)
  });

  function clamp(value, min, max, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, num));
  }

  function normalize(input) {
    const current = input && typeof input === "object" ? input : null;
    if (!current) return { ...DEFAULTS };
    return {
      border: current.border === "solid" ? "solid" : "rgb",
      borderColor:
        typeof current.borderColor === "string" && /^#[0-9a-f]{6}$/i.test(current.borderColor)
          ? current.borderColor
          : DEFAULTS.borderColor,
      animation: current.animation === "none" ? "none" : "descida",
      backgroundOpacity: clamp(current.backgroundOpacity, 40, 100, DEFAULTS.backgroundOpacity),
      fontScale: clamp(current.fontScale, 90, 140, DEFAULTS.fontScale),
    };
  }

  SettingsAdapterRegistry.register(
    Keys.SMART,
    Store.createCustomiseBagAdapter({ key: Keys.SMART, normalize })
  );

  NS.SmartSearchComponent = { DEFAULTS, normalize };
})();
