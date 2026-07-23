/**
 * PasswordBus — Subject do Observer (senhas).
 * Eventos: form:detected | form:gone | credentials:candidates |
 * credentials:filled | credentials:submitted | save:accepted | save:declined |
 * session:authenticated | vault:locked | vault:unlocked | indicator:used
 */
(function () {
  if (window.PasswordBus) return;

  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  function subscribe(event, handler) {
    if (!event || typeof handler !== 'function') return () => {};
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => unsubscribe(event, handler);
  }

  function unsubscribe(event, handler) {
    const set = listeners.get(event);
    if (!set) return;
    set.delete(handler);
    if (!set.size) listeners.delete(event);
  }

  function notify(event, detail) {
    const set = listeners.get(event);
    if (!set || !set.size) return;
    const payload = detail && typeof detail === 'object' ? detail : {};
    set.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.warn('[PasswordBus]', event, err);
      }
    });
    try {
      document.dispatchEvent(
        new CustomEvent(`password:${event}`, { detail: payload })
      );
    } catch (_) { /* ignore */ }
  }

  function clear() {
    listeners.clear();
  }

  window.PasswordBus = { subscribe, unsubscribe, notify, clear };
})();
