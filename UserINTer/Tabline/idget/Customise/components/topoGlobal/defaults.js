/**
 * Layout Topo Global — adapter sobre ChromeLayoutSettings (fonte de verdade).
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  const { Keys, Utils, RuntimeAdapter, SettingsAdapterRegistry } = NS;
  if (!Keys || SettingsAdapterRegistry.has(Keys.CHROME)) return;

  const FALLBACK_DEFAULTS = Object.freeze({
    tabsPosition: "middle",
    searchSlot: "center",
    searchWidth: 520,
    rightSlot: "right",
    rightOrder: Object.freeze([
      "downloadBtn",
      "arquivosBtn",
      "newTabBtn",
      "configBtn",
      "editarBtn",
    ]),
    rightItems: Object.freeze({
      downloadBtn: true,
      arquivosBtn: true,
      newTabBtn: true,
      configBtn: true,
      editarBtn: true,
    }),
    musicPosition: "right",
    borderColor: "#ffffff",
    borderOpacity: 15,
    activeTabOpacity: 48,
    activeTabLedBorder: false,
  });

  function getDefaults() {
    const fromModule = window.ChromeLayoutSettings?.DEFAULTS;
    if (fromModule && typeof fromModule === "object") {
      return {
        ...FALLBACK_DEFAULTS,
        ...fromModule,
        rightOrder: Array.isArray(fromModule.rightOrder)
          ? fromModule.rightOrder.slice()
          : FALLBACK_DEFAULTS.rightOrder.slice(),
        rightItems: {
          ...FALLBACK_DEFAULTS.rightItems,
          ...(fromModule.rightItems && typeof fromModule.rightItems === "object"
            ? fromModule.rightItems
            : {}),
        },
      };
    }
    return {
      ...FALLBACK_DEFAULTS,
      rightOrder: FALLBACK_DEFAULTS.rightOrder.slice(),
      rightItems: { ...FALLBACK_DEFAULTS.rightItems },
    };
  }

  function normalizeMusicPosition(value) {
    if (value === "between") return "right";
    if (value === "left" || value === "right" || value === "bottom") return value;
    return "right";
  }

  function normalize(input) {
    if (window.ChromeLayoutSettings?.read && (!input || typeof input !== "object")) {
      return window.ChromeLayoutSettings.read();
    }
    const defaults = getDefaults();
    const source = input && typeof input === "object" ? input : defaults;
    return {
      ...defaults,
      ...source,
      musicPosition: normalizeMusicPosition(source.musicPosition),
      activeTabOpacity: Utils.clampPercent(source.activeTabOpacity, defaults.activeTabOpacity),
      activeTabLedBorder: Boolean(source.activeTabLedBorder),
      rightOrder: Utils.mergeUniqueOrder(source.rightOrder, defaults.rightOrder),
      rightItems: {
        ...defaults.rightItems,
        ...(source.rightItems && typeof source.rightItems === "object" ? source.rightItems : {}),
      },
      tabsPosition: "middle",
      searchSlot: "center",
      rightSlot: "right",
    };
  }

  SettingsAdapterRegistry.register(Keys.CHROME, {
    read() {
      if (window.ChromeLayoutSettings?.read) {
        return window.ChromeLayoutSettings.read();
      }
      return normalize(null);
    },
    update(patch) {
      let next;
      if (window.ChromeLayoutSettings?.update) {
        next = window.ChromeLayoutSettings.update(patch);
      } else {
        next = normalize({ ...this.read(), ...patch });
      }
      RuntimeAdapter.notifyKey(Keys.CHROME);
      return next;
    },
  });

  NS.TopoGlobalComponent = {
    FALLBACK_DEFAULTS,
    getDefaults,
    normalize,
    normalizeMusicPosition,
  };
})();
