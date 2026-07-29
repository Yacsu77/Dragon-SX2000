'use strict';

/**
 * Adapter + Null Object — DRM enquanto não há certificado EVS/Widevine.
 * Mantém o contrato IDrmProvider sem acoplar o resto do app ao Castlabs.
 */
class NullDrmAdapter {
  constructor(options = {}) {
    this._providerId = options.providerId || 'null-drm';
    this._message =
      options.message ||
      'DRM desativado: certificado Widevine/EVS ainda não configurado.';
  }

  getId() {
    return this._providerId;
  }

  isCertificateConfigured() {
    return false;
  }

  async prepare() {
    return this.getStatus();
  }

  getStatus() {
    return {
      available: false,
      certificateReady: false,
      providerId: this._providerId,
      message: this._message,
    };
  }
}

module.exports = { NullDrmAdapter };
