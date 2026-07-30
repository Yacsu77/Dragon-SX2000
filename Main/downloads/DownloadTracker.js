'use strict';

const http = require('http');
const { isDownloadTracker } = require('../contracts/IDownloadTracker');

/**
 * DownloadTracker — hook will-download → POST/PATCH na API :3333.
 *
 * Depende só de getActiveUserId (DIP). Não conhece Janelas/Wallpaper.
 *
 * @implements {import('../contracts/IDownloadTracker').IDownloadTracker}
 */
class DownloadTracker {
  /**
   * @param {{ getActiveUserId: () => string|null, apiHost?: string, apiPort?: number }} deps
   */
  constructor({ getActiveUserId, apiHost = '127.0.0.1', apiPort = 3333 }) {
    this._getActiveUserId = getActiveUserId || (() => null);
    this._apiHost = apiHost;
    this._apiPort = apiPort;
  }

  _postToApi(body, method = 'POST', id = null) {
    const data = JSON.stringify(body);
    const urlPath = id ? `/downloads/${id}` : '/downloads';
    const req = http.request(
      {
        hostname: this._apiHost,
        port: this._apiPort,
        path: urlPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        res.resume();
      }
    );
    req.on('error', () => {});
    req.write(data);
    req.end();
  }

  /**
   * @param {Electron.WebContents} webContents
   */
  attach(webContents) {
    try {
      const ses = webContents.session;
      if (!ses || ses.__dsxDownloadHooked) return;
      ses.__dsxDownloadHooked = true;

      ses.on('will-download', (_event, item) => {
        const userId = this._getActiveUserId();
        if (!userId) return;
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const startedAt = new Date().toISOString();
        this._postToApi({
          id,
          user_id: userId,
          url: item.getURL(),
          filename: item.getFilename(),
          mime: item.getMimeType(),
          size: item.getTotalBytes() || null,
          state: 'progressing',
          save_path: null,
          started_at: startedAt,
        });

        item.once('done', (_e, state) => {
          this._postToApi(
            {
              filename: item.getFilename(),
              mime: item.getMimeType(),
              size: item.getReceivedBytes() || item.getTotalBytes() || null,
              state,
              save_path: item.getSavePath(),
              finished_at: new Date().toISOString(),
            },
            'PATCH',
            id
          );
        });
      });
    } catch (err) {
      console.warn('[Downloads] hook falhou:', err.message);
    }
  }
}

function createDownloadTracker(deps) {
  const tracker = new DownloadTracker(deps);
  if (!isDownloadTracker(tracker)) {
    throw new Error('DownloadTracker não satisfaz IDownloadTracker');
  }
  return tracker;
}

module.exports = { DownloadTracker, createDownloadTracker };
