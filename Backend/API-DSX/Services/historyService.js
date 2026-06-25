const { run, get, all } = require('../DB/sqlite');
const {
  getSessionCache,
  setSessionCache,
  invalidateSessionCache,
  invalidateAllSessionCache,
} = require('../DB/redis');
const { formatHistoryResponse } = require('../DTO/historyDTO');
const ApiError = require('../Exceptions/ApiError');

function cacheKey(profileId) {
  return profileId || 'default';
}

async function createHistoryEntry(data) {
  const now = new Date().toISOString();
  const profileId = data.profile_id;

  const existing = await get(
    'SELECT * FROM browser_history WHERE url = ? AND (profile_id = ? OR (profile_id IS NULL AND ? IS NULL))',
    [data.url, profileId, profileId]
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
           referrer_url = COALESCE(?, referrer_url)
       WHERE id = ?`,
      [
        newVisitCount,
        newTypedCount,
        now,
        data.title,
        data.favicon_url,
        data.transition_type,
        data.referrer_url,
        existing.id,
      ]
    );

    result = await getHistoryById(existing.id);
  } else {
    const insert = await run(
      `INSERT INTO browser_history
       (url, title, visit_count, typed_count, last_visit_time, favicon_url, transition_type, referrer_url, profile_id)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)`,
      [
        data.url,
        data.title,
        data.typed_count || 0,
        now,
        data.favicon_url,
        data.transition_type,
        data.referrer_url,
        profileId,
      ]
    );

    result = await getHistoryById(insert.id);
  }

  await invalidateSessionCache(cacheKey(profileId));
  await invalidateSessionCache('all');

  return result;
}

async function getAllHistory(profileId = null) {
  const cacheKeyStr = profileId ? cacheKey(profileId) : 'all';
  const cached = await getSessionCache(cacheKeyStr);

  if (cached) return cached;

  let rows;

  if (profileId) {
    rows = await all(
      'SELECT * FROM browser_history WHERE profile_id = ? ORDER BY last_visit_time DESC',
      [profileId]
    );
  } else {
    rows = await all('SELECT * FROM browser_history ORDER BY last_visit_time DESC');
  }

  const formatted = rows.map(formatHistoryResponse);
  await setSessionCache(cacheKeyStr, formatted);

  return formatted;
}

async function getHistoryById(id) {
  const row = await get('SELECT * FROM browser_history WHERE id = ?', [id]);

  if (!row) {
    throw new ApiError('Registro de histórico não encontrado', 404);
  }

  return formatHistoryResponse(row);
}

async function searchHistory(query, profileId = null) {
  if (!query || query.trim() === '') {
    throw new ApiError('Parâmetro de busca q é obrigatório', 400);
  }

  const searchTerm = `%${query.trim()}%`;
  let rows;

  if (profileId) {
    rows = await all(
      `SELECT * FROM browser_history
       WHERE profile_id = ? AND (url LIKE ? OR title LIKE ?)
       ORDER BY last_visit_time DESC`,
      [profileId, searchTerm, searchTerm]
    );
  } else {
    rows = await all(
      `SELECT * FROM browser_history
       WHERE url LIKE ? OR title LIKE ?
       ORDER BY last_visit_time DESC`,
      [searchTerm, searchTerm]
    );
  }

  return rows.map(formatHistoryResponse);
}

async function deleteHistoryById(id) {
  const existing = await get('SELECT * FROM browser_history WHERE id = ?', [id]);

  if (!existing) {
    throw new ApiError('Registro de histórico não encontrado', 404);
  }

  await run('DELETE FROM browser_history WHERE id = ?', [id]);
  await invalidateSessionCache(cacheKey(existing.profile_id));
  await invalidateSessionCache('all');

  return { id: Number(id), deleted: true };
}

async function clearHistory(profileId = null) {
  let result;

  if (profileId) {
    result = await run('DELETE FROM browser_history WHERE profile_id = ?', [profileId]);
    await invalidateSessionCache(cacheKey(profileId));
  } else {
    result = await run('DELETE FROM browser_history');
    await invalidateAllSessionCache();
  }

  await invalidateSessionCache('all');

  return { deleted: result.changes };
}

module.exports = {
  createHistoryEntry,
  getAllHistory,
  getHistoryById,
  searchHistory,
  deleteHistoryById,
  clearHistory,
};
