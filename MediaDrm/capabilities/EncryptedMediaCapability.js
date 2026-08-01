'use strict';

/**
 * Capability folha — Encrypted Media Extensions (EME / mediaKeySystem).
 * Sem CDM/certificado o browser ainda pode declarar a capability;
 * o áudio DRM (Spotify) só funciona quando o Adapter DRM estiver ready.
 */
class EncryptedMediaCapability {
  constructor() {
    this._id = 'encrypted-media';
    this._ok = false;
    this._message = 'não aplicado';
  }

  getId() {
    return this._id;
  }

  isComposite() {
    return false;
  }

  /**
   * @param {{ drm?: { available?: boolean, certificateReady?: boolean, message?: string } }} ctx
   */
  apply(ctx) {
    const drm = ctx?.drm || {};
    if (drm.available && drm.certificateReady) {
      this._ok = true;
      this._message = 'EME habilitado com CDM disponível';
    } else {
      // Capability de permissão já existe no hardenSession; aqui só reportamos.
      this._ok = false;
      this._message =
        drm.message ||
        'EME preparado no app; CDM/certificado ainda indisponível';
    }
    return this.getStatus();
  }

  getStatus() {
    return { id: this._id, ok: this._ok, message: this._message };
  }
}

module.exports = { EncryptedMediaCapability };
