/**
 * Adapter registry — cada componente registra como lê/grava suas settings.
 * Padrão Adapter: store core não conhece Radial/Search/Chrome.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.SettingsAdapterRegistry) return;

  const adapters = new Map();

  NS.SettingsAdapterRegistry = {
    register(key, adapter) {
      if (!key || !adapter || typeof adapter.read !== "function" || typeof adapter.update !== "function") {
        throw new Error("Customise SettingsAdapter inválido: " + key);
      }
      adapters.set(key, adapter);
    },
    has(key) {
      return adapters.has(key);
    },
    get(key) {
      return adapters.get(key) || null;
    },
    keys() {
      return Array.from(adapters.keys());
    },
  };
})();
