'use strict';

const { EventEmitter } = require('events');

/**
 * EventBus interno do Dragon Media Core.
 *
 * Envelope leve sobre `EventEmitter` para deixar explícito que esse é o canal
 * único de comunicação interna entre capture -> core -> websocket.
 *
 * Usar uma classe nomeada (em vez de exportar `EventEmitter` cru) facilita
 * substituir o transporte no futuro (ex.: Worker thread, IPC do Electron).
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Açúcar para emitir um evento garantindo que sempre carrega timestamp.
   * @param {string} event
   * @param {object} [payload]
   */
  publish(event, payload = {}) {
    const enriched = {
      ...payload,
      _emittedAt: payload._emittedAt || Date.now(),
    };
    this.emit(event, enriched);
    return enriched;
  }
}

module.exports = EventBus;
