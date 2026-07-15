const ApiError = require('../Exceptions/ApiError');

function requireUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new ApiError('user_id é obrigatório', 400);
  }
  return userId;
}

function validateVaultUnlock(data) {
  if (!data || typeof data !== 'object') {
    throw new ApiError('Dados inválidos', 400);
  }
  const secret = data.password || data.pin || data.secret;
  if (!secret) {
    throw new ApiError('Senha ou PIN do cofre é obrigatório', 400);
  }
  return { secret: String(secret) };
}

function validateCreateVaultItem(data) {
  if (!data || typeof data !== 'object') {
    throw new ApiError('Dados inválidos', 400);
  }
  const userId = requireUserId(data.user_id);
  const origin = typeof data.origin === 'string' ? data.origin.trim() : '';
  if (!origin) throw new ApiError('origin é obrigatório', 400);
  if (!data.password || String(data.password).length < 1) {
    throw new ApiError('password do site é obrigatório', 400);
  }
  if (!data.token) {
    throw new ApiError('token de vault (unlock) é obrigatório', 400);
  }

  return {
    user_id: userId,
    origin,
    username: data.username ? String(data.username) : '',
    password: String(data.password),
    meta: data.meta || null,
    token: String(data.token),
  };
}

function formatVaultItemSafe(row) {
  if (!row) return null;
  let meta = null;
  try {
    meta = row.meta ? JSON.parse(row.meta) : null;
  } catch {
    meta = null;
  }
  return {
    id: row.id,
    user_id: row.user_id,
    origin: row.origin,
    username: row.username,
    meta,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  requireUserId,
  validateVaultUnlock,
  validateCreateVaultItem,
  formatVaultItemSafe,
};
