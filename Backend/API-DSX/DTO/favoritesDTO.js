const ApiError = require('../Exceptions/ApiError');

function requireUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new ApiError('user_id é obrigatório', 400);
  }
  return userId;
}

function validateCreateFavorite(data) {
  if (!data || typeof data !== 'object') {
    throw new ApiError('Dados inválidos', 400);
  }
  const userId = requireUserId(data.user_id);
  const url = typeof data.url === 'string' ? data.url.trim() : '';
  if (!url) throw new ApiError('url é obrigatória', 400);

  return {
    user_id: userId,
    url,
    title: data.title ? String(data.title) : url,
    id: data.id || null,
  };
}

function formatFavorite(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    url: row.url,
    created_at: row.created_at,
  };
}

module.exports = {
  requireUserId,
  validateCreateFavorite,
  formatFavorite,
};
