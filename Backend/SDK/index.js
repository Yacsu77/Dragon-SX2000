'use strict';

const DragonMediaCore = require('./src/core/DragonMediaCore');
const WebSocketServer = require('./src/websocket/WebSocketServer');
const { createControllerForPlatform } = require('./src/control');
const { createLogger, setLevel } = require('./src/utils/logger');
const { InternalEvents, WsEvents } = require('./src/events/eventNames');
const { PlaybackState } = require('./src/types/DragonMediaFormat');

/**
 * Dragon Media SDK - Façade pública.
 *
 * Permite iniciar o SDK inteiro com uma única chamada:
 *
 *   const sdk = new DragonMediaSDK({ port: 8974 });
 *   await sdk.start();
 *
 * Ou usar o Core/WebSocketServer separadamente para casos avançados.
 */
class DragonMediaSDK {
  /**
   * @param {object} [opts]
   * @param {string} [opts.host='127.0.0.1']
   * @param {number} [opts.port=8974]
   * @param {boolean} [opts.corsEnabled=true]
   * @param {string} [opts.logLevel='info']  'debug'|'info'|'warn'|'error'|'silent'
   * @param {number} [opts.captureIntervalMs=800]
   * @param {number} [opts.progressIntervalMs=1000]
   * @param {string} [opts.forcePlatform]
   */
  constructor(opts = {}) {
    if (opts.logLevel) setLevel(opts.logLevel);
    this.logger = createLogger();

    this.core = new DragonMediaCore({
      logger: this.logger,
      captureIntervalMs: opts.captureIntervalMs,
      progressIntervalMs: opts.progressIntervalMs,
      forcePlatform: opts.forcePlatform,
    });

    this.controller = createControllerForPlatform({
      logger: this.logger.child('Control'),
      forcePlatform: opts.forcePlatform,
    });

    this.server = new WebSocketServer({
      core: this.core,
      controller: this.controller,
      host: opts.host,
      port: opts.port,
      corsEnabled: opts.corsEnabled,
      logger: this.logger,
    });
  }

  async start() {
    await this.core.start();
    await this.controller.start();
    await this.server.start();
    this.logger.info('Dragon Media SDK pronto.');
  }

  async stop() {
    await this.server.stop();
    await this.controller.stop();
    await this.core.stop();
    this.logger.info('Dragon Media SDK parado.');
  }

  /**
   * Envia um comando de mídia direto ao controlador (sem passar por WebSocket).
   * Útil quando integrando o SDK como biblioteca dentro do mesmo processo.
   * @param {string} action play_pause | play | pause | next | prev | stop
   */
  async command(action) {
    return this.controller.send(action);
  }

  /**
   * Snapshot atual no Dragon Media Format (ou null).
   */
  getSnapshot() {
    return this.core.getSnapshot();
  }

  /**
   * Acesso direto ao EventBus interno (útil para integrar com Electron).
   */
  get bus() {
    return this.core.bus;
  }
}

module.exports = {
  DragonMediaSDK,
  DragonMediaCore,
  WebSocketServer,
  InternalEvents,
  WsEvents,
  PlaybackState,
};
