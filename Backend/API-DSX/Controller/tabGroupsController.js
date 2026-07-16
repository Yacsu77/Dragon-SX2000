const tabGroupsService = require('../Services/tabGroupsService');
const {
  requireUserId,
  validateCreateGroup,
  validateUpdateGroup,
  validateReplaceTabs,
} = require('../DTO/tabGroupsDTO');

async function findAll(req, res, next) {
  try {
    const userId = requireUserId(req.query.user_id);
    const groups = await tabGroupsService.listGroups(userId);
    res.json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = validateCreateGroup(req.body);
    const group = await tabGroupsService.createGroup(data);
    res.status(201).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const userId = requireUserId(req.query.user_id || req.body?.user_id);
    const data = validateUpdateGroup(req.body);
    const group = await tabGroupsService.updateGroup(req.params.id, userId, data);
    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const userId = requireUserId(req.query.user_id);
    const result = await tabGroupsService.deleteGroup(req.params.id, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function replaceTabs(req, res, next) {
  try {
    const data = validateReplaceTabs(req.body);
    const group = await tabGroupsService.replaceGroupTabs(req.params.id, data.user_id, data.tabs);
    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  findAll,
  create,
  update,
  remove,
  replaceTabs,
};
