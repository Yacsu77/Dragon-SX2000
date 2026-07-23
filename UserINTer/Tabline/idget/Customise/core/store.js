/**
 * Customise store — fachada sobre SettingsAdapterRegistry + StorageAdapter.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.Store) return;

  const { Keys, StorageAdapter, RuntimeAdapter, SettingsAdapterRegistry } = NS;

  function readCustomiseBag() {
    return StorageAdapter.readJson(Keys.STORE, {});
  }

  function writeCustomiseBag(next) {
    StorageAdapter.writeJson(Keys.STORE, next);
  }

  /**
   * Helper para adapters que usam a chave `customiseSettings`.
   */
  function createCustomiseBagAdapter({ key, normalize, onAfterUpdate }) {
    return {
      read() {
        const store = readCustomiseBag();
        const current = store[key];
        return normalize(current && typeof current === "object" ? current : null);
      },
      update(patch) {
        const store = readCustomiseBag();
        const previous = store[key] && typeof store[key] === "object" ? store[key] : {};
        const next = normalize({ ...previous, ...patch });
        store[key] = next;
        writeCustomiseBag(store);
        if (typeof onAfterUpdate === "function") onAfterUpdate(next);
        RuntimeAdapter.notifyKey(key);
        return next;
      },
    };
  }

  NS.Store = {
    readCustomiseBag,
    writeCustomiseBag,
    createCustomiseBagAdapter,

    getRecord(key) {
      const adapter = SettingsAdapterRegistry.get(key);
      if (adapter) return adapter.read();
      const store = readCustomiseBag();
      return store[key] || {};
    },

    updateRecord(key, patch) {
      const adapter = SettingsAdapterRegistry.get(key);
      if (adapter) return adapter.update(patch || {});
      const store = readCustomiseBag();
      const previous = store[key] && typeof store[key] === "object" ? store[key] : {};
      store[key] = { ...previous, ...(patch || {}) };
      writeCustomiseBag(store);
      RuntimeAdapter.notifyKey(key);
      return store[key];
    },
  };
})();
