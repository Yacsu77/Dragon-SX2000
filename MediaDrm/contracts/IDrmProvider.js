'use strict';

/**
 * Contrato ISP — provedor de DRM (Widevine / futuro CDM).
 * Adapters (Null, Castlabs, …) implementam esta superfície.
 *
 * @typedef {Object} DrmStatus
 * @property {boolean} available
 * @property {boolean} certificateReady
 * @property {string} providerId
 * @property {string} [message]
 * @property {any} [details]
 *
 * @typedef {Object} IDrmProvider
 * @property {() => string} getId
 * @property {() => boolean} isCertificateConfigured
 * @property {() => Promise<DrmStatus>} prepare
 * @property {() => DrmStatus} getStatus
 */

/**
 * @param {any} candidate
 * @returns {candidate is IDrmProvider}
 */
function isDrmProvider(candidate) {
  return (
    candidate &&
    typeof candidate.getId === 'function' &&
    typeof candidate.isCertificateConfigured === 'function' &&
    typeof candidate.prepare === 'function' &&
    typeof candidate.getStatus === 'function'
  );
}

module.exports = { isDrmProvider };
