'use strict';

/**
 * Contrato ISP — cria BrowserWindows do DSX.
 *
 * @typedef {Object} PendingBoot
 * @property {string} [url]
 * @property {object} [tab]
 * @property {string|null} [userId]
 * @property {boolean} [cleanSession]
 *
 * @typedef {Object} IWindowFactory
 * @property {(pending?: PendingBoot|string|null) => Electron.BrowserWindow} create
 * @property {() => Electron.BrowserWindow} createMain
 * @property {() => Electron.BrowserWindow|null} getMain
 */

/**
 * @param {any} candidate
 * @returns {candidate is IWindowFactory}
 */
function isWindowFactory(candidate) {
  return (
    candidate &&
    typeof candidate.create === 'function' &&
    typeof candidate.createMain === 'function' &&
    typeof candidate.getMain === 'function'
  );
}

module.exports = { isWindowFactory };
