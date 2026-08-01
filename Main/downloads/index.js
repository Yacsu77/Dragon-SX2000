'use strict';

const { createDownloadTracker, DownloadTracker } = require('./DownloadTracker');
const { DownloadsIpc } = require('./DownloadsIpc');

/**
 * DownloadsServices — facade IDownloadTracker + IPC prepare.
 */
class DownloadsServices {
  /**
   * @param {{
   *   tracker: import('./DownloadTracker').DownloadTracker,
   *   ipc: DownloadsIpc,
   * }} deps
   */
  constructor({ tracker, ipc }) {
    this._tracker = tracker;
    this._ipc = ipc;
  }

  /** @returns {import('../contracts/IDownloadTracker').IDownloadTracker} */
  getTracker() {
    return this._tracker;
  }

  attach(webContents) {
    return this._tracker.attach(webContents);
  }

  /** @param {Electron.IpcMain} ipcMain */
  register(ipcMain) {
    return this._ipc.register(ipcMain);
  }
}

/**
 * @param {{
 *   getActiveUserId: () => string|null,
 *   app: Electron.App,
 *   dialog?: Electron.Dialog,
 * }} options
 */
function createDownloadsServices(options) {
  const tracker = createDownloadTracker(options);
  const ipc = new DownloadsIpc({ tracker });
  return new DownloadsServices({ tracker, ipc });
}

module.exports = {
  createDownloadsServices,
  DownloadsServices,
  createDownloadTracker,
  DownloadTracker,
  DownloadsIpc,
};
