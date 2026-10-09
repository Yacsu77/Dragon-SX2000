const { run, get, all } = require('../DB/sqlite');
const { formatFavorite } = require('../DTO/favoritesDTO');
const ApiError = require('../Exceptions/ApiError');
const sessionService = require('./sessionService');

async function listFavorites(userId) {
  const cached = sessionService.listFavorites(userId);
  if (cached) return cached;

  const rows = await all(
    'SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(formatFavorite);
}

async function createFavorite(data) {
  return sessionService.createFavorite(data);
}

async function deleteFavorite(id, userId) {
  const cached = sessionService.forgetFavorite(userId, id);
  if (cached && !cached.persisted) return { id, deleted: true };

  const row = cached || (await get('SELECT * FROM favorites WHERE id = ?', [id]));
  if (!row) throw new ApiError('Favorito não encontrado', 404);
  if (userId && row.user_id !== userId) {
    throw new ApiError('Favorito não pertence ao usuário', 403);
  }
  await run('DELETE FROM favorites WHERE id = ?', [id]);
  return { id, deleted: true };
}

async function deleteFavoriteByUrl(userId, url) {
  sessionService.forgetFavoriteByUrl(userId, url);
  const result = await run(
    'DELETE FROM favorites WHERE user_id = ? AND url = ?',
    [userId, url]
  );
  return { deleted: result.changes };
}

async function clearFavorites(userId) {
  const result = await run('DELETE FROM favorites WHERE user_id = ?', [userId]);
  sessionService.clearFavorites(userId);
  return { deleted: result.changes };
}

module.exports = {
  listFavorites,
  createFavorite,
  deleteFavorite,
  deleteFavoriteByUrl,
  clearFavorites,
};
