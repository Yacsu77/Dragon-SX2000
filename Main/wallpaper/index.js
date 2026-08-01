'use strict';

const { createWallpaperStore } = require('./WallpaperStore');
const { WallpaperIpc } = require('./WallpaperIpc');

/**
 * WallpaperServices — facade IWallpaperStore + registro IPC.
 */
class WallpaperServices {
  /**
   * @param {{ store: import('./WallpaperStore').WallpaperStore, ipc: WallpaperIpc }} deps
   */
  constructor({ store, ipc }) {
    this._store = store;
    this._ipc = ipc;
  }

  /** @returns {import('../contracts/IWallpaperStore').IWallpaperStore} */
  getStore() {
    return this._store;
  }

  /** @param {Electron.IpcMain} ipcMain */
  register(ipcMain) {
    return this._ipc.register(ipcMain);
  }
}

/**
 * @param {{
 *   app: Electron.App,
 *   projectRoot: string,
 *   getActiveUserId: () => string|null,
 * }} options
 */
function createWallpaperServices(options) {
  const store = createWallpaperStore(options);
  const ipc = new WallpaperIpc({
    store,
    getActiveUserId: options.getActiveUserId,
  });
  return new WallpaperServices({ store, ipc });
}

module.exports = {
  createWallpaperServices,
  WallpaperServices,
  WallpaperIpc,
  createWallpaperStore,
};
