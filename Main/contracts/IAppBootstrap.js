'use strict';

/**
 * Contrato ISP — ciclo de vida do app (o que a main precisa subir/parar).
 *
 * Não inclui: spawn da API, UA, IPC de domínio (isso vive nos módulos).
 *
 * @typedef {Object} IAppBootstrap
 * @property {() => void} installEarly
 * @property {() => Promise<void>} whenReady
 * @property {() => Promise<void>} onActivate
 * @property {() => void} onBeforeQuit
 * @property {() => void} onAllWindowsClosed
 */

/**
 * @param {any} candidate
 * @returns {candidate is IAppBootstrap}
 */
function isAppBootstrap(candidate) {
  return (
    candidate &&
    typeof candidate.installEarly === 'function' &&
    typeof candidate.whenReady === 'function' &&
    typeof candidate.onActivate === 'function' &&
    typeof candidate.onBeforeQuit === 'function' &&
    typeof candidate.onAllWindowsClosed === 'function'
  );
}

module.exports = { isAppBootstrap };
