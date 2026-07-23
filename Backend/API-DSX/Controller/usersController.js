const usersService = require('../Services/usersService');
const { validateCreateUser, validateUpdateUser } = require('../DTO/usersDTO');

async function create(req, res, next) {
  try {
    const data = validateCreateUser(req.body);
    const user = await usersService.createUser(data);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function findAll(req, res, next) {
  try {
    const users = await usersService.listUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

async function findById(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = validateUpdateUser(req.body);
    const user = await usersService.updateUser(req.params.id, data);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await usersService.deleteUser(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function unlock(req, res, next) {
  try {
    const result = await usersService.unlockUser(req.params.id, req.body?.password);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function touch(req, res, next) {
  try {
    await usersService.touchActive(req.params.id);
    const user = await usersService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  findAll,
  findById,
  update,
  remove,
  unlock,
  touch,
};
