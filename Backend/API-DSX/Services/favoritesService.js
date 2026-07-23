const { run, get, all } = require('../DB/sqlite');
const { randomId } = require('../Utils/crypto');
const { formatFavorite } = require('../DTO/favoritesDTO');
const ApiError = require('../Exceptions/ApiError');

async function listFavorites(userId) {
  const rows = await all(
    'SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(formatFavorite);
}

async function createFavorite(data) {
  const existing = await get(
    'SELECT * FROM favorites WHERE user_id = ? AND url = ?',
    [data.user_id, data.url]
  );
  if (existing) return formatFavorite(existing);

  const id = data.id || randomId();
  const now = new Date().toISOString();
  await run(
    'INSERT INTO favorites (id, user_id, title, url, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, data.user_id, data.title, data.url, now]
  );
  return formatFavorite(await get('SELECT * FROM favorites WHERE id = ?', [id]));
}

async function deleteFavorite(id, userId) {
  const row = await get('SELECT * FROM favorites WHERE id = ?', [id]);
  if (!row) throw new ApiError('Favorito não encontrado', 404);
  if (userId && row.user_id !== userId) {
    throw new ApiError('Favorito não pertence ao usuário', 403);
  }
  await run('DELETE FROM favorites WHERE id = ?', [id]);
  return { id, deleted: true };
}

async function deleteFavoriteByUrl(userId, url) {
  const result = await run(
    'DELETE FROM favorites WHERE user_id = ? AND url = ?',
    [userId, url]
  );
  return { deleted: result.changes };
}

async function clearFavorites(userId) {
  const result = await run('DELETE FROM favorites WHERE user_id = ?', [userId]);
  return { deleted: result.changes };
}

module.exports = {
  listFavorites,
  createFavorite,
  deleteFavorite,
  deleteFavoriteByUrl,
  clearFavorites,
};
