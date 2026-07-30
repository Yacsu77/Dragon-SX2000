'use strict';

/**
 * Contrato ISP — healthcheck da API-DSX (separado do supervisor de spawn).
 *
 * @typedef {'ready'|'starting'|'stale'|'down'} ApiProbeStatus
 *
 * @typedef {Object} IApiProbe
 * @property {() => Promise<ApiProbeStatus>} probe
 * @property {(timeoutMs?: number) => Promise<boolean>} waitUntilReady
 */

/**
 * @param {any} candidate
 * @returns {candidate is IApiProbe}
 */
function isApiProbe(candidate) {
  return (
    candidate &&
    typeof candidate.probe === 'function' &&
    typeof candidate.waitUntilReady === 'function'
  );
}

module.exports = { isApiProbe };
