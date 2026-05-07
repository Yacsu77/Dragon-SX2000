'use strict';

const BaseCapture = require('./BaseCapture');

/**
 * Capturador de fallback - não faz nada.
 *
 * Usado quando a plataforma não é suportada ou os capturadores nativos
 * estão indisponíveis. O Core continua funcionando, o WebSocket sobe
 * normalmente, mas nenhum snapshot é emitido.
 *
 * Útil para desenvolvimento e como rede de proteção.
 */
class NullCapture extends BaseCapture {
  async start() {
    this.running = true;
    this.logger?.warn(
      'NullCapture ativo - nenhuma mídia será capturada. ' +
      'Isso normalmente significa que o capturador nativo da sua plataforma ' +
      'não foi instalado ou falhou ao iniciar.'
    );
  }

  async stop() {
    this.running = false;
  }
}

module.exports = NullCapture;
