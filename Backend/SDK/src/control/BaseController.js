'use strict';

/**
 * Classe base abstrata para os controladores de mídia.
 *
 * Cada plataforma deve implementar `send(action)` retornando uma Promise.
 *
 * Ações suportadas (mapeadas para teclas multimídia / scripts nativos):
 *   - `play_pause` (alternativa: `toggle`)
 *   - `play`
 *   - `pause`
 *   - `next`
 *   - `prev` (alias: `previous`)
 *   - `stop`
 */
class BaseController {
  constructor({ logger } = {}) {
    this.logger = logger;
    this.ready = false;
  }

  get name() {
    return this.constructor.name;
  }

  // eslint-disable-next-line class-methods-use-this
  async start() {
    this.ready = true;
  }

  // eslint-disable-next-line class-methods-use-this
  async stop() {
    this.ready = false;
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  async send(action) {
    throw new Error('send() must be implemented by subclass');
  }

  /**
   * Normaliza um identificador de ação vindo do cliente.
   * @protected
   */
  _normalize(action) {
    if (!action) return null;
    const a = String(action).toLowerCase().trim();
    if (a === 'toggle' || a === 'playpause' || a === 'play_pause' || a === 'play-pause') return 'play_pause';
    if (a === 'previous' || a === 'prev') return 'prev';
    if (a === 'next' || a === 'forward') return 'next';
    if (a === 'play') return 'play';
    if (a === 'pause') return 'pause';
    if (a === 'stop') return 'stop';
    return null;
  }
}

module.exports = BaseController;
