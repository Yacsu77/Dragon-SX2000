/**
 * Preferências por usuário para layout do Topo Global.
 */
(function () {
  if (window.ChromeLayoutSettings) return;

  const STORAGE_KEY = 'dragonsx.chrome.layout';
  const DEFAULT_RIGHT_ORDER = [
    'downloadBtn',
    'arquivosBtn',
    'newTabBtn',
    'configBtn',
    'editarBtn',
  ];

  const DEFAULTS = {
    tabsPosition: 'middle',
    searchSlot: 'center',
    searchWidth: 520,
    rightSlot: 'right',
    rightOrder: DEFAULT_RIGHT_ORDER.slice(),
    rightItems: {
      downloadBtn: true,
      arquivosBtn: true,
      newTabBtn: true,
      configBtn: true,
      editarBtn: true,
    },
    musicPosition: 'right',
    borderColor: '#ffffff',
    borderOpacity: 15,
    activeTabOpacity: 48,
    activeTabLedBorder: false,
  };

  function readRaw() {
    try {
      const raw = window.UserStorage
        ? window.UserStorage.getItem(STORAGE_KEY)
        : localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function clampPercent(value, fallback) {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return fallback;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  function normalizeRightOrder(input) {
    const seen = new Set();
    const ordered = [];
    const source = Array.isArray(input) ? input : DEFAULT_RIGHT_ORDER;
    source.forEach((id) => {
      if (!DEFAULT_RIGHT_ORDER.includes(id) || seen.has(id)) return;
      seen.add(id);
      ordered.push(id);
    });
    DEFAULT_RIGHT_ORDER.forEach((id) => {
      if (seen.has(id)) return;
      ordered.push(id);
    });
    return ordered;
  }

  function normalizeMusicPosition(value) {
    if (value === 'between') return 'right';
    if (value === 'left' || value === 'right' || value === 'bottom') return value;
    return DEFAULTS.musicPosition;
  }

  function normalize(input = {}) {
    const searchWidth = Math.max(260, Math.min(820, Number(input.searchWidth) || DEFAULTS.searchWidth));
    const borderOpacity = clampPercent(input.borderOpacity, DEFAULTS.borderOpacity);
    const activeTabOpacity = clampPercent(input.activeTabOpacity, DEFAULTS.activeTabOpacity);
    const rightOrder = normalizeRightOrder(input.rightOrder);

    return {
      ...DEFAULTS,
      ...input,
      tabsPosition: DEFAULTS.tabsPosition,
      searchSlot: DEFAULTS.searchSlot,
      rightSlot: DEFAULTS.rightSlot,
      musicPosition: normalizeMusicPosition(input.musicPosition),
      searchWidth,
      borderOpacity,
      activeTabOpacity,
      activeTabLedBorder: Boolean(input.activeTabLedBorder),
      rightOrder,
      borderColor:
        typeof input.borderColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(input.borderColor)
          ? input.borderColor
          : DEFAULTS.borderColor,
      rightItems: {
        ...DEFAULTS.rightItems,
        ...(input.rightItems && typeof input.rightItems === 'object' ? input.rightItems : {}),
      },
    };
  }

  function read() {
    return normalize(readRaw());
  }

  function write(next) {
    const payload = normalize(next);
    const raw = JSON.stringify(payload);
    if (window.UserStorage) {
      window.UserStorage.setItem(STORAGE_KEY, raw);
    } else {
      localStorage.setItem(STORAGE_KEY, raw);
    }
    document.dispatchEvent(new CustomEvent('chrome-layout:changed', { detail: { settings: payload } }));
    return payload;
  }

  function update(patch) {
    return write({ ...read(), ...(patch || {}) });
  }

  function reset() {
    return write(DEFAULTS);
  }

  window.ChromeLayoutSettings = {
    DEFAULTS,
    DEFAULT_RIGHT_ORDER,
    read,
    write,
    update,
    reset,
  };
})();
