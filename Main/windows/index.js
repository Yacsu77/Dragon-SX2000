'use strict';

/**
 * Main/windows — BrowserWindow factory + pending boot + menu.
 *
 * Contratos: IWindowFactory | IPendingBootStore
 * Ver: Version/Docs/MainProcess.md (Fase 3)
 */

const { createPendingBootStore, PendingBootStore } = require('./PendingBootStore');
const { createWindowFactory, WindowFactory } = require('./WindowFactory');
const { setupApplicationMenu } = require('./ApplicationMenu');
const { WindowServices } = require('./WindowServices');

/**
 * @param {{
 *   BrowserWindow: typeof import('electron').BrowserWindow,
 *   projectRoot: string,
 *   isAllowedNavigationUrl: (url: string) => boolean,
 *   getActiveUserId: () => string|null,
 *   attachGuest: (win: Electron.BrowserWindow) => void,
 *   onClosed?: (win: Electron.BrowserWindow, wcId: number) => void,
 * }} options
 * @returns {WindowServices}
 */
function createWindowServices(options) {
  const pending = createPendingBootStore();
  const factory = createWindowFactory({
    BrowserWindow: options.BrowserWindow,
    projectRoot: options.projectRoot,
    pendingStore: pending,
    isAllowedNavigationUrl: options.isAllowedNavigationUrl,
    getActiveUserId: options.getActiveUserId,
    attachGuest: options.attachGuest,
    onClosed: options.onClosed,
  });
  return new WindowServices({
    factory,
    pending,
    setupMenu: setupApplicationMenu,
  });
}

module.exports = {
  createWindowServices,
  WindowServices,
  PendingBootStore,
  createPendingBootStore,
  WindowFactory,
  createWindowFactory,
  setupApplicationMenu,
};
