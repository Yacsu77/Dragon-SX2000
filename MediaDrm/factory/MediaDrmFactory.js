'use strict';

const { NullDrmAdapter } = require('../adapters/NullDrmAdapter');
const { CastlabsWidevineAdapter } = require('../adapters/CastlabsWidevineAdapter');
const { MediaCapabilityComposite } = require('../composite/MediaCapabilityComposite');
const { AutoplayCapability } = require('../capabilities/AutoplayCapability');
const { EncryptedMediaCapability } = require('../capabilities/EncryptedMediaCapability');
const { DisplayCaptureCapability } = require('../capabilities/DisplayCaptureCapability');
const { MediaEventBus } = require('../observer/MediaEventBus');

/**
 * Composition Root — monta Adapter + Composite + Observer sem acoplar o main.
 *
 * Troca de DRM no futuro (com certificado):
 *   DSX_WIDEVINE_ENABLED=1 + Electron Castlabs ECS → CastlabsWidevineAdapter
 *   caso contrário → NullDrmAdapter (estado atual)
 */
class MediaDrmFactory {
  /**
   * @param {{ enabledWidevine?: boolean, componentsApi?: any }} [options]
   */
  static createDrmProvider(options = {}) {
    const enabled =
      options.enabledWidevine === true ||
      process.env.DSX_WIDEVINE_ENABLED === '1';

    let componentsApi = options.componentsApi || null;
    if (enabled && !componentsApi) {
      try {
        componentsApi = require('electron').components || null;
      } catch (_) {
        componentsApi = null;
      }
    }

    if (enabled && componentsApi) {
      return new CastlabsWidevineAdapter({ enabled: true, componentsApi });
    }

    // Mesmo com flag, sem ECS caímos no Null (seguro).
    if (enabled) {
      return new CastlabsWidevineAdapter({ enabled: false, componentsApi: null });
    }

    return new NullDrmAdapter();
  }

  static createCapabilityTree() {
    return new MediaCapabilityComposite('media-root', [
      new AutoplayCapability(),
      new EncryptedMediaCapability(),
      new DisplayCaptureCapability(),
    ]);
  }

  static createEventBus() {
    return new MediaEventBus();
  }
}

module.exports = { MediaDrmFactory };
