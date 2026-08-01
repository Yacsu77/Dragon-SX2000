'use strict';

/**
 * Main/backend — domínio de processos Backend (API-DSX + Media SDK).
 *
 * Contratos: IBackendPathResolver | IProcessSupervisor | IApiProbe
 * Ver: Version/Docs/MainProcess.md (Fase 1)
 */

const { PathResolver, createPathResolver } = require('./PathResolver');
const {
  MediaSdkSupervisor,
  createMediaSdkSupervisor,
} = require('./MediaSdkSupervisor');
const {
  ApiDsxSupervisor,
  createApiDsxSupervisor,
} = require('./ApiDsxSupervisor');
const { BackendServices } = require('./BackendServices');

/**
 * Composition Root do domínio backend.
 *
 * @param {{
 *   app: Electron.App,
 *   projectRoot: string,
 *   getIsQuitting?: () => boolean,
 * }} options
 * @returns {BackendServices}
 */
function createBackendServices({ app, projectRoot, getIsQuitting }) {
  const paths = createPathResolver({ app, projectRoot });
  const mediaSdk = createMediaSdkSupervisor({ paths });
  const apiDsx = createApiDsxSupervisor({ paths, app, getIsQuitting });
  return new BackendServices({ paths, mediaSdk, apiDsx });
}

module.exports = {
  createBackendServices,
  BackendServices,
  PathResolver,
  createPathResolver,
  MediaSdkSupervisor,
  createMediaSdkSupervisor,
  ApiDsxSupervisor,
  createApiDsxSupervisor,
};
