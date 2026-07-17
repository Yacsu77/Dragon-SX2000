/**
 * Cache volátil de credenciais recusadas (não vai para /vault).
 */
(function () {
  if (window.PasswordCache) return;

  const TTL_MS = 20 * 60 * 1000;
  /** @type {Map<string, { username: string, password: string, formType: string, expiresAt: number }>} */
  const store = new Map();

  function keyFor(origin, username) {
    return `${origin}::${String(username || '').toLowerCase()}`;
  }

  function prune() {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt <= now) store.delete(key);
    }
  }

  function set(origin, draft, ttlMs) {
    if (!origin || !draft) return;
    prune();
    store.set(keyFor(origin, draft.username), {
      username: String(draft.username || ''),
      password: String(draft.password || ''),
      formType: draft.formType || 'login',
      expiresAt: Date.now() + (Number(ttlMs) > 0 ? Number(ttlMs) : TTL_MS),
    });
  }

  function get(origin, username) {
    prune();
    return store.get(keyFor(origin, username)) || null;
  }

  function listByOrigin(origin) {
    prune();
    const out = [];
    for (const entry of store.values()) {
      /* origin encoded in key — scan */
    }
    for (const [key, entry] of store.entries()) {
      if (key.startsWith(`${origin}::`)) out.push({ ...entry });
    }
    return out;
  }

  function clear() {
    store.clear();
  }

  window.PasswordCache = { set, get, listByOrigin, clear, TTL_MS };
})();
