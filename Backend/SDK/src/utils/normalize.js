'use strict';

const { createEmptySnapshot } = require('../types/DragonMediaFormat');

/**
 * Converte um valor possivelmente undefined/null em string segura.
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
function toStr(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

/**
 * Converte um valor numérico (segundos) garantindo número finito.
 * Aceita milissegundos quando `fromMs` é true.
 * @param {unknown} value
 * @param {{ fromMs?: boolean }} [opts]
 * @returns {number}
 */
function toSeconds(value, opts = {}) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  if (opts.fromMs) return Math.floor(num / 1000);
  return Math.floor(num);
}

/**
 * Converte um Buffer em data URL base64 (image/png por padrão).
 * @param {Buffer | Uint8Array | null | undefined} buffer
 * @param {string} [mime]
 * @returns {string}
 */
function bufferToDataUrl(buffer, mime = 'image/png') {
  if (!buffer || !(buffer instanceof Uint8Array || Buffer.isBuffer(buffer))) return '';
  const b64 = Buffer.from(buffer).toString('base64');
  return `data:${mime};base64,${b64}`;
}

/**
 * Normaliza um payload bruto vindo de qualquer capturador (Windows/macOS/etc.)
 * para o Dragon Media Format.
 *
 * @param {Partial<import('../types/DragonMediaFormat').DragonMediaFormat> & {
 *   durationMs?: number,
 *   positionMs?: number,
 *   coverBuffer?: Buffer,
 *   coverMime?: string,
 *   playbackStatus?: string,
 *   sourceAppUserModelId?: string,
 * }} raw
 * @returns {import('../types/DragonMediaFormat').DragonMediaFormat}
 */
function normalize(raw = {}) {
  const snapshot = createEmptySnapshot();

  snapshot.app = toStr(raw.app || raw.sourceAppUserModelId);
  snapshot.title = toStr(raw.title);
  snapshot.artist = toStr(raw.artist);
  snapshot.album = toStr(raw.album);

  snapshot.duration = raw.durationMs != null
    ? toSeconds(raw.durationMs, { fromMs: true })
    : toSeconds(raw.duration);

  snapshot.position = raw.positionMs != null
    ? toSeconds(raw.positionMs, { fromMs: true })
    : toSeconds(raw.position);

  if (typeof raw.paused === 'boolean') {
    snapshot.paused = raw.paused;
  } else if (typeof raw.playbackStatus === 'string') {
    snapshot.paused = raw.playbackStatus.toLowerCase() !== 'playing';
  }

  if (typeof raw.cover === 'string' && raw.cover.length > 0) {
    snapshot.cover = raw.cover;
  } else if (raw.coverBuffer) {
    snapshot.cover = bufferToDataUrl(raw.coverBuffer, raw.coverMime || 'image/png');
  }

  snapshot.timestamp = Date.now();
  return snapshot;
}

/**
 * Compara dois snapshots e identifica que tipo de mudança ocorreu
 * para ajudar o core a decidir qual evento emitir.
 *
 * @param {import('../types/DragonMediaFormat').DragonMediaFormat | null} prev
 * @param {import('../types/DragonMediaFormat').DragonMediaFormat | null} next
 * @returns {{
 *   trackChanged: boolean,
 *   pauseToggled: boolean,
 *   positionDrift: number,
 *   coverChanged: boolean,
 * }}
 */
function diffSnapshots(prev, next) {
  if (!prev || !next) {
    return {
      trackChanged: !!next,
      pauseToggled: false,
      positionDrift: 0,
      coverChanged: !!(next && next.cover),
    };
  }

  const trackChanged =
    prev.title !== next.title ||
    prev.artist !== next.artist ||
    prev.album !== next.album ||
    prev.app !== next.app;

  return {
    trackChanged,
    pauseToggled: prev.paused !== next.paused,
    positionDrift: Math.abs((next.position || 0) - (prev.position || 0)),
    coverChanged: prev.cover !== next.cover,
  };
}

module.exports = {
  toStr,
  toSeconds,
  bufferToDataUrl,
  normalize,
  diffSnapshots,
};
