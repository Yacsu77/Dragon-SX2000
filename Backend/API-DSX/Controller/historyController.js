const historyService = require('../Services/historyService');
const { validateCreateHistory } = require('../DTO/historyDTO');

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
    const profileId = req.query.profile_id || null;
    const history = await historyService.getAllHistory(profileId);

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
    const query = req.query.q;
    const profileId = req.query.profile_id || null;
    const results = await historyService.searchHistory(query, profileId);

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
    const profileId = req.query.profile_id || null;
    const result = await historyService.clearHistory(profileId);

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
  deleteById,
  clear,
};
