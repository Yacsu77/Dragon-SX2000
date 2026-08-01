'use strict';

const { createActiveUser } = require('./ActiveUser');
const { UserIpc } = require('./UserIpc');

/**
 * UserServices — facade IActiveUser + registro IPC.
 */
class UserServices {
  /**
   * @param {{ activeUser: import('./ActiveUser').ActiveUser, ipc: UserIpc }} deps
   */
  constructor({ activeUser, ipc }) {
    this._user = activeUser;
    this._ipc = ipc;
  }

  /** @returns {import('../contracts/IActiveUser').IActiveUser} */
  getActiveUser() {
    return this._user;
  }

  get() {
    return this._user.get();
  }

  set(userId) {
    return this._user.set(userId);
  }

  /** @param {Electron.IpcMain} ipcMain */
  register(ipcMain) {
    return this._ipc.register(ipcMain);
  }
}

/**
 * @param {{ app: Electron.App, session: typeof import('electron').session }} options
 */
function createUserServices({ app, session }) {
  const activeUser = createActiveUser({ app, sessionModule: session });
  const ipc = new UserIpc({ activeUser });
  return new UserServices({ activeUser, ipc });
}

module.exports = {
  createUserServices,
  UserServices,
  UserIpc,
  createActiveUser,
};
