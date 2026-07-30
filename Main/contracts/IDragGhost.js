'use strict';

/**
 * Contrato ISP — janela fantasma do drag de abas (isolada do registry de drop).
 *
 * @typedef {Object} IDragGhost
 * @property {(payload: object) => void} start
 * @property {(payload: object) => void} update
 * @property {() => void} end
 * @property {(win: Electron.BrowserWindow) => boolean} isGhostWindow
 */

/**
 * @param {any} candidate
 * @returns {candidate is IDragGhost}
 */
function isDragGhost(candidate) {
  return (
    candidate &&
    typeof candidate.start === 'function' &&
    typeof candidate.update === 'function' &&
    typeof candidate.end === 'function' &&
    typeof candidate.isGhostWindow === 'function'
  );
}

module.exports = { isDragGhost };
