'use strict';

const path = require('path');
const { BrowserWindow } = require('electron');
const { isDownloadTracker } = require('../contracts/IDownloadTracker');

/**
 * DownloadTracker — hook will-download → API :3333 + UI events.
 *
 * Depende de getActiveUserId + app (pasta Downloads). Não conhece Janelas/Wallpaper.
 *
 * @implements {import('../contracts/IDownloadTracker').IDownloadTracker}
 */
class DownloadTracker {
  /**
   * @param {{
   *   getActiveUserId: () => string|null,
   *   app: Electron.App,
   *   dialog?: Electron.Dialog,
   *   apiHost?: string,
   *   apiPort?: number,
   * }} deps
   */
  constructor({
    getActiveUserId,
    app,
    dialog = null,
    apiHost = '127.0.0.1',
    apiPort = 3333,
  }) {
    this._getActiveUserId = getActiveUserId || (() => null);
    this._app = app;
    this._dialog = dialog;
    this._apiHost = apiHost;
    this._apiPort = apiPort;
    /** @type {Map<string, { savePath: string|null, useDownloadsFolder: boolean }>} */
    this._pending = new Map();
    this._activeCount = 0;
  }

  _broadcast(channel, payload) {
    try {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send(channel, payload);
        }
      });
    } catch (_) {
      /* ignore */
    }
  }

  _postToApi(body, method = 'POST', id = null) {
    const http = require('http');
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

  _uniqueDest(dir, filename) {
    const base = filename || 'download';
    let dest = path.join(dir, base);
    try {
      const fs = require('fs');
      if (!fs.existsSync(dest)) return dest;
      const ext = path.extname(base);
      const stem = path.basename(base, ext);
      for (let i = 1; i < 200; i += 1) {
        dest = path.join(dir, `${stem} (${i})${ext}`);
        if (!fs.existsSync(dest)) return dest;
      }
    } catch (_) {
      /* ignore */
    }
    return path.join(dir, `${Date.now()}-${base}`);
  }

  /**
   * Prepara o próximo will-download para esta URL.
   * @param {{ url: string, mode?: 'downloads'|'save-as', suggestedName?: string }} opts
   */
  async prepare(opts) {
    const url = String(opts?.url || '').trim();
    if (!url) return { ok: false, error: 'no-url' };

    let suggested = String(opts?.suggestedName || '').trim();
    if (!suggested) {
      try {
        suggested = path.basename(new URL(url).pathname) || 'image';
      } catch (_) {
        suggested = `image-${Date.now()}.png`;
      }
    }
    if (!path.extname(suggested)) suggested = `${suggested}.png`;
    const mode = opts?.mode === 'save-as' ? 'save-as' : 'downloads';

    if (mode === 'save-as') {
      if (!this._dialog) return { ok: false, error: 'no-dialog' };
      const result = await this._dialog.showSaveDialog({
        title: 'Salvar imagem',
        defaultPath: suggested,
        filters: [
          { name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] },
          { name: 'Todos os arquivos', extensions: ['*'] },
        ],
      });
      if (result.canceled || !result.filePath) {
        return { ok: false, canceled: true };
      }
      this._pending.set(url, { savePath: result.filePath, useDownloadsFolder: false });
      return { ok: true, savePath: result.filePath };
    }

    const downloadsDir = this._app.getPath('downloads');
    const savePath = this._uniqueDest(downloadsDir, suggested);
    this._pending.set(url, { savePath, useDownloadsFolder: true });
    return { ok: true, savePath };
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
        const url = item.getURL();
        const pending = this._pending.get(url);
        if (pending) {
          this._pending.delete(url);
          if (pending.savePath) {
            try {
              item.setSavePath(pending.savePath);
            } catch (_) {
              /* ignore */
            }
          }
        }

        const userId = this._getActiveUserId();
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const filename = item.getFilename();
        const startedAt = new Date().toISOString();

        this._activeCount += 1;
        this._broadcast('downloads:event', {
          type: 'start',
          id,
          url,
          filename,
          activeCount: this._activeCount,
        });

        if (userId) {
          this._postToApi({
            id,
            user_id: userId,
            url,
            filename,
            mime: item.getMimeType(),
            size: item.getTotalBytes() || null,
            state: 'progressing',
            save_path: null,
            started_at: startedAt,
          });
        }

        item.once('done', (_e, state) => {
          this._activeCount = Math.max(0, this._activeCount - 1);
          this._broadcast('downloads:event', {
            type: 'done',
            id,
            url,
            filename: item.getFilename(),
            state,
            savePath: item.getSavePath(),
            activeCount: this._activeCount,
          });

          if (!userId) return;
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
