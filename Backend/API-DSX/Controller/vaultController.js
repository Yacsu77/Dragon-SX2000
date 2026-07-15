const vaultService = require('../Services/vaultService');
const {
  requireUserId,
  validateVaultUnlock,
  validateCreateVaultItem,
} = require('../DTO/vaultDTO');

async function unlock(req, res, next) {
  try {
    const userId = requireUserId(req.body?.user_id || req.params.userId);
    const { secret } = validateVaultUnlock(req.body);
    const result = await vaultService.unlockVault(userId, secret);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function lock(req, res, next) {
  try {
    if (req.body?.token) vaultService.lockSession(req.body.token);
    if (req.body?.user_id) vaultService.lockUserSessions(req.body.user_id);
    res.json({ success: true, data: { locked: true } });
  } catch (err) {
    next(err);
  }
}

async function findAll(req, res, next) {
  try {
    const userId = requireUserId(req.query.user_id);
    const items = await vaultService.listVaultItems(userId);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = validateCreateVaultItem(req.body);
    const item = await vaultService.createVaultItem(data);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

async function reveal(req, res, next) {
  try {
    const userId = requireUserId(req.body?.user_id);
    const token = req.body?.token;
    if (!token) {
      const err = new Error('token é obrigatório');
      err.statusCode = 400;
      throw err;
    }
    const item = await vaultService.revealVaultItem(req.params.id, userId, token);
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const userId = requireUserId(req.query.user_id);
    const result = await vaultService.deleteVaultItem(req.params.id, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function clear(req, res, next) {
  try {
    const userId = requireUserId(req.query.user_id);
    const result = await vaultService.clearVault(userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { unlock, lock, findAll, create, reveal, remove, clear };
