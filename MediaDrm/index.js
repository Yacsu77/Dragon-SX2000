'use strict';

/**
 * MediaDrm — gerenciamento de mídia/DRM do processo main.
 *
 * Padrões:
 *  - Adapter   → NullDrmAdapter | CastlabsWidevineAdapter
 *  - Composite → MediaCapabilityComposite (+ folhas de capability)
 *  - Observer  → MediaEventBus
 *
 * SOLID: contratos ISP, Factory como composition root (DIP),
 * Manager com SRP, adapters substituíveis (OCP/LSP).
 *
 * Estado atual: sem certificado EVS → NullDrmAdapter.
 * Com certificado: DSX_WIDEVINE_ENABLED=1 + Electron Castlabs ECS.
 */

const { MediaDrmManager, MediaDrmManagerImpl } = require('./MediaDrmManager');
const { MediaDrmFactory } = require('./factory/MediaDrmFactory');
const { MediaEventBus } = require('./observer/MediaEventBus');
const { NullDrmAdapter } = require('./adapters/NullDrmAdapter');
const { CastlabsWidevineAdapter } = require('./adapters/CastlabsWidevineAdapter');
const { MediaCapabilityComposite } = require('./composite/MediaCapabilityComposite');
const { AutoplayCapability } = require('./capabilities/AutoplayCapability');
const { EncryptedMediaCapability } = require('./capabilities/EncryptedMediaCapability');
const { DisplayCaptureCapability } = require('./capabilities/DisplayCaptureCapability');

module.exports = {
  MediaDrmManager,
  MediaDrmManagerImpl,
  MediaDrmFactory,
  MediaEventBus,
  NullDrmAdapter,
  CastlabsWidevineAdapter,
  MediaCapabilityComposite,
  AutoplayCapability,
  EncryptedMediaCapability,
  DisplayCaptureCapability,
};
