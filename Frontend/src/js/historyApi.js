/**
 * Cliente HTTP para a API local API-DSX (histórico de navegação).
 */
(function () {
  const API_BASE = 'http://localhost:3333';

  function activeUserId() {
    return window.UserSession?.getActiveUserId?.() || null;
  }

  async function request(path, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
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

  async function fetchHistory(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const userId = params.user_id || params.profile_id || activeUserId();
    if (userId) query.set('user_id', userId);

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const result = await request(`/history${suffix}`);
    return result.data || [];
  }

  async function searchHistory(query, userId = null) {
    const params = new URLSearchParams({ q: query });
    const uid = userId || activeUserId();
    if (uid) params.set('user_id', uid);
    const result = await request(`/history/search?${params.toString()}`);
    return result.data || [];
  }

  async function smartSuggestions(query, userId = null) {
    const params = new URLSearchParams({ q: query });
    const uid = userId || activeUserId();
    if (uid) params.set('user_id', uid);
    const result = await request(`/history/suggestions?${params.toString()}`);
    return result.data || { sites: [], google: [] };
  }

  async function fetchHistoryById(id) {
    const result = await request(`/history/${id}`);
    return result.data;
  }

  async function deleteHistoryItem(id) {
    const result = await request(`/history/${id}`, { method: 'DELETE' });
    return result.data;
  }

  async function clearAllHistory(userId = null) {
    const uid = userId || activeUserId();
    const suffix = uid ? `?user_id=${encodeURIComponent(uid)}` : '';
    const result = await request(`/history${suffix}`, { method: 'DELETE' });
    return result.data;
  }

  async function createHistoryEntry(data) {
    const payload = {
      ...data,
      user_id: data.user_id || data.profile_id || activeUserId(),
    };
    const result = await request('/history', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return result.data;
  }

  window.HistoryApi = {
    API_BASE,
    fetchHistory,
    searchHistory,
    smartSuggestions,
    fetchHistoryById,
    deleteHistoryItem,
    clearAllHistory,
    createHistoryEntry,
  };
})();
