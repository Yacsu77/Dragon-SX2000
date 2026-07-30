'use strict';

const { createFileDialogs } = require('./FileDialogs');
const { FilesIpc } = require('./FilesIpc');

/**
 * FilesServices — facade IFileDialogs + registro IPC.
 */
class FilesServices {
  /**
   * @param {{ fileDialogs: import('./FileDialogs').FileDialogs, ipc: FilesIpc }} deps
   */
  constructor({ fileDialogs, ipc }) {
    this._files = fileDialogs;
    this._ipc = ipc;
  }

  /** @returns {import('../contracts/IFileDialogs').IFileDialogs} */
  getFileDialogs() {
    return this._files;
  }

  /** @param {Electron.IpcMain} ipcMain */
  register(ipcMain) {
    return this._ipc.register(ipcMain);
  }
}

/**
 * @param {{ app: Electron.App, dialog: Electron.Dialog }} options
 */
function createFilesServices(options) {
  const fileDialogs = createFileDialogs(options);
  const ipc = new FilesIpc({ fileDialogs });
  return new FilesServices({ fileDialogs, ipc });
}

module.exports = {
  createFilesServices,
  FilesServices,
  FilesIpc,
  createFileDialogs,
};
