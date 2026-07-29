'use strict';

const { app } = require('electron');
const { MediaDrmFactory } = require('./factory/MediaDrmFactory');
const { isDrmProvider } = require('./contracts/IDrmProvider');

/**
 * Facade / Orchestrator (SRP) — único ponto de entrada do main process.
 *
 * - Observer: notifica drm:* e capability:*
 * - Adapter: Null hoje; Castlabs quando certificado
 * - Composite: aplica capacidades de mídia em árvore
 */
class MediaDrmManagerImpl {
  constructor() {
    this._bus = MediaDrmFactory.createEventBus();
    this._drm = MediaDrmFactory.createDrmProvider();
    this._capabilities = MediaDrmFactory.createCapabilityTree();
    this._earlyInstalled = false;
    this._bootstrapped = false;
    this._drmStatus = null;
  }

  /** @returns {import('./observer/MediaEventBus').MediaEventBus} */
  get bus() {
    return this._bus;
  }

  /**
   * Switches que precisam existir ANTES de app.whenReady().
   * Chamar logo após o require no main.js.
   */
  installEarlySwitches() {
    if (this._earlyInstalled) return;
    const autoplay = this._capabilities.find('autoplay');
    if (autoplay) {
      const result = autoplay.apply({ app });
      this._bus.notify(
        result.ok ? 'capability:applied' : 'capability:failed',
        result
      );
    }
    this._earlyInstalled = true;
  }

  /**
   * @param {(payload: object) => void} handler
   * @returns {() => void}
   */
  on(event, handler) {
    return this._bus.subscribe(event, handler);
  }

  getDrmStatus() {
    return this._drmStatus || this._drm.getStatus();
  }

  /**
   * Bootstrap pós app.whenReady(): prepara DRM (no-op sem certificado)
   * e aplica o restante do Composite.
   */
  async bootstrap() {
    this.installEarlySwitches();

    if (this._bootstrapped) {
      return this.snapshot();
    }

    try {
      if (!isDrmProvider(this._drm)) {
        throw new Error('DRM provider inválido');
      }

      if (!this._drm.isCertificateConfigured()) {
        this._drmStatus = await this._drm.prepare();
        this._bus.notify('drm:pending', this._drmStatus);
      } else {
        this._drmStatus = await this._drm.prepare();
        if (this._drmStatus.available) {
          this._bus.notify('drm:ready', this._drmStatus);
        } else {
          this._bus.notify('drm:unavailable', this._drmStatus);
        }
      }
    } catch (err) {
      this._drmStatus = {
        available: false,
        certificateReady: false,
        providerId: this._drm.getId(),
        message: err?.message || String(err),
      };
      this._bus.notify('drm:error', this._drmStatus);
    }

    const capabilityStatus = await this._capabilities.apply({
      app,
      drm: this._drmStatus,
    });

    for (const child of capabilityStatus.children || []) {
      this._bus.notify(
        child.ok ? 'capability:applied' : 'capability:failed',
        child
      );
    }

    this._bootstrapped = true;
    const snap = this.snapshot();
    this._bus.notify('media:bootstrapped', snap);

    if (!snap.drm.available) {
      console.log(
        '[MediaDrm]',
        snap.drm.message || 'DRM pendente (sem certificado)'
      );
    }

    return snap;
  }

  snapshot() {
    return {
      drm: this.getDrmStatus(),
      capabilities: this._capabilities.getStatus(),
      bootstrapped: this._bootstrapped,
    };
  }

  /**
   * Permite injetar outro Adapter (testes / futuro certificado) sem
   * alterar consumidores — DIP.
   * @param {import('./contracts/IDrmProvider').IDrmProvider} provider
   */
  setDrmProvider(provider) {
    if (!isDrmProvider(provider)) {
      throw new Error('setDrmProvider: provider inválido');
    }
    this._drm = provider;
    this._bootstrapped = false;
    this._drmStatus = null;
  }
}

const MediaDrmManager = new MediaDrmManagerImpl();

module.exports = { MediaDrmManager, MediaDrmManagerImpl };
