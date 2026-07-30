'use strict';

/**
 * UserIpc — canais user:* e session:listKnownOrigins.
 */
class UserIpc {
  /**
   * @param {{ activeUser: import('./ActiveUser').ActiveUser }} deps
   */
  constructor({ activeUser }) {
    this._user = activeUser;
    this._registered = false;
  }

  /** @param {Electron.IpcMain} ipcMain */
  register(ipcMain) {
    if (this._registered) return;
    this._registered = true;
    const user = this._user;

    ipcMain.handle('user:setActive', async (_event, userId) => {
      return user.set(userId);
    });

    ipcMain.handle('user:getActive', () => user.get());

    ipcMain.handle('session:listKnownOrigins', async () => {
      return user.listKnownOrigins();
    });

    ipcMain.handle('user:saveAvatarDataUrl', async (_event, { userId, dataUrl }) => {
      return user.saveAvatarDataUrl(userId, dataUrl);
    });

    ipcMain.handle('user:deleteUserData', async (_event, userId) => {
      return user.deleteUserData(userId);
    });
  }
}

module.exports = { UserIpc };
