'use strict';

/**
 * Contrato ISP — resolve paths/env do Backend empacotado vs. desenvolvimento.
 *
 * @typedef {Object} IBackendPathResolver
 * @property {(...parts: string[]) => string} resolve
 * @property {(extra?: Record<string, string>) => NodeJS.ProcessEnv} childEnv
 * @property {() => string} expectedProjectRoot
 * @property {() => string} getProjectRoot
 */

/**
 * @param {any} candidate
 * @returns {candidate is IBackendPathResolver}
 */
function isBackendPathResolver(candidate) {
  return (
    candidate &&
    typeof candidate.resolve === 'function' &&
    typeof candidate.childEnv === 'function' &&
    typeof candidate.expectedProjectRoot === 'function'
  );
}

module.exports = { isBackendPathResolver };
