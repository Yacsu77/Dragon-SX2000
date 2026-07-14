/**
 * Cliente HTTP para users / favorites / downloads / vault (API-DSX).
 */
(function () {
  const API_BASE = 'http://localhost:3333';

  async function request(path, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 404 && String(path).startsWith('/users')) {
          throw new Error(
            'API local desatualizada (sem /users). Feche processos antigos na porta 3333 e reinicie o DSX.'
          );
        }
        throw new Error(payload.message || `Erro HTTP ${response.status}`);
      }
      return payload;
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error('API-DSX offline. Verifique se o servidor está rodando na porta 3333.');
      }
      throw err;
    }
  }

  async function waitForApi(retries = 60, delayMs = 250) {
    for (let i = 0; i < retries; i += 1) {
      try {
        // Exige API com multi-usuário (/ready ou /users), não só /health legado.
        const ready = await fetch(`${API_BASE}/ready`);
        if (ready.ok) {
          const payload = await ready.json().catch(() => ({}));
          if (payload.success && Array.isArray(payload.features) && payload.features.includes('users')) {
            return true;
          }
        }
      } catch {
        /* try /users below */
      }

      try {
        const users = await fetch(`${API_BASE}/users`);
        if (users.ok) {
          const payload = await users.json().catch(() => ({}));
          if (payload.success === true) return true;
        }
      } catch {
        /* retry */
      }

      await new Promise((r) => setTimeout(r, delayMs));
    }
    return false;
  }

  const UsersApi = {
    list: async () => (await request('/users')).data || [],
    get: async (id) => (await request(`/users/${id}`)).data,
    create: async (body) =>
      (await request('/users', { method: 'POST', body: JSON.stringify(body) })).data,
    update: async (id, body) =>
      (await request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) })).data,
    remove: async (id) =>
      (await request(`/users/${id}`, { method: 'DELETE' })).data,
    unlock: async (id, password) =>
      (
        await request(`/users/${id}/unlock`, {
          method: 'POST',
          body: JSON.stringify({ password: password || null }),
        })
      ).data,
    touch: async (id) =>
      (await request(`/users/${id}/touch`, { method: 'POST', body: '{}' })).data,
  };

  const FavoritesApi = {
    list: async (userId) =>
      (await request(`/favorites?user_id=${encodeURIComponent(userId)}`)).data || [],
    create: async (body) =>
      (await request('/favorites', { method: 'POST', body: JSON.stringify(body) })).data,
    remove: async (id, userId) =>
      (
        await request(`/favorites/${id}?user_id=${encodeURIComponent(userId)}`, {
          method: 'DELETE',
        })
      ).data,
    removeByUrl: async (userId, url) =>
      (
        await request(
          `/favorites/by-url?user_id=${encodeURIComponent(userId)}&url=${encodeURIComponent(url)}`,
          { method: 'DELETE' }
        )
      ).data,
  };

  const DownloadsApi = {
    list: async (userId) =>
      (await request(`/downloads?user_id=${encodeURIComponent(userId)}`)).data || [],
    create: async (body) =>
      (await request('/downloads', { method: 'POST', body: JSON.stringify(body) })).data,
    update: async (id, body) =>
      (await request(`/downloads/${id}`, { method: 'PATCH', body: JSON.stringify(body) })).data,
    remove: async (id, userId) =>
      (
        await request(`/downloads/${id}?user_id=${encodeURIComponent(userId)}`, {
          method: 'DELETE',
        })
      ).data,
    clear: async (userId) =>
      (
        await request(`/downloads?user_id=${encodeURIComponent(userId)}`, { method: 'DELETE' })
      ).data,
  };

  const VaultApi = {
    unlock: async (userId, secret) =>
      (
        await request('/vault/unlock', {
          method: 'POST',
          body: JSON.stringify({ user_id: userId, password: secret, pin: secret }),
        })
      ).data,
    lock: async (userId, token) =>
      (
        await request('/vault/lock', {
          method: 'POST',
          body: JSON.stringify({ user_id: userId, token }),
        })
      ).data,
    list: async (userId) =>
      (await request(`/vault?user_id=${encodeURIComponent(userId)}`)).data || [],
    create: async (body) =>
      (await request('/vault', { method: 'POST', body: JSON.stringify(body) })).data,
    reveal: async (id, userId, token) =>
      (
        await request(`/vault/${id}/reveal`, {
          method: 'POST',
          body: JSON.stringify({ user_id: userId, token }),
        })
      ).data,
    remove: async (id, userId) =>
      (
        await request(`/vault/${id}?user_id=${encodeURIComponent(userId)}`, { method: 'DELETE' })
      ).data,
  };

  window.UsersApi = UsersApi;
  window.FavoritesApi = FavoritesApi;
  window.DownloadsApi = DownloadsApi;
  window.VaultApi = VaultApi;
  window.DsxApi = { waitForApi, API_BASE };
})();
