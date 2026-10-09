/**
 * Cliente HTTP único da API local (porta 3333).
 *
 * userApi e historyApi usam este request. A resposta volta assim que a
 * API atualiza a lista em memória; o disco espera o flush da sessão.
 */
(function () {
  const API_BASE = 'http://localhost:3333';

  async function request(path, options = {}) {
    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
      });
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        throw new Error('API-DSX offline. Verifique se o servidor está rodando na porta 3333.');
      }
      throw err;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || `Erro HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async function waitForApi(retries = 60, delayMs = 250) {
    for (let i = 0; i < retries; i += 1) {
      try {
        const ready = await fetch(`${API_BASE}/ready`);
        if (ready.ok) {
          const payload = await ready.json().catch(() => ({}));
          if (payload.success && Array.isArray(payload.features) && payload.features.includes('users')) {
            return true;
          }
        }
      } catch {
        /* tenta de novo */
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

  window.DsxHttp = {
    API_BASE,
    request,
    waitForApi,
  };
})();
