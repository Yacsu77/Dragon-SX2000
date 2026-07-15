const downloadsService = require('../Services/downloadsService');
const {
  validateCreateDownload,
  validateUpdateDownload,
  requireUserId,
} = require('../DTO/downloadsDTO');

async function create(req, res, next) {
  try {
    const data = validateCreateDownload(req.body);
    const item = await downloadsService.createDownload(data);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

async function findAll(req, res, next) {
  try {
    const userId = requireUserId(req.query.user_id);
    const items = await downloadsService.listDownloads(userId);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = validateUpdateDownload(req.body);
    const item = await downloadsService.updateDownload(req.params.id, data);
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await downloadsService.deleteDownload(req.params.id, req.query.user_id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function clear(req, res, next) {
  try {
    const userId = requireUserId(req.query.user_id);
    const result = await downloadsService.clearDownloads(userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, findAll, update, remove, clear };
