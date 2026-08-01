'use strict';

const { isGuestShortcutBridge } = require('../contracts/IGuestShortcutBridge');

/**
 * GuestShortcutBridge — combos globais com foco no guest (&lt;webview&gt;).
 *
 * Espelha comboFromEvent do ShortcutManager (renderer).
 * Não faz: BrowserWindow, OAuth, downloads.
 *
 * @implements {import('../contracts/IGuestShortcutBridge').IGuestShortcutBridge}
 */
class GuestShortcutBridge {
  constructor() {
    /** @type {Map<number, Set<string>>} */
    this._press = new Map();
    /** @type {Map<number, Set<string>>} */
    this._hold = new Map();
  }

  setCombos(hostWcId, combos) {
    const list = Array.isArray(combos)
      ? combos.filter((c) => typeof c === 'string' && c)
      : [];
    this._press.set(hostWcId, new Set(list));
  }

  setHoldCombos(hostWcId, combos) {
    const list = Array.isArray(combos)
      ? combos.filter((c) => typeof c === 'string' && c)
      : [];
    this._hold.set(hostWcId, new Set(list));
  }

  clear(hostWcId) {
    this._press.delete(hostWcId);
    this._hold.delete(hostWcId);
  }

  getPressCombos(hostWcId) {
    return this._press.get(hostWcId);
  }

  getHoldCombos(hostWcId) {
    return this._hold.get(hostWcId);
  }

  /**
   * Constrói o combo canônico a partir de before-input-event.
   * @param {object} input
   */
  comboFromInput(input) {
    const keyName = input && input.key ? String(input.key) : '';
    const bareModMap = {
      Alt: 'Alt',
      AltGraph: 'Alt',
      Option: 'Alt',
      Control: 'Ctrl',
      Ctrl: 'Ctrl',
      Shift: 'Shift',
      Meta: 'Meta',
    };
    const bareMod = bareModMap[keyName];
    if (bareMod) {
      const otherDown =
        (bareMod !== 'Ctrl' && input.control) ||
        (bareMod !== 'Shift' && input.shift) ||
        (bareMod !== 'Alt' && input.alt) ||
        (bareMod !== 'Meta' && input.meta);
      if (!otherDown) return bareMod;
    }

    const mods = [];
    if (input.control) mods.push('Ctrl');
    if (input.shift) mods.push('Shift');
    if (input.alt) mods.push('Alt');
    if (input.meta) mods.push('Meta');

    let mainKey = input.key;
    if (mainKey === ' ' || input.code === 'Space') mainKey = 'Space';
    else if (mainKey && mainKey.length === 1 && /[a-z]/i.test(mainKey)) {
      mainKey = mainKey.toUpperCase();
    }
    if (mainKey === 'Esc') mainKey = 'Escape';
    if (mainKey === 'Del') mainKey = 'Delete';

    if (!mainKey || bareModMap[mainKey]) return '';
    return [...mods, mainKey].join('+');
  }
}

/**
 * ShortcutsIpc — registra shortcuts:set-global-*.
 */
class ShortcutsIpc {
  /**
   * @param {{ bridge: GuestShortcutBridge }} deps
   */
  constructor({ bridge }) {
    this._bridge = bridge;
    this._registered = false;
  }

  /** @param {Electron.IpcMain} ipcMain */
  register(ipcMain) {
    if (this._registered) return;
    this._registered = true;
    const bridge = this._bridge;

    ipcMain.on('shortcuts:set-global-combos', (event, combos) => {
      bridge.setCombos(event.sender.id, combos);
    });

    ipcMain.on('shortcuts:set-global-hold-combos', (event, combos) => {
      bridge.setHoldCombos(event.sender.id, combos);
    });
  }
}

function createGuestShortcutBridge() {
  const bridge = new GuestShortcutBridge();
  if (!isGuestShortcutBridge(bridge)) {
    throw new Error('GuestShortcutBridge não satisfaz IGuestShortcutBridge');
  }
  return bridge;
}

module.exports = {
  GuestShortcutBridge,
  createGuestShortcutBridge,
  ShortcutsIpc,
};
