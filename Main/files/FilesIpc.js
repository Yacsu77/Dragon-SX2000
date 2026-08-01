'use strict';

/**
 * FilesIpc — canais files:*.
 */
class FilesIpc {
  /**
   * @param {{ fileDialogs: import('./FileDialogs').FileDialogs }} deps
   */
  constructor({ fileDialogs }) {
    this._files = fileDialogs;
    this._registered = false;
  }

  /** @param {Electron.IpcMain} ipcMain */
  register(ipcMain) {
    if (this._registered) return;
    this._registered = true;
    const files = this._files;

    ipcMain.handle('files:readDir', async (_event, dirPath) => {
      return files.readDir(dirPath);
    });

    ipcMain.handle('files:getHome', () => files.getHome());

    ipcMain.handle('files:pickFolder', async () => {
      return files.pickFolder();
    });
  }
}

module.exports = { FilesIpc };
