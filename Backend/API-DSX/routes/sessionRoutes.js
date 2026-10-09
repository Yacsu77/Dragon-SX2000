/**
 * Rotas da sessão do perfil.
 *
 * POST /session/open  — carrega a lista uma vez
 * POST /session/flush — grava o diário (fechar o app)
 */

const express = require('express');
const sessionController = require('../Controller/sessionController');

const router = express.Router();

router.post('/open', sessionController.open);
router.post('/flush', sessionController.flush);

module.exports = router;
