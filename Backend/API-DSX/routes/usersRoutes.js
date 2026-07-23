const express = require('express');
const usersController = require('../Controller/usersController');

const router = express.Router();

router.post('/', usersController.create);
router.get('/', usersController.findAll);
router.get('/:id', usersController.findById);
router.patch('/:id', usersController.update);
router.delete('/:id', usersController.remove);
router.post('/:id/unlock', usersController.unlock);
router.post('/:id/touch', usersController.touch);

module.exports = router;
