/**
 * Adapter — VaultApi (/vault) como única persistência de senhas salvas.
 */
(function () {
  if (window.PasswordVaultAdapter) return;

  function getUserId() {
    return window.UserSession?.getActiveUserId?.() || null;
  }

  function getToken() {
    return window.UserSession?.getVaultToken?.() || null;
  }

  function normalizeOrigin(input) {
    try {
      const url = new URL(input);
      return `${url.protocol}//${url.host}`;
    } catch (_) {
      return null;
    }
  }

  /** Nome do site sem TLD (ex.: github.com → github). */
  function siteLabel(origin) {
    const normalized = normalizeOrigin(origin) || origin;
    let host = '';
    try {
      host = new URL(normalized).hostname.toLowerCase();
    } catch (_) {
      host = String(normalized || 'site')
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .toLowerCase();
    }
    host = host.replace(/^www\./, '');
    const parts = host.split('.').filter(Boolean);
    if (!parts.length) return 'site';

    const tlds = new Set([
      'com', 'org', 'net', 'io', 'dev', 'app', 'co', 'uk', 'br', 'gov', 'edu',
      'info', 'me', 'tv', 'cc', 'ai', 'tech', 'online', 'store', 'site', 'xyz',
      'us', 'ca', 'de', 'fr', 'es', 'it', 'pt', 'jp', 'cn', 'ru', 'au', 'nz',
      'ar', 'mx', 'cl', 'pe', 'uy', 'py', 'bo', 'ec',
    ]);

    while (parts.length > 1 && tlds.has(parts[parts.length - 1])) {
      parts.pop();
    }
    return parts[parts.length - 1] || host;
  }

  function maskUsername(username) {
    const raw = String(username || '');
    if (!raw) return '…';
    if (raw.length <= 5) return `${raw}…`;
    return `${raw.slice(0, 5)}…`;
  }

  function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
  }

  async function listSafe() {
    const userId = getUserId();
    if (!userId || !window.VaultApi?.list) return [];
    try {
      const rows = await window.VaultApi.list(userId);
      return Array.isArray(rows) ? rows : [];
    } catch (_) {
      return [];
    }
  }

  async function listByOrigin(origin) {
    const target = normalizeOrigin(origin);
    if (!target) return [];
    const rows = await listSafe();
    return rows
      .filter((row) => normalizeOrigin(row.origin) === target)
      .map((row) => ({
        id: row.id,
        origin: row.origin,
        site: siteLabel(row.origin),
        username: row.username,
        usernamePreview: maskUsername(row.username),
        usernameLength: String(row.username || '').length,
        meta: row.meta || null,
      }));
  }

  /** true se já existe credencial para origin + username (case-insensitive). */
  async function hasCredential(origin, username) {
    const items = await listByOrigin(origin);
    if (!items.length) return false;
    const target = normalizeUsername(username);
    if (!target) {
      // Sem username: considera existente se já há qualquer senha para o site.
      return items.length > 0;
    }
    return items.some((item) => normalizeUsername(item.username) === target);
  }

  /** Sites únicos (só nome) para a UI do Cofre. */
  async function listSites() {
    const rows = await listSafe();
    const map = new Map();
    rows.forEach((row) => {
      const origin = normalizeOrigin(row.origin) || row.origin;
      const site = siteLabel(origin);
      if (!map.has(site)) {
        map.set(site, { site, origin, count: 1 });
      } else {
        map.get(site).count += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.site.localeCompare(b.site));
  }

  async function create({ origin, username, password, meta }) {
    const userId = getUserId();
    const token = getToken();
    if (!userId || !token || !window.VaultApi?.create) {
      throw new Error('Vault locked or unavailable');
    }
    return window.VaultApi.create({
      user_id: userId,
      token,
      origin: normalizeOrigin(origin) || origin,
      username,
      password,
      meta: meta || null,
    });
  }

  async function reveal(id) {
    const userId = getUserId();
    const token = getToken();
    if (!userId || !token || !window.VaultApi?.reveal) {
      throw new Error('Vault locked or unavailable');
    }
    return window.VaultApi.reveal(id, userId, token);
  }

  /**
   * Garante sessão do vault para o sistema de senhas (não abre o Cofre).
   * Usa a senha do perfil se ainda estiver em cache curta, ou token existente.
   */
  async function ensureUnlocked(secret) {
    if (isUnlocked()) return true;
    const userId = getUserId();
    if (!userId || !window.VaultApi?.unlock) return false;
    const key = secret || window.UserSession?.getProfileSecret?.();
    if (!key) return false;
    try {
      const result = await window.VaultApi.unlock(userId, key);
      window.UserSession?.setVaultToken?.(result.token);
      window.PasswordBus?.notify?.('vault:unlocked', {});
      return true;
    } catch (_) {
      return false;
    }
  }

  function isUnlocked() {
    return Boolean(getToken());
  }

  window.PasswordVaultAdapter = {
    normalizeOrigin,
    siteLabel,
    maskUsername,
    listByOrigin,
    listSites,
    listSafe,
    hasCredential,
    create,
    reveal,
    ensureUnlocked,
    isUnlocked,
  };
})();
