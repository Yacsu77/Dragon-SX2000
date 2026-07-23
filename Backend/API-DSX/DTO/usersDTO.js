const ApiError = require('../Exceptions/ApiError');

function validateCreateUser(data) {
  if (!data || typeof data !== 'object') {
    throw new ApiError('Dados inválidos', 400);
  }

  const nickname = typeof data.nickname === 'string' ? data.nickname.trim() : '';
  if (!nickname || nickname.length < 2) {
    throw new ApiError('Nickname deve ter pelo menos 2 caracteres', 400);
  }
  if (nickname.length > 32) {
    throw new ApiError('Nickname deve ter no máximo 32 caracteres', 400);
  }

  const password = data.password != null && data.password !== '' ? String(data.password) : null;
  if (password && password.length < 4) {
    throw new ApiError('Senha deve ter pelo menos 4 caracteres', 400);
  }

  return {
    nickname,
    password,
    photo_path: data.photo_path || null,
  };
}

function validateUpdateUser(data) {
  if (!data || typeof data !== 'object') {
    throw new ApiError('Dados inválidos', 400);
  }

  const out = {};

  if (data.nickname !== undefined) {
    const nickname = String(data.nickname).trim();
    if (!nickname || nickname.length < 2) {
      throw new ApiError('Nickname deve ter pelo menos 2 caracteres', 400);
    }
    out.nickname = nickname;
  }

  if (data.photo_path !== undefined) {
    out.photo_path = data.photo_path || null;
  }

  if (data.password !== undefined) {
    if (data.password === null || data.password === '') {
      out.password = null;
    } else {
      const password = String(data.password);
      if (password.length < 4) {
        throw new ApiError('Senha deve ter pelo menos 4 caracteres', 400);
      }
      out.password = password;
    }
  }

  if (data.vault_pin !== undefined) {
    if (data.vault_pin === null || data.vault_pin === '') {
      out.vault_pin = null;
    } else {
      const pin = String(data.vault_pin);
      if (pin.length < 4) {
        throw new ApiError('PIN do cofre deve ter pelo menos 4 caracteres', 400);
      }
      out.vault_pin = pin;
    }
  }

  return out;
}

function formatUserResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    nickname: row.nickname,
    photo_path: row.photo_path || null,
    has_password: Boolean(row.password_hash),
    has_vault_pin: Boolean(row.vault_pin_hash),
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_active_at: row.last_active_at || null,
  };
}

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  formatUserResponse,
};
