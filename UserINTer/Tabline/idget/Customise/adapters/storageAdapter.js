/**
 * Adapter — persistência sempre namespaced por usuário (UserStorage).
 * Migra chaves legadas globais na primeira leitura do usuário ativo.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.StorageAdapter) return;

  function migrateLegacy(key) {
    try {
      if (!window.UserStorage?.getItem || !window.UserStorage?.setItem) return;
      if (window.UserStorage.getItem(key) != null) return;
      const legacy = localStorage.getItem(key);
      if (legacy == null) return;
      window.UserStorage.setItem(key, legacy);
    } catch (_) {
      /* ignore */
    }
  }

  NS.StorageAdapter = {
    getItem(key) {
      try {
        migrateLegacy(key);
        if (window.UserStorage?.getItem) return window.UserStorage.getItem(key);
        return localStorage.getItem(key);
      } catch (_) {
        return null;
      }
    },
    setItem(key, value) {
      try {
        if (window.UserStorage?.setItem) {
          window.UserStorage.setItem(key, value);
        } else {
          localStorage.setItem(key, value);
        }
      } catch (_) { /* ignore */ }
    },
    readJson(key, fallback) {
      try {
        const raw = this.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : fallback;
      } catch (_) {
        return fallback;
      }
    },
    writeJson(key, value) {
      this.setItem(key, JSON.stringify(value));
    },
  };
})();
