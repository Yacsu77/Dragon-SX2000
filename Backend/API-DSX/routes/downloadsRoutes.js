const express = require('express');
const downloadsController = require('../Controller/downloadsController');

const router = express.Router();

router.post('/', downloadsController.create);
router.get('/', downloadsController.findAll);
router.patch('/:id', downloadsController.update);
router.delete('/:id', downloadsController.remove);
router.delete('/', downloadsController.clear);

module.exports = router;
