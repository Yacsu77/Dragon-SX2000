'use strict';

/**
 * Contrato ISP — política de User-Agent por URL.
 *
 * @typedef {Object} IUserAgentPolicy
 * @property {() => string} chromeUa
 * @property {() => string} defaultUa
 * @property {(ua: string) => void} setDefaultUa
 * @property {(url: string) => string} forUrl
 * @property {(url: string) => boolean} shouldSpoofChrome
 */

/**
 * @param {any} candidate
 * @returns {candidate is IUserAgentPolicy}
 */
function isUserAgentPolicy(candidate) {
  return (
    candidate &&
    typeof candidate.chromeUa === 'function' &&
    typeof candidate.defaultUa === 'function' &&
    typeof candidate.forUrl === 'function' &&
    typeof candidate.shouldSpoofChrome === 'function'
  );
}

module.exports = { isUserAgentPolicy };
