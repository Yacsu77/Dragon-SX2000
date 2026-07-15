const crypto = require('crypto');
const { run, get, all } = require('../DB/sqlite');
const {
  randomId,
  verifySecret,
  deriveVaultKey,
  encryptAesGcm,
  decryptAesGcm,
} = require('../Utils/crypto');
const usersService = require('./usersService');
const { formatVaultItemSafe } = require('../DTO/vaultDTO');
const ApiError = require('../Exceptions/ApiError');

/** @type {Map<string, { userId: string, key: Buffer, expiresAt: number }>} */
const unlockSessions = new Map();
const SESSION_TTL_MS = 15 * 60 * 1000;

function createSession(userId, key) {
  const token = crypto.randomBytes(24).toString('hex');
  unlockSessions.set(token, {
    userId,
    key,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function getSession(token) {
  const session = unlockSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    unlockSessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}

function lockSession(token) {
  unlockSessions.delete(token);
}

function lockUserSessions(userId) {
  for (const [token, session] of unlockSessions.entries()) {
    if (session.userId === userId) unlockSessions.delete(token);
  }
}

async function unlockVault(userId, secret) {
  const row = await usersService.getUserRow(userId);

  let salt = null;
  if (row.password_hash) {
    const ok = verifySecret(secret, row.password_salt, row.password_hash);
    if (!ok) throw new ApiError('Senha incorreta para o cofre', 401);
    salt = row.password_salt;
  } else if (row.vault_pin_hash) {
    const ok = verifySecret(secret, row.vault_pin_salt, row.vault_pin_hash);
    if (!ok) throw new ApiError('PIN do cofre incorreto', 401);
    salt = row.vault_pin_salt;
  } else {
    throw new ApiError(
      'Configure uma senha de usuário ou PIN do cofre antes de usar o gerenciador de senhas',
      400
    );
  }

  const key = deriveVaultKey(secret, salt);
  const token = createSession(userId, key);
  return {
    token,
    expires_in_ms: SESSION_TTL_MS,
    unlocked: true,
  };
}

function requireUnlocked(userId, token) {
  const session = getSession(token);
  if (!session || session.userId !== userId) {
    throw new ApiError('Cofre bloqueado. Faça unlock novamente.', 401);
  }
  return session;
}

async function listVaultItems(userId) {
  const rows = await all(
    'SELECT * FROM password_vault WHERE user_id = ? ORDER BY updated_at DESC',
    [userId]
  );
  return rows.map(formatVaultItemSafe);
}

async function createVaultItem(data) {
  const session = requireUnlocked(data.user_id, data.token);
  const encrypted = encryptAesGcm(data.password, session.key);
  const id = randomId();
  const now = new Date().toISOString();
  const meta = data.meta ? JSON.stringify(data.meta) : null;

  await run(
    `INSERT INTO password_vault
     (id, user_id, origin, username, ciphertext, iv, meta, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.user_id, data.origin, data.username, encrypted.ciphertext, encrypted.iv, meta, now, now]
  );

  return formatVaultItemSafe(await get('SELECT * FROM password_vault WHERE id = ?', [id]));
}

async function revealVaultItem(id, userId, token) {
  const session = requireUnlocked(userId, token);
  const row = await get('SELECT * FROM password_vault WHERE id = ? AND user_id = ?', [id, userId]);
  if (!row) throw new ApiError('Item do cofre não encontrado', 404);

  let password;
  try {
    password = decryptAesGcm(row.ciphertext, row.iv, session.key);
  } catch {
    throw new ApiError('Falha ao descriptografar. Unlock novamente com a chave correta.', 401);
  }

  return {
    ...formatVaultItemSafe(row),
    password,
  };
}

async function deleteVaultItem(id, userId) {
  const row = await get('SELECT * FROM password_vault WHERE id = ?', [id]);
  if (!row) throw new ApiError('Item do cofre não encontrado', 404);
  if (row.user_id !== userId) throw new ApiError('Item não pertence ao usuário', 403);
  await run('DELETE FROM password_vault WHERE id = ?', [id]);
  return { id, deleted: true };
}

async function clearVault(userId) {
  lockUserSessions(userId);
  const result = await run('DELETE FROM password_vault WHERE user_id = ?', [userId]);
  return { deleted: result.changes };
}

module.exports = {
  unlockVault,
  lockSession,
  lockUserSessions,
  listVaultItems,
  createVaultItem,
  revealVaultItem,
  deleteVaultItem,
  clearVault,
};
