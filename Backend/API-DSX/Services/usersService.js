const { run, get, all } = require('../DB/sqlite');
const { randomId, hashSecret, verifySecret } = require('../Utils/crypto');
const { formatUserResponse } = require('../DTO/usersDTO');
const ApiError = require('../Exceptions/ApiError');

async function listUsers() {
  const rows = await all(
    `SELECT * FROM users
     ORDER BY CASE WHEN last_active_at IS NULL THEN 1 ELSE 0 END,
              last_active_at DESC,
              created_at ASC`
  );
  return rows.map(formatUserResponse);
}

async function getUserById(id) {
  const row = await get('SELECT * FROM users WHERE id = ?', [id]);
  if (!row) throw new ApiError('Usuário não encontrado', 404);
  return formatUserResponse(row);
}

async function getUserRow(id) {
  const row = await get('SELECT * FROM users WHERE id = ?', [id]);
  if (!row) throw new ApiError('Usuário não encontrado', 404);
  return row;
}

async function createUser(data) {
  const existing = await get(
    'SELECT id FROM users WHERE nickname = ? COLLATE NOCASE',
    [data.nickname]
  );
  if (existing) {
    throw new ApiError('Nickname já está em uso', 409);
  }

  const id = randomId();
  const now = new Date().toISOString();
  let passwordHash = null;
  let passwordSalt = null;

  if (data.password) {
    const hashed = hashSecret(data.password);
    passwordHash = hashed.hash;
    passwordSalt = hashed.salt;
  }

  await run(
    `INSERT INTO users
     (id, nickname, photo_path, password_hash, password_salt, created_at, updated_at, last_active_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.nickname, data.photo_path, passwordHash, passwordSalt, now, now, now]
  );

  return getUserById(id);
}

async function updateUser(id, data) {
  const row = await getUserRow(id);
  const now = new Date().toISOString();

  let nickname = row.nickname;
  let photoPath = row.photo_path;
  let passwordHash = row.password_hash;
  let passwordSalt = row.password_salt;
  let vaultPinHash = row.vault_pin_hash;
  let vaultPinSalt = row.vault_pin_salt;

  if (data.nickname !== undefined && data.nickname !== row.nickname) {
    const clash = await get(
      'SELECT id FROM users WHERE nickname = ? COLLATE NOCASE AND id != ?',
      [data.nickname, id]
    );
    if (clash) throw new ApiError('Nickname já está em uso', 409);
    nickname = data.nickname;
  }

  if (data.photo_path !== undefined) {
    photoPath = data.photo_path;
  }

  if (data.password !== undefined) {
    if (data.password === null) {
      passwordHash = null;
      passwordSalt = null;
    } else {
      const hashed = hashSecret(data.password);
      passwordHash = hashed.hash;
      passwordSalt = hashed.salt;
    }
  }

  if (data.vault_pin !== undefined) {
    if (data.vault_pin === null) {
      vaultPinHash = null;
      vaultPinSalt = null;
    } else {
      const hashed = hashSecret(data.vault_pin);
      vaultPinHash = hashed.hash;
      vaultPinSalt = hashed.salt;
    }
  }

  await run(
    `UPDATE users
     SET nickname = ?, photo_path = ?, password_hash = ?, password_salt = ?,
         vault_pin_hash = ?, vault_pin_salt = ?, updated_at = ?
     WHERE id = ?`,
    [nickname, photoPath, passwordHash, passwordSalt, vaultPinHash, vaultPinSalt, now, id]
  );

  return getUserById(id);
}

async function unlockUser(id, password) {
  const row = await getUserRow(id);

  if (!row.password_hash) {
    await touchActive(id);
    return { unlocked: true, user: formatUserResponse(row) };
  }

  const ok = verifySecret(password || '', row.password_salt, row.password_hash);
  if (!ok) {
    throw new ApiError('Senha incorreta', 401);
  }

  await touchActive(id);
  return { unlocked: true, user: formatUserResponse(row) };
}

async function touchActive(id) {
  const now = new Date().toISOString();
  await run('UPDATE users SET last_active_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
}

async function deleteUser(id) {
  await getUserRow(id);

  await run('DELETE FROM browser_history WHERE user_id = ? OR profile_id = ?', [id, id]);
  await run('DELETE FROM downloads WHERE user_id = ?', [id]);
  await run('DELETE FROM favorites WHERE user_id = ?', [id]);
  await run('DELETE FROM password_vault WHERE user_id = ?', [id]);
  await run('DELETE FROM users WHERE id = ?', [id]);

  return { id, deleted: true };
}

module.exports = {
  listUsers,
  getUserById,
  getUserRow,
  createUser,
  updateUser,
  unlockUser,
  touchActive,
  deleteUser,
};
