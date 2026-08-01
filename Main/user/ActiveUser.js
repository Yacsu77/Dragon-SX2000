'use strict';

const path = require('path');
const fs = require('fs').promises;
const { isActiveUser } = require('../contracts/IActiveUser');

/**
 * ActiveUser — perfil ativo, dirs, avatar e origins de sessão.
 *
 * Não faz: wallpaper, dialogs de FS, downloads.
 *
 * @implements {import('../contracts/IActiveUser').IActiveUser}
 */
class ActiveUser {
  /**
   * @param {{ app: Electron.App, sessionModule: typeof import('electron').session }} deps
   */
  constructor({ app, sessionModule }) {
    if (!app || !sessionModule) {
      throw new Error('ActiveUser: app e sessionModule obrigatórios');
    }
    this._app = app;
    this._session = sessionModule;
    /** @type {string|null} */
    this._userId = null;
  }

  get() {
    return this._userId;
  }

  async ensureDir(userId) {
    const dir = path.join(this._app.getPath('userData'), 'users', userId);
    await fs.mkdir(dir, { recursive: true });
    await fs.mkdir(path.join(dir, 'wallpaper'), { recursive: true });
    await fs.mkdir(path.join(dir, 'avatar'), { recursive: true });
    return dir;
  }

  async set(userId) {
    this._userId = userId || null;
    if (this._userId) await this.ensureDir(this._userId);
    return { ok: true, userId: this._userId };
  }

  async saveAvatarDataUrl(userId, dataUrl) {
    if (!userId || !dataUrl || !dataUrl.startsWith('data:')) {
      throw new Error('avatar inválido');
    }
    await this.ensureDir(userId);
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('dataUrl inválido');
    const mime = match[1];
    let ext = '.jpg';
    if (mime.includes('png')) ext = '.png';
    else if (mime.includes('webp')) ext = '.webp';
    else if (mime.includes('gif')) ext = '.gif';
    const destPath = path.join(
      this._app.getPath('userData'),
      'users',
      userId,
      'avatar',
      `avatar${ext}`
    );
    await fs.writeFile(destPath, Buffer.from(match[2], 'base64'));
    return destPath;
  }

  async deleteUserData(userId) {
    if (!userId) return { ok: false };
    const dir = path.join(this._app.getPath('userData'), 'users', userId);
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    return { ok: true };
  }

  async listKnownOrigins() {
    if (!this._userId) return [];
    const partition = `persist:dragon-${this._userId}`;
    const cookies = await this._session.fromPartition(partition).cookies.get({});
    const authName =
      /(^|[_-])(session|sess|sid|auth|token|login|account)([_-]|$)/i;
    const domains = new Set();
    cookies.forEach((cookie) => {
      if (!cookie?.domain) return;
      if (!authName.test(cookie.name || '') && !(cookie.httpOnly && cookie.secure)) {
        return;
      }
      const domain = cookie.domain.replace(/^\./, '').toLowerCase();
      if (domain && domain.includes('.')) domains.add(`https://${domain}`);
    });
    return Array.from(domains).slice(0, 100);
  }
}

function createActiveUser(deps) {
  const user = new ActiveUser(deps);
  if (!isActiveUser(user)) {
    throw new Error('ActiveUser não satisfaz IActiveUser');
  }
  return user;
}

module.exports = { ActiveUser, createActiveUser };
