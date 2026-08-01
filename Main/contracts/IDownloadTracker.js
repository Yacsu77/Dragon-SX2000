'use strict';

/**
 * Contrato ISP — tracking de downloads na session → API-DSX.
 *
 * @typedef {Object} IDownloadTracker
 * @property {(webContents: Electron.WebContents) => void} attach
 */

/**
 * @param {any} candidate
 * @returns {candidate is IDownloadTracker}
 */
function isDownloadTracker(candidate) {
  return candidate && typeof candidate.attach === 'function';
}

module.exports = { isDownloadTracker };
