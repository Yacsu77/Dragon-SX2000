'use strict';

/**
 * Contrato ISP — decide se window.open vira popup nativo (OAuth) ou aba.
 * Não cria abas / não conhece createTab (limite do contrato).
 *
 * @typedef {Object} WindowOpenDetails
 * @property {string} [url]
 * @property {string} [disposition]
 * @property {string} [features]
 *
 * @typedef {Object} IPopupPolicy
 * @property {(url: string) => boolean} isAllowedNavigationUrl
 * @property {(details: WindowOpenDetails) => boolean} shouldAllowNative
 * @property {(parentWin?: Electron.BrowserWindow) => Electron.BrowserWindowConstructorOptions} windowOptions
 */

/**
 * @param {any} candidate
 * @returns {candidate is IPopupPolicy}
 */
function isPopupPolicy(candidate) {
  return (
    candidate &&
    typeof candidate.isAllowedNavigationUrl === 'function' &&
    typeof candidate.shouldAllowNative === 'function' &&
    typeof candidate.windowOptions === 'function'
  );
}

module.exports = { isPopupPolicy };
