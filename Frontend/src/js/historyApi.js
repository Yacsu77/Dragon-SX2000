/**
 * Cliente HTTP para a API local API-DSX (histórico de navegação).
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
    if (params.profile_id) query.set('profile_id', params.profile_id);

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const result = await request(`/history${suffix}`);
    return result.data || [];
  }

  async function searchHistory(query, profileId = null) {
    const params = new URLSearchParams({ q: query });
    if (profileId) params.set('profile_id', profileId);
    const result = await request(`/history/search?${params.toString()}`);
    return result.data || [];
  }

  async function fetchHistoryById(id) {
    const result = await request(`/history/${id}`);
    return result.data;
  }

  async function deleteHistoryItem(id) {
    const result = await request(`/history/${id}`, { method: 'DELETE' });
    return result.data;
  }

  async function clearAllHistory(profileId = null) {
    const suffix = profileId ? `?profile_id=${encodeURIComponent(profileId)}` : '';
    const result = await request(`/history${suffix}`, { method: 'DELETE' });
    return result.data;
  }

  async function createHistoryEntry(data) {
    const result = await request('/history', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.data;
  }

  window.HistoryApi = {
    API_BASE,
    fetchHistory,
    searchHistory,
    fetchHistoryById,
    deleteHistoryItem,
    clearAllHistory,
    createHistoryEntry,
  };
})();
