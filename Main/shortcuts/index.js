'use strict';

const {
  createGuestShortcutBridge,
  GuestShortcutBridge,
  ShortcutsIpc,
} = require('./GuestShortcutBridge');

/**
 * ShortcutsServices — facade IGuestShortcutBridge + registro IPC.
 */
class ShortcutsServices {
  /**
   * @param {{ bridge: GuestShortcutBridge, ipc: ShortcutsIpc }} deps
   */
  constructor({ bridge, ipc }) {
    this._bridge = bridge;
    this._ipc = ipc;
  }

  /** @returns {import('../contracts/IGuestShortcutBridge').IGuestShortcutBridge} */
  getBridge() {
    return this._bridge;
  }

  setCombos(hostWcId, combos) {
    return this._bridge.setCombos(hostWcId, combos);
  }

  setHoldCombos(hostWcId, combos) {
    return this._bridge.setHoldCombos(hostWcId, combos);
  }

  clear(hostWcId) {
    return this._bridge.clear(hostWcId);
  }

  getPressCombos(hostWcId) {
    return this._bridge.getPressCombos(hostWcId);
  }

  getHoldCombos(hostWcId) {
    return this._bridge.getHoldCombos(hostWcId);
  }

  comboFromInput(input) {
    return this._bridge.comboFromInput(input);
  }

  /** @param {Electron.IpcMain} ipcMain */
  register(ipcMain) {
    return this._ipc.register(ipcMain);
  }
}

function createShortcutsServices() {
  const bridge = createGuestShortcutBridge();
  const ipc = new ShortcutsIpc({ bridge });
  return new ShortcutsServices({ bridge, ipc });
}

module.exports = {
  createShortcutsServices,
  ShortcutsServices,
  GuestShortcutBridge,
  createGuestShortcutBridge,
  ShortcutsIpc,
};
