'use strict';

const BaseController = require('./BaseController');
const { MprisClient } = require('../utils/mpris');

/**
 * Controlador de mídia para Linux via MPRIS (D-Bus).
 *
 * Envia PlayPause, Next, Previous, etc. ao player ativo no sistema,
 * com o mesmo escopo do LinuxCapture.
 */
class LinuxController extends BaseController {
  constructor(opts = {}) {
    super(opts);
    this._mpris = new MprisClient();
  }

  async start() {
    try {
      await this._mpris.probe();
      this.ready = true;
      this.logger?.info('Controlador Linux (MPRIS) iniciado');
    } catch (err) {
      this.ready = false;
      this.logger?.warn?.('MPRIS/D-Bus indisponível:', err.message);
    }
  }

  async stop() {
    this.ready = false;
    this._mpris.disconnect();
  }

  async send(action) {
    const norm = this._normalize(action);
    if (!norm) {
      this.logger?.warn?.(`comando inválido: '${action}'`);
      return { ok: false, error: 'invalid_action' };
    }
    if (!this.ready) {
      this.logger?.warn?.(`controlador indisponível, comando ignorado: '${norm}'`);
      return { ok: false, error: 'controller_not_ready' };
    }

    this.logger?.info?.(`▶ executando '${norm}' via MPRIS`);
    try {
      const { busName, method } = await this._mpris.sendCommand(norm);
      this.logger?.info?.(`   → ${method} em ${busName}`);
      return { ok: true, action: norm };
    } catch (err) {
      this.logger?.warn?.(`falha ao executar '${norm}':`, err.message);
      return { ok: false, error: err.message, action: norm };
    }
  }
}

module.exports = LinuxController;
