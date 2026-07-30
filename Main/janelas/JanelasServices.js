'use strict';

/**
 * JanelasServices — facade do domínio Janelas (drop + ghost + IPC registrar).
 */
class JanelasServices {
  /**
   * @param {{
   *   dropRegistry: import('./TabsDropRegistry').TabsDropRegistry,
   *   dragGhost: import('./DragGhost').DragGhost,
   *   ipc: import('./JanelasIpc').JanelasIpc,
   * }} deps
   */
  constructor({ dropRegistry, dragGhost, ipc }) {
    this._dropRegistry = dropRegistry;
    this._dragGhost = dragGhost;
    this._ipc = ipc;
  }

  /** @returns {import('../contracts/ITabsDropRegistry').ITabsDropRegistry} */
  getDropRegistry() {
    return this._dropRegistry;
  }

  /** @returns {import('../contracts/IDragGhost').IDragGhost} */
  getDragGhost() {
    return this._dragGhost;
  }

  /** @param {Electron.IpcMain} ipcMain */
  register(ipcMain) {
    return this._ipc.register(ipcMain);
  }

  clearDropBounds(wcId) {
    return this._dropRegistry.clear(wcId);
  }

  destroyGhost() {
    return this._dragGhost.end();
  }
}

module.exports = { JanelasServices };
