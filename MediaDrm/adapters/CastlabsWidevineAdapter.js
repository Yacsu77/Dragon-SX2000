'use strict';

/**
 * Adapter — Castlabs ECS Widevine (quando houver certificado EVS).
 *
 * Hoje: stub seguro. Não troca o runtime Electron e não chama CDM
 * a menos que DSX_WIDEVINE_ENABLED=1 e `electron.components` exista.
 *
 * Quando o certificado estiver pronto:
 *  1. Trocar o pacote `electron` pelo ECS Castlabs (wvcus)
 *  2. Assinar o build com EVS
 *  3. Definir DSX_WIDEVINE_ENABLED=1 (ou config em MediaDrmFactory)
 */
class CastlabsWidevineAdapter {
  /**
   * @param {{ componentsApi?: any, enabled?: boolean }} [options]
   */
  constructor(options = {}) {
    this._providerId = 'castlabs-widevine';
    this._enabled = Boolean(options.enabled);
    this._components = options.componentsApi || null;
    this._lastStatus = null;
  }

  getId() {
    return this._providerId;
  }

  isCertificateConfigured() {
    return this._enabled && Boolean(this._components?.whenReady);
  }

  async prepare() {
    if (!this.isCertificateConfigured()) {
      this._lastStatus = {
        available: false,
        certificateReady: false,
        providerId: this._providerId,
        message:
          'Castlabs Widevine reservado: aguarde certificado EVS e ECS habilitado.',
      };
      return this._lastStatus;
    }

    try {
      await this._components.whenReady();
      const details =
        typeof this._components.status === 'function'
          ? this._components.status()
          : null;
      this._lastStatus = {
        available: true,
        certificateReady: true,
        providerId: this._providerId,
        message: 'Widevine CDM pronto',
        details,
      };
      return this._lastStatus;
    } catch (err) {
      this._lastStatus = {
        available: false,
        certificateReady: true,
        providerId: this._providerId,
        message: err?.message || String(err),
      };
      throw err;
    }
  }

  getStatus() {
    if (this._lastStatus) return this._lastStatus;
    return {
      available: false,
      certificateReady: this.isCertificateConfigured(),
      providerId: this._providerId,
      message: this.isCertificateConfigured()
        ? 'Aguardando prepare()'
        : 'Certificado/ECS não configurado',
    };
  }
}

module.exports = { CastlabsWidevineAdapter };
