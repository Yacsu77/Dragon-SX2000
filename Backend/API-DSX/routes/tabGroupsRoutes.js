const express = require('express');
const tabGroupsController = require('../Controller/tabGroupsController');

const router = express.Router();

router.get('/', tabGroupsController.findAll);
router.post('/', tabGroupsController.create);
router.patch('/:id', tabGroupsController.update);
router.delete('/:id', tabGroupsController.remove);
router.put('/:id/tabs', tabGroupsController.replaceTabs);

module.exports = router;
