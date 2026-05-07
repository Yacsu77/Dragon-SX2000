'use strict';

/**
 * Dragon Media Format - Padrão interno de dados de mídia normalizados.
 *
 * Toda mídia capturada do sistema operacional é convertida para esse formato
 * antes de ser emitida internamente ou enviada via WebSocket.
 *
 * @typedef {Object} DragonMediaFormat
 * @property {string}  app        Nome do aplicativo de origem (Spotify, Chrome, ...).
 * @property {string}  title      Título da faixa.
 * @property {string}  artist     Artista principal.
 * @property {string}  album      Nome do álbum (opcional).
 * @property {number}  duration   Duração total em segundos.
 * @property {number}  position   Posição atual em segundos.
 * @property {boolean} paused     Se a reprodução está pausada.
 * @property {string}  cover      Capa (data URL base64 ou URL pública).
 * @property {number}  timestamp  Marca de tempo (ms) em que o snapshot foi capturado.
 */

/**
 * Estados possíveis de reprodução de uma sessão.
 * @readonly
 * @enum {string}
 */
const PlaybackState = Object.freeze({
  PLAYING: 'playing',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  UNKNOWN: 'unknown',
});

/**
 * Cria um snapshot vazio no formato Dragon Media.
 * @returns {DragonMediaFormat}
 */
function createEmptySnapshot() {
  return {
    app: '',
    title: '',
    artist: '',
    album: '',
    duration: 0,
    position: 0,
    paused: true,
    cover: '',
    timestamp: Date.now(),
  };
}

module.exports = {
  PlaybackState,
  createEmptySnapshot,
};
