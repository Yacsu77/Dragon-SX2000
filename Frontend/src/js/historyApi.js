/**
 * Cliente do histórico. O HTTP é o de apiClient.js.
 * Visitas entram na lista da sessão; a API não espera o disco.
 */
(function () {
  const http = window.DsxHttp;
  if (!http) {
    console.error('[historyApi] apiClient.js precisa carregar antes.');
    return;
  }

  const { API_BASE, request } = http;

  function activeUserId() {
    return window.UserSession?.getActiveUserId?.() || null;
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
