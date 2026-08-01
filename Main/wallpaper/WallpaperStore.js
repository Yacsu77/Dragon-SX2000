'use strict';

const path = require('path');
const fs = require('fs').promises;
const { isWallpaperStore } = require('../contracts/IWallpaperStore');

const DEFAULT_WALLPAPER_FILES = ['WWP.jpg', 'WWP1.png', 'WWP3.jpg'];

/**
 * WallpaperStore — state.json + import/seed por usuário.
 *
 * Não faz: IPC, ActiveUser (só recebe getActiveUserId), dialogs.
 *
 * @implements {import('../contracts/IWallpaperStore').IWallpaperStore}
 */
class WallpaperStore {
  /**
   * @param {{
   *   app: Electron.App,
   *   projectRoot: string,
   *   getActiveUserId: () => string|null,
   * }} deps
   */
  constructor({ app, projectRoot, getActiveUserId }) {
    if (!app || !projectRoot) {
      throw new Error('WallpaperStore: app e projectRoot obrigatórios');
    }
    this._app = app;
    this._projectRoot = projectRoot;
    this._getActiveUserId = getActiveUserId || (() => null);
  }

  _dir(userId) {
    if (userId) {
      return path.join(this._app.getPath('userData'), 'users', userId, 'wallpaper');
    }
    return path.join(this._app.getPath('userData'), 'wallpapers');
  }

  _stateFile(userId) {
    return path.join(this._dir(userId), 'state.json');
  }

  async _ensureDir(userId) {
    await fs.mkdir(this._dir(userId), { recursive: true });
  }

  _resolveUserId(userId) {
    return userId || this._getActiveUserId();
  }

  async readState(userId) {
    // Só lê o wallpaper do userId explícito — nunca cai no activeUserId
    // para evitar vazar estado entre perfis.
    if (!userId) return null;
    try {
      const raw = await fs.readFile(this._stateFile(userId), 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async saveState(userId, state) {
    const uid = this._resolveUserId(userId);
    if (!uid) throw new Error('userId obrigatório para salvar wallpaper');
    await this._ensureDir(uid);
    await fs.writeFile(this._stateFile(uid), JSON.stringify(state), 'utf8');
    return true;
  }

  async importFile({ sourcePath, type, userId } = {}) {
    if (!sourcePath) throw new Error('sourcePath obrigatorio');
    const uid = this._resolveUserId(userId);
    if (!uid) throw new Error('userId obrigatório');
    await this._ensureDir(uid);
    const ext = path.extname(sourcePath) || (type === 'video' ? '.mp4' : '.jpg');
    const destPath = path.join(this._dir(uid), `wallpaper${ext}`);
    await fs.copyFile(sourcePath, destPath);
    return destPath;
  }

  async importDataUrl({ dataUrl, userId } = {}) {
    if (!dataUrl || !dataUrl.startsWith('data:')) throw new Error('dataUrl invalido');
    const uid = this._resolveUserId(userId);
    if (!uid) throw new Error('userId obrigatório');
    await this._ensureDir(uid);
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('dataUrl invalido');
    const mime = match[1];
    let ext = '.jpg';
    if (mime.includes('png')) ext = '.png';
    else if (mime.includes('webp')) ext = '.webp';
    else if (mime.includes('gif')) ext = '.gif';
    const destPath = path.join(this._dir(uid), `wallpaper${ext}`);
    await fs.writeFile(destPath, Buffer.from(match[2], 'base64'));
    return destPath;
  }

  async importBlob({ buffer, ext, userId } = {}) {
    const uid = this._resolveUserId(userId);
    if (!uid) throw new Error('userId obrigatório');
    await this._ensureDir(uid);
    const safeExt = ext && ext.startsWith('.') ? ext : '.mp4';
    const destPath = path.join(this._dir(uid), `wallpaper${safeExt}`);
    await fs.writeFile(destPath, Buffer.from(buffer));
    return destPath;
  }

  _defaultSourcePath(fileName) {
    return path.join(
      this._projectRoot,
      'UserINTer',
      'Tabline',
      'idget',
      'Wallpaper',
      fileName
    );
  }

  async seedDefault(userId) {
    const uid = this._resolveUserId(userId);
    if (!uid) return { seeded: false, reason: 'no-user' };
    await this._ensureDir(uid);
    try {
      await fs.access(this._stateFile(uid));
      return { seeded: false, reason: 'already-has-state' };
    } catch {
      /* sem state — segue */
    }

    const available = [];
    for (const file of DEFAULT_WALLPAPER_FILES) {
      const src = this._defaultSourcePath(file);
      try {
        await fs.access(src);
        available.push({ file, src });
      } catch {
        /* skip missing */
      }
    }
    if (!available.length) return { seeded: false, reason: 'no-assets' };

    const pick = available[Math.floor(Math.random() * available.length)];
    const ext = path.extname(pick.file) || '.jpg';
    const destPath = path.join(this._dir(uid), `wallpaper${ext}`);
    await fs.copyFile(pick.src, destPath);
    const state = {
      type: 'image',
      dataUrl: destPath,
      transform: { x: 0, y: 0, rotate: 0, flipX: 1, flipY: 1 },
      source: pick.file,
    };
    await fs.writeFile(this._stateFile(uid), JSON.stringify(state), 'utf8');
    return { seeded: true, path: destPath, source: pick.file };
  }
}

function createWallpaperStore(deps) {
  const store = new WallpaperStore(deps);
  if (!isWallpaperStore(store)) {
    throw new Error('WallpaperStore não satisfaz IWallpaperStore');
  }
  return store;
}

module.exports = { WallpaperStore, createWallpaperStore, DEFAULT_WALLPAPER_FILES };
