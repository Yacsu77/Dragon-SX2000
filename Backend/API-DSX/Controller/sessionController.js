/**
 * HTTP da sessão: abrir a lista do perfil e gravar o diário agora.
 *
 * O timer de 5 minutos chama o mesmo flush, sem passar por aqui.
 */

const sessionService = require('../Services/sessionService');
const ApiError = require('../Exceptions/ApiError');

async function open(req, res, next) {
  try {
    const userId = req.body && req.body.user_id;
    if (!userId || typeof userId !== 'string') {
      throw new ApiError('user_id é obrigatório', 400);
    }
    await sessionService.open(userId);
    res.json({ success: true, data: { user_id: userId, opened: true } });
  } catch (err) {
    next(err);
  }
}

async function flush(req, res, next) {
  try {
    const result = await sessionService.flush();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  open,
  flush,
};
