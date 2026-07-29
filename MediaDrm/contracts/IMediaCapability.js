'use strict';

/**
 * Contrato ISP — capacidade de mídia isolada (autoplay, EME, display-capture…).
 * Usada pelo Composite: folha = uma capability; composto = grupo.
 *
 * @typedef {Object} CapabilityResult
 * @property {string} id
 * @property {boolean} ok
 * @property {string} [message]
 *
 * @typedef {Object} IMediaCapability
 * @property {() => string} getId
 * @property {() => boolean} isComposite
 * @property {(ctx: MediaCapabilityContext) => Promise<CapabilityResult>|CapabilityResult} apply
 * @property {() => CapabilityResult} getStatus
 *
 * @typedef {Object} MediaCapabilityContext
 * @property {import('electron').App} app
 * @property {import('electron').Session} [session]
 * @property {import('./IDrmProvider').DrmStatus} [drm]
 */

/**
 * @param {any} candidate
 * @returns {candidate is IMediaCapability}
 */
function isMediaCapability(candidate) {
  return (
    candidate &&
    typeof candidate.getId === 'function' &&
    typeof candidate.isComposite === 'function' &&
    typeof candidate.apply === 'function' &&
    typeof candidate.getStatus === 'function'
  );
}

module.exports = { isMediaCapability };
