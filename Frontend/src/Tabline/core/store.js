/**
 * Persistência da sidebar por usuário (UserStorage).
 */
(function () {
  const NS = (window.SidebarNS = window.SidebarNS || {});
  const STORE_KEY = 'sidebar.layout';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(raw) {
    const base = NS.createDefaults ? NS.createDefaults() : { version: 1, items: [] };
    if (!raw || typeof raw !== 'object') return base;

    const items = Array.isArray(raw.items) ? raw.items : base.items;
    return {
      version: Number(raw.version) || 1,
      items: items
        .filter((item) => item && typeof item === 'object' && item.id && item.section)
        .map((item, index) => ({
          id: String(item.id),
          kind: item.kind || 'action',
          section: item.section,
          label: String(item.label || 'Item'),
          icon: item.icon && typeof item.icon === 'object'
            ? { type: item.icon.type || 'lucide', value: String(item.icon.value || 'circle') }
            : { type: 'lucide', value: 'circle' },
          url: item.url ? String(item.url) : undefined,
          action: item.action && typeof item.action === 'object'
            ? { type: item.action.type || 'stub', payload: item.action.payload || {} }
            : { type: 'stub', payload: {} },
          locked: !!item.locked,
          order: Number.isFinite(item.order) ? item.order : index,
          visible: item.visible !== false,
        })),
    };
  }

  function migrateLegacyIfNeeded() {
    try {
      if (!window.UserStorage?.getItem || !window.UserStorage?.setItem) return;
      if (window.UserStorage.getItem(STORE_KEY) != null) return;
      const legacy = localStorage.getItem(STORE_KEY);
      if (legacy == null) return;
      window.UserStorage.setItem(STORE_KEY, legacy);
    } catch {
      /* ignore */
    }
  }

  function readRaw() {
    try {
      migrateLegacyIfNeeded();
      const raw = window.UserStorage
        ? window.UserStorage.getItem(STORE_KEY)
        : localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function write(state) {
    const payload = JSON.stringify(state);
    if (window.UserStorage) window.UserStorage.setItem(STORE_KEY, payload);
    else localStorage.setItem(STORE_KEY, payload);
  }

  function emit(state) {
    document.dispatchEvent(new CustomEvent('sidebar:changed', { detail: clone(state) }));
  }

  let cached = null;

  function getState() {
    if (!cached) cached = normalize(readRaw());
    return clone(cached);
  }

  function setState(next) {
    cached = normalize(next);
    write(cached);
    emit(cached);
    return getState();
  }

  function resetToDefaults() {
    return setState(NS.createDefaults());
  }

  function getItemsBySection(section) {
    return getState()
      .items
      .filter((item) => item.section === section && item.visible)
      .sort((a, b) => a.order - b.order);
  }

  function getItemById(id) {
    return getState().items.find((item) => item.id === id) || null;
  }

  function reorderSection(section, orderedIds) {
    const state = getState();
    const idSet = new Set(orderedIds);
    const sectionItems = state.items.filter((item) => item.section === section);
    const others = state.items.filter((item) => item.section !== section);

    const reordered = orderedIds
      .map((id, index) => {
        const item = sectionItems.find((entry) => entry.id === id);
        if (!item) return null;
        return { ...item, order: index };
      })
      .filter(Boolean);

    sectionItems.forEach((item) => {
      if (!idSet.has(item.id)) {
        reordered.push({ ...item, order: reordered.length });
      }
    });

    return setState({ ...state, items: [...others, ...reordered] });
  }

  function upsertItem(item) {
    const state = getState();
    const index = state.items.findIndex((entry) => entry.id === item.id);
    const nextItems = state.items.slice();
    if (index >= 0) nextItems[index] = { ...nextItems[index], ...item };
    else nextItems.push(item);
    return setState({ ...state, items: nextItems });
  }

  function removeItem(id) {
    const state = getState();
    const target = state.items.find((item) => item.id === id);
    if (!target || target.locked) return getState();
    if (!NS.EDITABLE_SECTIONS?.includes(target.section)) return getState();
    return setState({
      ...state,
      items: state.items.filter((item) => item.id !== id),
    });
  }

  function addUrlItem(section, partial = {}) {
    if (!NS.EDITABLE_SECTIONS?.includes(section)) return getState();
    const state = getState();
    const order = state.items.filter((item) => item.section === section).length;
    const item = {
      id: `item-${Math.random().toString(36).slice(2, 10)}`,
      kind: 'url',
      section,
      label: partial.label || 'Novo item',
      icon: partial.icon || { type: 'lucide', value: 'globe' },
      url: partial.url || 'https://',
      action: { type: 'openPanel' },
      locked: false,
      order,
      visible: true,
    };
    return upsertItem(item);
  }

  function reload() {
    cached = normalize(readRaw());
    emit(cached);
    return getState();
  }

  document.addEventListener('user:changed', () => {
    cached = null;
    reload();
  });

  NS.Store = {
    KEY: STORE_KEY,
    getState,
    setState,
    resetToDefaults,
    getItemsBySection,
    getItemById,
    reorderSection,
    upsertItem,
    removeItem,
    addUrlItem,
    reload,
  };
})();
