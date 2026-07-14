const ApiError = require('../Exceptions/ApiError');

function requireUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new ApiError('user_id é obrigatório', 400);
  }
  return userId;
}

function validateCreateDownload(data) {
  if (!data || typeof data !== 'object') {
    throw new ApiError('Dados inválidos', 400);
  }
  const userId = requireUserId(data.user_id);
  const url = typeof data.url === 'string' ? data.url.trim() : '';
  if (!url) throw new ApiError('url é obrigatória', 400);

  return {
    id: data.id || null,
    user_id: userId,
    url,
    filename: data.filename || null,
    mime: data.mime || null,
    size: typeof data.size === 'number' ? data.size : null,
    state: data.state || 'progressing',
    save_path: data.save_path || null,
    started_at: data.started_at || new Date().toISOString(),
    finished_at: data.finished_at || null,
  };
}

function validateUpdateDownload(data) {
  if (!data || typeof data !== 'object') {
    throw new ApiError('Dados inválidos', 400);
  }
  return {
    filename: data.filename,
    mime: data.mime,
    size: data.size,
    state: data.state,
    save_path: data.save_path,
    finished_at: data.finished_at,
  };
}

function formatDownload(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    url: row.url,
    filename: row.filename,
    mime: row.mime,
    size: row.size,
    state: row.state,
    save_path: row.save_path,
    started_at: row.started_at,
    finished_at: row.finished_at,
  };
}

module.exports = {
  requireUserId,
  validateCreateDownload,
  validateUpdateDownload,
  formatDownload,
};
