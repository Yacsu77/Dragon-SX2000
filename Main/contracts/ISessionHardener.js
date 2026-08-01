'use strict';

/**
 * Contrato ISP — endurece Electron.Session (UA headers, permissões, display-media).
 *
 * @typedef {Object} ISessionHardener
 * @property {(ses: Electron.Session) => void} harden
 * @property {() => void} configureAppIdentity
 * @property {(contents: Electron.WebContents) => void} attachToWebContents
 */

/**
 * @param {any} candidate
 * @returns {candidate is ISessionHardener}
 */
function isSessionHardener(candidate) {
  return (
    candidate &&
    typeof candidate.harden === 'function' &&
    typeof candidate.configureAppIdentity === 'function' &&
    typeof candidate.attachToWebContents === 'function'
  );
}

module.exports = { isSessionHardener };
