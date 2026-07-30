'use strict';

const { createDownloadTracker, DownloadTracker } = require('./DownloadTracker');

/**
 * DownloadsServices — facade IDownloadTracker.
 */
class DownloadsServices {
  /**
   * @param {{ tracker: import('./DownloadTracker').DownloadTracker }} deps
   */
  constructor({ tracker }) {
    this._tracker = tracker;
  }

  /** @returns {import('../contracts/IDownloadTracker').IDownloadTracker} */
  getTracker() {
    return this._tracker;
  }

  attach(webContents) {
    return this._tracker.attach(webContents);
  }
}

/**
 * @param {{ getActiveUserId: () => string|null }} options
 */
function createDownloadsServices(options) {
  const tracker = createDownloadTracker(options);
  return new DownloadsServices({ tracker });
}

module.exports = {
  createDownloadsServices,
  DownloadsServices,
  createDownloadTracker,
  DownloadTracker,
};
