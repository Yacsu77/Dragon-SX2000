'use strict';

const BaseController = require('./BaseController');

/**
 * Controlador de fallback - não faz nada.
 * Usado em plataformas não suportadas; o cliente recebe `{ ok: false }`.
 */
class NullController extends BaseController {
  async send(action) {
    const norm = this._normalize(action);
    return { ok: false, error: 'unsupported_platform', action: norm };
  }
}

module.exports = NullController;
