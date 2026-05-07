'use strict';

/**
 * Eventos internos do núcleo (Dragon Media Core).
 * Usados pelo EventBus interno para sinalizar mudanças de estado.
 */
const InternalEvents = Object.freeze({
  TRACK_CHANGED: 'TRACK_CHANGED',
  PLAYBACK_PAUSED: 'PLAYBACK_PAUSED',
  PLAYBACK_RESUMED: 'PLAYBACK_RESUMED',
  POSITION_UPDATED: 'POSITION_UPDATED',
  PLAYBACK_STOPPED: 'PLAYBACK_STOPPED',
  SESSION_LOST: 'SESSION_LOST',
  ERROR: 'ERROR',
});

/**
 * Eventos públicos enviados pelo WebSocket Server para os clientes do SDK.
 * Esses são os nomes definidos na especificação.
 */
const WsEvents = Object.freeze({
  MEDIA_PLAY: 'media_play',
  MEDIA_PAUSE: 'media_pause',
  MEDIA_CHANGE: 'media_change',
  MEDIA_PROGRESS: 'media_progress',
  MEDIA_STOP: 'media_stop',
  HELLO: 'hello',
  ERROR: 'error',
});

module.exports = {
  InternalEvents,
  WsEvents,
};
