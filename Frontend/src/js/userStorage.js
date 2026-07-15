/**
 * localStorage namespaced por usuário ativo: dsx.u.{userId}.{baseKey}
 */
(function () {
  const ACTIVE_META_KEY = 'dsx.activeUserId';

  function getActiveUserId() {
    if (window.UserSession && typeof window.UserSession.getActiveUserId === 'function') {
      return window.UserSession.getActiveUserId();
    }
    try {
      return localStorage.getItem(ACTIVE_META_KEY);
    } catch {
      return null;
    }
  }

  function key(baseKey) {
    const userId = getActiveUserId();
    if (!userId) return `dsx.pending.${baseKey}`;
    return `dsx.u.${userId}.${baseKey}`;
  }

  function getItem(baseKey) {
    try {
      return localStorage.getItem(key(baseKey));
    } catch {
      return null;
    }
  }

  function setItem(baseKey, value) {
    localStorage.setItem(key(baseKey), value);
  }

  function removeItem(baseKey) {
    localStorage.removeItem(key(baseKey));
  }

  function clearUserNamespace(userId) {
    if (!userId) return;
    const prefix = `dsx.u.${userId}.`;
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  }

  window.UserStorage = {
    ACTIVE_META_KEY,
    key,
    getItem,
    setItem,
    removeItem,
    clearUserNamespace,
    getActiveUserId,
  };
})();
