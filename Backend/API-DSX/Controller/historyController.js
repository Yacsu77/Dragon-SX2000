const historyService = require('../Services/historyService');
const { validateCreateHistory } = require('../DTO/historyDTO');

function resolveUserId(req) {
  return req.query.user_id || req.query.profile_id || null;
}

async function create(req, res, next) {
  try {
    const data = validateCreateHistory(req.body);
    const entry = await historyService.createHistoryEntry(data);

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

async function findAll(req, res, next) {
  try {
    const history = await historyService.getAllHistory(resolveUserId(req));
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

async function findById(req, res, next) {
  try {
    const entry = await historyService.getHistoryById(req.params.id);
    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

async function search(req, res, next) {
  try {
    const results = await historyService.searchHistory(req.query.q, resolveUserId(req));
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

async function suggestions(req, res, next) {
  try {
    const results = await historyService.smartSuggestions(req.query.q, resolveUserId(req));
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

async function deleteById(req, res, next) {
  try {
    const result = await historyService.deleteHistoryById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function clear(req, res, next) {
  try {
    const result = await historyService.clearHistory(resolveUserId(req));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  findAll,
  findById,
  search,
  suggestions,
  deleteById,
  clear,
};
