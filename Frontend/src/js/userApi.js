/**
 * Cliente de users, favoritos, downloads, cofre, grupos e sessão.
 *
 * O HTTP em si está em apiClient.js. Aqui ficam só as rotas.
 */
(function () {
  const http = window.DsxHttp;
  if (!http) {
    console.error('[userApi] apiClient.js precisa carregar antes.');
    return;
  }

  const { API_BASE, waitForApi } = http;

  async function request(path, options) {
    try {
      return await http.request(path, options);
    } catch (err) {
      if (err.status === 404 && String(path).startsWith('/users')) {
        throw new Error(
          'API local desatualizada (sem /users). Feche processos antigos na porta 3333 e reinicie o DSX.'
        );
      }
      throw err;
    }
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
    update: async (id, body) =>
      (
        await request(`/vault/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      ).data,
    remove: async (id, userId) =>
      (
        await request(`/vault/${id}?user_id=${encodeURIComponent(userId)}`, { method: 'DELETE' })
      ).data,
  };

  const TabGroupsApi = {
    list: async (userId) =>
      (await request(`/tab-groups?user_id=${encodeURIComponent(userId)}`)).data || [],
    create: async (body) =>
      (await request('/tab-groups', { method: 'POST', body: JSON.stringify(body) })).data,
    update: async (id, userId, body) =>
      (
        await request(`/tab-groups/${id}?user_id=${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      ).data,
    remove: async (id, userId) =>
      (
        await request(`/tab-groups/${id}?user_id=${encodeURIComponent(userId)}`, {
          method: 'DELETE',
        })
      ).data,
    replaceTabs: async (id, body) =>
      (
        await request(`/tab-groups/${id}/tabs`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      ).data,
  };

  const SessionApi = {
    open: async (userId) =>
      (
        await request('/session/open', {
          method: 'POST',
          body: JSON.stringify({ user_id: userId }),
        })
      ).data,
    flush: async () =>
      (await request('/session/flush', { method: 'POST', body: '{}' })).data,
  };

  window.UsersApi = UsersApi;
  window.FavoritesApi = FavoritesApi;
  window.DownloadsApi = DownloadsApi;
  window.VaultApi = VaultApi;
  window.TabGroupsApi = TabGroupsApi;
  window.SessionApi = SessionApi;
  window.DsxApi = { waitForApi, API_BASE };
})();
