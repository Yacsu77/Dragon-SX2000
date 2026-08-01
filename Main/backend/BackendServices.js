'use strict';

/**
 * BackendServices — facade do domínio backend (Composition Root local).
 *
 * Expõe supervisores segregados: cliente da main usa só o que precisa
 * (OCP: novos backends = novo supervisor + register, sem inchá-lo).
 *
 * Não faz: BrowserWindow, IPC de UI, UA, DRM.
 */
class BackendServices {
  /**
   * @param {{
   *   paths: import('./PathResolver').PathResolver,
   *   mediaSdk: import('./MediaSdkSupervisor').MediaSdkSupervisor,
   *   apiDsx: import('./ApiDsxSupervisor').ApiDsxSupervisor,
   * }} deps
   */
  constructor({ paths, mediaSdk, apiDsx }) {
    this.paths = paths;
    this.mediaSdk = mediaSdk;
    this.apiDsx = apiDsx;
  }

  /** @returns {import('./PathResolver').PathResolver} */
  getPathResolver() {
    return this.paths;
  }

  /** @returns {import('../contracts/IProcessSupervisor').IProcessSupervisor} */
  getMediaSdk() {
    return this.mediaSdk;
  }

  /**
   * API: IProcessSupervisor + IApiProbe no mesmo objeto (uso ISP no import).
   * @returns {import('./ApiDsxSupervisor').ApiDsxSupervisor}
   */
  getApiDsx() {
    return this.apiDsx;
  }

  startMediaSdk() {
    return this.mediaSdk.start();
  }

  startApiDsx() {
    return this.apiDsx.start();
  }

  stopAll() {
    this.mediaSdk.stop();
    this.apiDsx.stop();
  }
}

module.exports = { BackendServices };
