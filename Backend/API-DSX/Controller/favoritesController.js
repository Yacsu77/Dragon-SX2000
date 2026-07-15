const favoritesService = require('../Services/favoritesService');
const { validateCreateFavorite, requireUserId } = require('../DTO/favoritesDTO');

async function create(req, res, next) {
  try {
    const data = validateCreateFavorite(req.body);
    const item = await favoritesService.createFavorite(data);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

async function findAll(req, res, next) {
  try {
    const userId = requireUserId(req.query.user_id);
    const items = await favoritesService.listFavorites(userId);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await favoritesService.deleteFavorite(req.params.id, req.query.user_id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function removeByUrl(req, res, next) {
  try {
    const userId = requireUserId(req.query.user_id);
    const url = req.query.url;
    if (!url) {
      const err = new Error('url é obrigatória');
      err.statusCode = 400;
      throw err;
    }
    const result = await favoritesService.deleteFavoriteByUrl(userId, url);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function clear(req, res, next) {
  try {
    const userId = requireUserId(req.query.user_id);
    const result = await favoritesService.clearFavorites(userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, findAll, remove, removeByUrl, clear };
