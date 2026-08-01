'use strict';

/**
 * DownloadsIpc — prepare save-as / pasta Downloads antes do will-download.
 */
class DownloadsIpc {
  /**
   * @param {{ tracker: import('./DownloadTracker').DownloadTracker }} deps
   */
  constructor({ tracker }) {
    this._tracker = tracker;
    this._registered = false;
  }

  /** @param {Electron.IpcMain} ipcMain */
  register(ipcMain) {
    if (this._registered) return;
    this._registered = true;
    const tracker = this._tracker;

    ipcMain.handle('downloads:prepare', async (_event, payload = {}) => {
      try {
        return await tracker.prepare(payload);
      } catch (err) {
        return { ok: false, error: err?.message || 'prepare-failed' };
      }
    });
  }
}

module.exports = { DownloadsIpc };
