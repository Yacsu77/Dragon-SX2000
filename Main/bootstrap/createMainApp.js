'use strict';

const { createBackendServices } = require('../backend');
const { createBrowserServices } = require('../browser');
const { createWindowServices } = require('../windows');
const { createJanelasServices } = require('../janelas');
const { createUserServices } = require('../user');
const { createWallpaperServices } = require('../wallpaper');
const { createFilesServices } = require('../files');
const { createDownloadsServices } = require('../downloads');
const { createShortcutsServices } = require('../shortcuts');
const { createAppLifecycle } = require('./AppLifecycle');

/**
 * Composition Root — instancia domínios, registra IPC e devolve o bootstrap.
 *
 * @param {{
 *   app: Electron.App,
 *   BrowserWindow: typeof import('electron').BrowserWindow,
 *   ipcMain: Electron.IpcMain,
 *   dialog: Electron.Dialog,
 *   session: typeof import('electron').session,
 *   screen: Electron.Screen,
 *   desktopCapturer: Electron.DesktopCapturer,
 *   projectRoot: string,
 *   MediaDrmManager: { installEarlySwitches: () => void, bootstrap: () => Promise<void> },
 * }} options
 * @returns {{ start: () => void, lifecycle: import('./AppLifecycle').AppLifecycle }}
 */
function createMainApp(options) {
  const {
    app,
    BrowserWindow,
    ipcMain,
    dialog,
    session,
    screen,
    desktopCapturer,
    projectRoot,
    MediaDrmManager,
  } = options;

  let isAppQuitting = false;

  const backend = createBackendServices({
    app,
    projectRoot,
    getIsQuitting: () => isAppQuitting,
  });

  const browser = createBrowserServices({ app, session, desktopCapturer });
  const user = createUserServices({ app, session });
  const wallpaper = createWallpaperServices({
    app,
    projectRoot,
    getActiveUserId: () => user.get(),
  });
  const files = createFilesServices({ app, dialog });
  const downloads = createDownloadsServices({
    getActiveUserId: () => user.get(),
  });
  const shortcuts = createShortcutsServices();

  user.register(ipcMain);
  wallpaper.register(ipcMain);
  files.register(ipcMain);
  shortcuts.register(ipcMain);

  function attachWebviewPopupHandler(win) {
    browser.attachGuestWebview(win, {
      getPressCombos: (hostId) => shortcuts.getPressCombos(hostId),
      getHoldCombos: (hostId) => shortcuts.getHoldCombos(hostId),
      comboFromInput: (input) => shortcuts.comboFromInput(input),
    });
  }

  /** @type {import('../janelas').JanelasServices|null} */
  let janelas = null;

  const windows = createWindowServices({
    BrowserWindow,
    projectRoot,
    isAllowedNavigationUrl: (url) => browser.isAllowedNavigationUrl(url),
    getActiveUserId: () => user.get(),
    attachGuest: attachWebviewPopupHandler,
    onClosed: (_win, wcId) => {
      if (janelas) janelas.clearDropBounds(wcId);
      shortcuts.clear(wcId);
    },
  });

  janelas = createJanelasServices({
    BrowserWindow,
    screen,
    windows,
    getActiveUserId: () => user.get(),
    isAllowedNavigationUrl: (url) => browser.isAllowedNavigationUrl(url),
  });
  janelas.register(ipcMain);

  const lifecycle = createAppLifecycle({
    MediaDrmManager,
    BrowserWindow,
    backend,
    browser,
    windows,
    downloads,
    getJanelas: () => janelas,
    setQuitting: (v) => {
      isAppQuitting = Boolean(v);
    },
  });

  return {
    lifecycle,
    start() {
      lifecycle.start(app);
    },
  };
}

module.exports = { createMainApp };
