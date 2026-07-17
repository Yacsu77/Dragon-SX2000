/**
 * Adapter — persistência UserStorage | localStorage.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.StorageAdapter) return;

  NS.StorageAdapter = {
    getItem(key) {
      try {
        return window.UserStorage
          ? window.UserStorage.getItem(key)
          : localStorage.getItem(key);
      } catch (_) {
        return null;
      }
    },
    setItem(key, value) {
      try {
        if (window.UserStorage) {
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
