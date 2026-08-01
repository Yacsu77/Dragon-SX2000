'use strict';

/**
 * WallpaperIpc — canais wallpaper:*.
 */
class WallpaperIpc {
  /**
   * @param {{
   *   store: import('./WallpaperStore').WallpaperStore,
   *   getActiveUserId: () => string|null,
   * }} deps
   */
  constructor({ store, getActiveUserId }) {
    this._store = store;
    this._getActiveUserId = getActiveUserId || (() => null);
    this._registered = false;
  }

  /** @param {Electron.IpcMain} ipcMain */
  register(ipcMain) {
    if (this._registered) return;
    this._registered = true;
    const store = this._store;
    const getActive = this._getActiveUserId;

    ipcMain.handle('wallpaper:readState', async (_event, payload) => {
      const userId = payload && payload.userId;
      return store.readState(userId);
    });

    ipcMain.handle('wallpaper:saveState', async (_event, payload) => {
      const userId = (payload && payload.userId) || getActive();
      const state =
        payload && payload.state !== undefined ? payload.state : payload;
      return store.saveState(userId, state);
    });

    ipcMain.handle(
      'wallpaper:importFile',
      async (_event, { sourcePath, type, userId } = {}) => {
        return store.importFile({ sourcePath, type, userId });
      }
    );

    ipcMain.handle(
      'wallpaper:importDataUrl',
      async (_event, { dataUrl, userId } = {}) => {
        return store.importDataUrl({ dataUrl, userId });
      }
    );

    ipcMain.handle(
      'wallpaper:importBlob',
      async (_event, { buffer, ext, userId } = {}) => {
        return store.importBlob({ buffer, ext, userId });
      }
    );

    ipcMain.handle('wallpaper:seedDefault', async (_event, { userId } = {}) => {
      return store.seedDefault(userId);
    });
  }
}

module.exports = { WallpaperIpc };
