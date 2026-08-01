'use strict';

const path = require('path');
const { isBackendPathResolver } = require('../contracts/IBackendPathResolver');

/**
 * PathResolver — localiza Backend/ em packaged (extraResources) ou no repo.
 *
 * Não faz: spawn de processos, healthcheck, IPC.
 *
 * @implements {import('../contracts/IBackendPathResolver').IBackendPathResolver}
 */
class PathResolver {
  /**
   * @param {{ app: Electron.App, projectRoot: string }} deps
   */
  constructor({ app, projectRoot }) {
    if (!app || !projectRoot) {
      throw new Error('PathResolver: app e projectRoot são obrigatórios');
    }
    this._app = app;
    this._projectRoot = path.resolve(projectRoot);
  }

  getProjectRoot() {
    return this._projectRoot;
  }

  /**
   * Backend empacotado: <resources>/Backend/...
   * Desenvolvimento: <repo>/Backend/...
   */
  resolve(...parts) {
    if (this._app.isPackaged) {
      return path.join(process.resourcesPath, 'Backend', ...parts);
    }
    return path.join(this._projectRoot, 'Backend', ...parts);
  }

  /**
   * Env do filho: ELECTRON_RUN_AS_NODE + paths graváveis em userData.
   * Por quê userData no packaged: asar/resources são read-only para a DB.
   */
  childEnv(extra = {}) {
    const userData = this._app.getPath('userData');
    return {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      DSX_PACKAGED: this._app.isPackaged ? '1' : '0',
      DSX_PROJECT_ROOT: this._app.isPackaged
        ? process.resourcesPath
        : this._projectRoot,
      DSX_USER_DATA: userData,
      DSX_API_DB_PATH: path.join(userData, 'API-DSX', 'dsx-browser.db'),
      ...extra,
    };
  }

  expectedProjectRoot() {
    if (this._app.isPackaged) return path.resolve(process.resourcesPath);
    return this._projectRoot;
  }
}

/**
 * @param {{ app: Electron.App, projectRoot: string }} deps
 * @returns {PathResolver}
 */
function createPathResolver(deps) {
  const resolver = new PathResolver(deps);
  if (!isBackendPathResolver(resolver)) {
    throw new Error('PathResolver não satisfaz IBackendPathResolver');
  }
  return resolver;
}

module.exports = { PathResolver, createPathResolver };
