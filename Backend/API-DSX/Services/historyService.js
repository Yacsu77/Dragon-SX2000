const { run, get, all } = require('../DB/sqlite');
const {
  getSessionCache,
  setSessionCache,
  invalidateSessionCache,
  invalidateAllSessionCache,
} = require('../DB/redis');
const { formatHistoryResponse } = require('../DTO/historyDTO');
const ApiError = require('../Exceptions/ApiError');

function resolveUserId(data) {
  return data.user_id || data.profile_id || null;
}

function cacheKey(userId) {
  return userId || 'default';
}

async function createHistoryEntry(data) {
  const now = new Date().toISOString();
  const userId = resolveUserId(data);

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

  await invalidateSessionCache(cacheKey(userId));
  await invalidateSessionCache('all');

  return result;
}

async function getAllHistory(userId = null) {
  const cacheKeyStr = userId ? cacheKey(userId) : 'all';
  const cached = await getSessionCache(cacheKeyStr);

  if (cached) return cached;

  let rows;

  if (userId) {
    rows = await all(
      `SELECT * FROM browser_history
       WHERE user_id = ? OR (user_id IS NULL AND profile_id = ?)
       ORDER BY last_visit_time DESC`,
      [userId, userId]
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

  return rows.map(formatHistoryResponse);
}

async function deleteHistoryById(id) {
  const existing = await get('SELECT * FROM browser_history WHERE id = ?', [id]);

  if (!existing) {
    throw new ApiError('Registro de histórico não encontrado', 404);
  }

  await run('DELETE FROM browser_history WHERE id = ?', [id]);
  const uid = existing.user_id || existing.profile_id;
  await invalidateSessionCache(cacheKey(uid));
  await invalidateSessionCache('all');

  return { id: Number(id), deleted: true };
}

async function clearHistory(userId = null) {
  let result;

  if (userId) {
    result = await run(
      'DELETE FROM browser_history WHERE user_id = ? OR profile_id = ?',
      [userId, userId]
    );
    await invalidateSessionCache(cacheKey(userId));
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
