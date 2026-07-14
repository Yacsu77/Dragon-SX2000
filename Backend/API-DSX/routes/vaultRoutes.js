const express = require('express');
const vaultController = require('../Controller/vaultController');

const router = express.Router();

router.post('/unlock', vaultController.unlock);
router.post('/lock', vaultController.lock);
router.get('/', vaultController.findAll);
router.post('/', vaultController.create);
router.post('/:id/reveal', vaultController.reveal);
router.delete('/:id', vaultController.remove);
router.delete('/', vaultController.clear);

module.exports = router;
