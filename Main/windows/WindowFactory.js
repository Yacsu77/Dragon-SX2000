'use strict';

const path = require('path');
const { isWindowFactory } = require('../contracts/IWindowFactory');

/**
 * WindowFactory — cria BrowserWindows do shell DSX.
 *
 * Depende de IPendingBootStore + callbacks injetados (DIP):
 *  - attachGuest / onClosed limpam maps de Janelas/atalhos na main
 *
 * Não faz: IPC janelas:*, drag ghost, wallpaper.
 *
 * @implements {import('../contracts/IWindowFactory').IWindowFactory}
 */
class WindowFactory {
  /**
   * @param {{
   *   BrowserWindow: typeof import('electron').BrowserWindow,
   *   projectRoot: string,
   *   pendingStore: import('./PendingBootStore').PendingBootStore,
   *   isAllowedNavigationUrl: (url: string) => boolean,
   *   getActiveUserId: () => string|null,
   *   attachGuest: (win: Electron.BrowserWindow) => void,
   *   onClosed?: (win: Electron.BrowserWindow, wcId: number) => void,
   * }} deps
   */
  constructor(deps) {
    if (!deps?.BrowserWindow || !deps?.projectRoot || !deps?.pendingStore) {
      throw new Error('WindowFactory: deps incompletas');
    }
    this._BrowserWindow = deps.BrowserWindow;
    this._projectRoot = deps.projectRoot;
    this._pending = deps.pendingStore;
    this._isAllowedUrl = deps.isAllowedNavigationUrl;
    this._getActiveUserId = deps.getActiveUserId || (() => null);
    this._attachGuest = deps.attachGuest || (() => {});
    this._onClosed = deps.onClosed || (() => {});
    /** @type {Electron.BrowserWindow|null} */
    this._mainWindow = null;
  }

  getMain() {
    return this._mainWindow;
  }

  createMain() {
    this._mainWindow = this.create();
    return this._mainWindow;
  }

  /**
   * @param {import('../contracts/IWindowFactory').PendingBoot|string|null} [pending]
   */
  create(pending = null) {
    const win = new this._BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        preload: path.join(this._projectRoot, 'preload.js'),
        webviewTag: true,
        contextIsolation: true,
        // Mantém timers/compositor ativos com foco em outro monitor (RGB, UI).
        backgroundThrottling: false,
      },
    });

    let pendingUrl = null;
    let pendingTab = null;
    let bootUserId = this._getActiveUserId();
    let cleanSession = false;

    if (typeof pending === 'string') {
      pendingUrl = pending;
      cleanSession = true;
    } else if (pending && typeof pending === 'object') {
      pendingUrl = pending.url || null;
      pendingTab = pending.tab || null;
      if (pending.userId) bootUserId = pending.userId;
      cleanSession = Boolean(
        pending.cleanSession || pendingUrl || pendingTab
      );
    }

    const wcId = win.webContents.id;

    if (pendingTab && typeof pendingTab === 'object') {
      this._pending.setTab(wcId, pendingTab);
      cleanSession = true;
    } else if (pendingUrl && this._isAllowedUrl(pendingUrl)) {
      this._pending.setUrl(wcId, pendingUrl);
      cleanSession = true;
    }

    if (bootUserId || cleanSession) {
      this._pending.setBoot(wcId, {
        userId: bootUserId || null,
        cleanSession,
      });
    }

    this._attachGuest(win);

    try {
      win.webContents.setBackgroundThrottling(false);
    } catch (_) {
      /* Electron antigo */
    }

    win.on('closed', () => {
      this._pending.clear(wcId);
      try {
        this._onClosed(win, wcId);
      } catch (_) {
        /* ignore */
      }
      if (this._mainWindow === win) this._mainWindow = null;
    });

    win.loadFile(path.join(this._projectRoot, 'Frontend/src/index.html'));
    return win;
  }
}

function createWindowFactory(deps) {
  const factory = new WindowFactory(deps);
  if (!isWindowFactory(factory)) {
    throw new Error('WindowFactory não satisfaz IWindowFactory');
  }
  return factory;
}

module.exports = { WindowFactory, createWindowFactory };
