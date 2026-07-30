'use strict';

/**
 * Contrato ISP — supervisor de processo filho (API ou SDK).
 * Quem só precisa start/stop NÃO recebe métodos de probe (ISP).
 *
 * @typedef {Object} IProcessSupervisor
 * @property {() => (Promise<void>|void)} start
 * @property {() => void} stop
 * @property {() => boolean} isRunning
 */

/**
 * @param {any} candidate
 * @returns {candidate is IProcessSupervisor}
 */
function isProcessSupervisor(candidate) {
  return (
    candidate &&
    typeof candidate.start === 'function' &&
    typeof candidate.stop === 'function' &&
    typeof candidate.isRunning === 'function'
  );
}

module.exports = { isProcessSupervisor };
