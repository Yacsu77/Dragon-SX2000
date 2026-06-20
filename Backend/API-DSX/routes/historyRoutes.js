const express = require('express');
const historyController = require('../Controller/historyController');

const router = express.Router();

router.post('/', historyController.create);
router.get('/search', historyController.search);
router.get('/', historyController.findAll);
router.get('/:id', historyController.findById);
router.delete('/:id', historyController.deleteById);
router.delete('/', historyController.clear);

module.exports = router;
