const express = require('express');
const favoritesController = require('../Controller/favoritesController');

const router = express.Router();

router.post('/', favoritesController.create);
router.get('/', favoritesController.findAll);
router.delete('/by-url', favoritesController.removeByUrl);
router.delete('/:id', favoritesController.remove);
router.delete('/', favoritesController.clear);

module.exports = router;
