'use strict';

const { EventEmitter } = require('events');

/**
 * Classe base abstrata para todos os capturadores de mídia.
 *
 * Todo capturador concreto deve emitir, via EventEmitter:
 *   - `snapshot`  com um payload bruto (que será normalizado pelo Core)
 *   - `lost`      quando a sessão ativa for perdida
 *   - `error`     em caso de falhas recuperáveis
 *
 * Métodos obrigatórios:
 *   - start(): Promise<void>
 *   - stop(): Promise<void>
 */
class BaseCapture extends EventEmitter {
  constructor({ logger, pollIntervalMs = 1000 } = {}) {
    super();
    this.logger = logger;
    this.pollIntervalMs = pollIntervalMs;
    this.running = false;
  }

  /**
   * Identificador legível do capturador (para logs).
   * @returns {string}
   */
  get name() {
    return this.constructor.name;
  }

  // eslint-disable-next-line class-methods-use-this
  async start() {
    throw new Error('start() must be implemented by subclass');
  }

  // eslint-disable-next-line class-methods-use-this
  async stop() {
    throw new Error('stop() must be implemented by subclass');
  }
}

module.exports = BaseCapture;
