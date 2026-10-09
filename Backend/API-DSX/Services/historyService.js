const { run, get, all } = require('../DB/sqlite');
const { getSessionCache, setSessionCache } = require('../DB/redis');
const sessionService = require('./sessionService');
const { formatHistoryResponse } = require('../DTO/historyDTO');
const ApiError = require('../Exceptions/ApiError');

function resolveUserId(data) {
  return data.user_id || data.profile_id || null;
}

function frecencyScore(row) {
  const visit = Number(row.visit_count || 0);
  const typed = Number(row.typed_count || 0);
  const visitedAt = Date.parse(row.last_visit_time || row.created_at || 0) || 0;
  return visit * 8 + typed * 16 + visitedAt / 86400000;
}

async function createHistoryEntry(data) {
  const userId = resolveUserId(data);
  if (userId) return sessionService.recordVisit(userId, data);

  const now = new Date().toISOString();

  const existing = await get(
    `SELECT * FROM browser_history
     WHERE url = ?
       AND (
         user_id = ?
         OR (user_id IS NULL AND profile_id = ?)
         OR (user_id IS NULL AND profile_id IS NULL AND ? IS NULL)
       )`,
    [data.url, userId, userId, userId]
  );

  let result;

  if (existing) {
    const newVisitCount = existing.visit_count + 1;
    const newTypedCount = existing.typed_count + (data.typed_count || 0);

    await run(
      `UPDATE browser_history
       SET visit_count = ?, typed_count = ?, last_visit_time = ?,
           title = COALESCE(?, title),
           favicon_url = COALESCE(?, favicon_url),
           transition_type = COALESCE(?, transition_type),
           referrer_url = COALESCE(?, referrer_url),
           user_id = COALESCE(?, user_id),
           profile_id = COALESCE(?, profile_id)
       WHERE id = ?`,
      [
        newVisitCount,
        newTypedCount,
        now,
        data.title,
        data.favicon_url,
        data.transition_type,
        data.referrer_url,
        userId,
        userId,
        existing.id,
      ]
    );

    result = await getHistoryById(existing.id);
  } else {
    const insert = await run(
      `INSERT INTO browser_history
       (url, title, visit_count, typed_count, last_visit_time, favicon_url, transition_type, referrer_url, profile_id, user_id)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.url,
        data.title,
        data.typed_count || 0,
        now,
        data.favicon_url,
        data.transition_type,
        data.referrer_url,
        userId,
        userId,
      ]
    );

    result = await getHistoryById(insert.id);
  }

  return result;
}

async function getAllHistory(userId = null) {
  let rows;

  if (userId) {
    rows = await all(
      `SELECT * FROM browser_history
       WHERE user_id = ? OR (user_id IS NULL AND profile_id = ?)
       ORDER BY last_visit_time DESC`,
      [userId, userId]
    );
    rows = sessionService.overlayHistory(userId, rows);
  } else {
    rows = await all('SELECT * FROM browser_history ORDER BY last_visit_time DESC');
  }

  return rows.map(formatHistoryResponse);
}

async function getHistoryById(id) {
  const cached = sessionService.findHistory(id);
  if (cached && !cached.row.persisted) return formatHistoryResponse(cached.row);

  const row = await get('SELECT * FROM browser_history WHERE id = ?', [id]);

  if (!row) {
    throw new ApiError('Registro de histórico não encontrado', 404);
  }

  return formatHistoryResponse(row);
}

async function searchHistory(query, userId = null) {
  if (!query || query.trim() === '') {
    throw new ApiError('Parâmetro de busca q é obrigatório', 400);
  }

  const searchTerm = `%${query.trim()}%`;
  let rows;

  if (userId) {
    rows = await all(
      `SELECT * FROM browser_history
       WHERE (user_id = ? OR (user_id IS NULL AND profile_id = ?))
         AND (url LIKE ? OR title LIKE ?)
       ORDER BY last_visit_time DESC`,
      [userId, userId, searchTerm, searchTerm]
    );
  } else {
    rows = await all(
      `SELECT * FROM browser_history
       WHERE url LIKE ? OR title LIKE ?
       ORDER BY last_visit_time DESC`,
      [searchTerm, searchTerm]
    );
  }

  const needle = query.trim().toLowerCase();
  const memory = userId ? sessionService.historyRows(userId) || [] : [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  memory.forEach((row) => {
    const url = String(row.url || '').toLowerCase();
    const title = String(row.title || '').toLowerCase();
    if (url.includes(needle) || title.includes(needle)) byId.set(row.id, row);
  });

  return Array.from(byId.values())
    .sort((a, b) => (Date.parse(b.last_visit_time || 0) || 0) - (Date.parse(a.last_visit_time || 0) || 0))
    .map(formatHistoryResponse);
}

function siteLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch (_) {
    return url;
  }
}

function searchableUrl(value) {
  try {
    const url = new URL(value);
    return `${url.hostname} ${url.pathname}`;
  } catch (_) {
    return String(value || '').split('?')[0];
  }
}

function safeHistoryTitle(row) {
  const title = String(row.title || '').trim();
  if (!title || title.length > 100 || /^https?:\/\//i.test(title)) return siteLabel(row.url);
  return title;
}

function isSearchResultUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./i, '');
    return (
      (host === 'google.com' && url.pathname === '/search') ||
      (host === 'bing.com' && url.pathname.startsWith('/search')) ||
      (host === 'duckduckgo.com' && (url.searchParams.has('q') || url.pathname === '/'))
    );
  } catch (_) {
    return false;
  }
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/146.0.7680.65 Safari/537.36';

function stripSuggestionMarkup(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Mesmo endpoint usado pela caixa de busca do google.com (client=gws-wiz),
 * para as sugestões baterem com o que o Google mostra de verdade.
 */
async function fetchGwsWizSuggestions(query, signal) {
  const url =
    `https://www.google.com/complete/search?client=gws-wiz&hl=pt-BR&q=` +
    encodeURIComponent(query);
  const response = await fetch(url, {
    signal,
    headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'pt-BR,pt;q=0.9' },
  });
  if (!response.ok) return [];
  // Resposta no formato: window.google.ac.h([[["sugestão<b>...</b>",0,[...]],...],{...}])
  const body = await response.text();
  const start = body.indexOf('(');
  const end = body.lastIndexOf(')');
  if (start < 0 || end <= start) return [];
  const payload = JSON.parse(body.slice(start + 1, end));
  const entries = Array.isArray(payload?.[0]) ? payload[0] : [];
  return entries
    .map((entry) => stripSuggestionMarkup(Array.isArray(entry) ? entry[0] : ''))
    .filter(Boolean);
}

async function fetchChromeSuggestions(query, signal) {
  const url =
    `https://suggestqueries.google.com/complete/search?client=chrome&hl=pt-BR&q=` +
    encodeURIComponent(query);
  const response = await fetch(url, {
    signal,
    headers: { 'User-Agent': BROWSER_UA },
  });
  if (!response.ok) return [];
  // O endpoint responde text/javascript; response.json() pode falhar pelo mime.
  const payload = JSON.parse(await response.text());
  const values = Array.isArray(payload?.[1]) ? payload[1] : [];
  return values.filter((value) => typeof value === 'string' && value.trim());
}

async function googleSuggestions(query) {
  const key = `google:${query.toLowerCase()}`;
  const cached = await getSessionCache(key);
  if (cached) return cached;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 900);
  try {
    let values = [];
    try {
      values = await fetchGwsWizSuggestions(query, controller.signal);
    } catch (_) { /* tenta fallback */ }
    if (!values.length) {
      values = await fetchChromeSuggestions(query, controller.signal);
    }
    const result = Array.from(new Set(values)).slice(0, 10);
    if (result.length) await setSessionCache(key, result, 120);
    return result;
  } catch (_) {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function smartSuggestions(query, userId) {
  const term = String(query || '').trim().toLowerCase();
  if (!term) return { sites: [], google: [] };

  const cached = userId ? sessionService.historyRows(userId) : null;
  const rows = cached || (userId
    ? await all(
        `SELECT * FROM browser_history
         WHERE user_id = ? OR (user_id IS NULL AND profile_id = ?)`,
        [userId, userId]
      )
    : []);

  const matches = rows
    .filter((row) => {
      if (isSearchResultUrl(row.url)) return false;
      const host = siteLabel(row.url).toLowerCase();
      const haystack = `${searchableUrl(row.url)} ${safeHistoryTitle(row)}`.toLowerCase();
      if (haystack.includes(term) || host.includes(term)) return true;
      return host.split('.').some((part) => part.startsWith(term));
    })
    .sort((a, b) => frecencyScore(b) - frecencyScore(a));

  const savedLogins = userId
    ? await all(
        `SELECT origin, MAX(updated_at) AS updated_at
         FROM password_vault
         WHERE user_id = ? AND (LOWER(origin) LIKE ? OR LOWER(username) LIKE ?)
         GROUP BY origin
         ORDER BY updated_at DESC`,
        [userId, `%${term}%`, `%${term}%`]
      )
    : [];

  const byOrigin = new Map();
  savedLogins.forEach((row) => {
    byOrigin.set(row.origin, {
      type: 'login',
      url: row.origin,
      title: siteLabel(row.origin),
      favicon_url: null,
      visit_count: 0,
      has_saved_login: true,
    });
  });
  matches.forEach((row) => {
    let origin = row.url;
    try {
      origin = new URL(row.url).origin;
    } catch (_) { /* keep URL */ }
    const existing = byOrigin.get(origin);
    byOrigin.set(origin, {
      type: existing ? 'login' : 'history',
      url: row.url,
      title: safeHistoryTitle(row),
      favicon_url: row.favicon_url || null,
      visit_count: row.visit_count || 0,
      has_saved_login: Boolean(existing),
    });
  });

  // Mais visitados primeiro; login salvo desempata.
  const sites = Array.from(byOrigin.values())
    .sort(
      (a, b) =>
        (b.visit_count || 0) - (a.visit_count || 0) ||
        Number(b.has_saved_login) - Number(a.has_saved_login)
    )
    .slice(0, 8);

  return {
    sites,
    google: await googleSuggestions(term),
  };
}

async function deleteHistoryById(id) {
  const cached = sessionService.findHistory(id);
  if (cached && !cached.row.persisted) {
    sessionService.forgetHistory(id);
    return { id: Number(id), deleted: true };
  }

  const existing = await get('SELECT * FROM browser_history WHERE id = ?', [id]);

  if (!existing) {
    throw new ApiError('Registro de histórico não encontrado', 404);
  }

  await run('DELETE FROM browser_history WHERE id = ?', [id]);
  sessionService.forgetHistory(id);

  return { id: Number(id), deleted: true };
}

async function clearHistory(userId = null) {
  let result;

  if (userId) {
    result = await run(
      'DELETE FROM browser_history WHERE user_id = ? OR profile_id = ?',
      [userId, userId]
    );
    sessionService.clearHistory(userId);
  } else {
    result = await run('DELETE FROM browser_history');
  }

  return { deleted: result.changes };
}

module.exports = {
  createHistoryEntry,
  getAllHistory,
  getHistoryById,
  searchHistory,
  smartSuggestions,
  deleteHistoryById,
  clearHistory,
};
