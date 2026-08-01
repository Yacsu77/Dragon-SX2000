'use strict';

const { isAppBootstrap } = require('../contracts/IAppBootstrap');

/**
 * AppLifecycle — handlers do ciclo de vida Electron.
 *
 * Orquestra MediaDrm + backend + browser identity + 1ª janela.
 * Não faz: política de UA, IPC de domínio, spawn detalhado (deps injetadas).
 *
 * @implements {import('../contracts/IAppBootstrap').IAppBootstrap}
 */
class AppLifecycle {
  /**
   * @param {{
   *   MediaDrmManager: { installEarlySwitches: () => void, bootstrap: () => Promise<void> },
   *   BrowserWindow: typeof import('electron').BrowserWindow,
   *   backend: { startMediaSdk: () => void, startApiDsx: () => Promise<void>, stopAll: () => void },
   *   browser: { configureAppIdentity: () => void, attachToWebContents: (c: Electron.WebContents) => void },
   *   windows: { createMain: () => Electron.BrowserWindow, setupApplicationMenu: () => void },
   *   downloads: { attach: (c: Electron.WebContents) => void },
   *   getJanelas: () => { destroyGhost: () => void }|null,
   *   setQuitting: (v: boolean) => void,
   * }} deps
   */
  constructor(deps) {
    this._drm = deps.MediaDrmManager;
    this._BrowserWindow = deps.BrowserWindow;
    this._backend = deps.backend;
    this._browser = deps.browser;
    this._windows = deps.windows;
    this._downloads = deps.downloads;
    this._getJanelas = deps.getJanelas;
    this._setQuitting = deps.setQuitting;
  }

  installEarly() {
    this._drm.installEarlySwitches();
  }

  async whenReady() {
    await this._drm.bootstrap();
    this._browser.configureAppIdentity();
    this._windows.setupApplicationMenu();
    this._backend.startMediaSdk();
    await this._backend.startApiDsx();
    this._windows.createMain();
  }

  async onActivate() {
    // macOS: reabrir janela sem matar a API (fica no dock).
    if (this._BrowserWindow.getAllWindows().length === 0) {
      await this._drm.bootstrap();
      await this._backend.startApiDsx();
      this._windows.createMain();
    }
  }

  onAllWindowsClosed() {
    // No macOS o app costuma ficar vivo no dock — manter API/SDK ligados
    // evita cold start lento (e ETIMEDOUT) ao reabrir no mesmo dia/noite.
    if (process.platform === 'darwin') return;
    this._backend.stopAll();
  }

  onBeforeQuit() {
    this._setQuitting(true);
    try {
      const janelas = this._getJanelas();
      if (janelas) janelas.destroyGhost();
    } catch (_) {
      /* ignore */
    }
    this._backend.stopAll();
  }

  onWillQuit() {
    this._setQuitting(true);
    this._backend.stopAll();
  }

  onWebContentsCreated(_event, contents) {
    this._downloads.attach(contents);
    this._browser.attachToWebContents(contents);
  }

  stopBackgroundServices() {
    this._backend.stopAll();
  }

  /**
   * Liga handlers em `app` + sinais do processo.
   * @param {Electron.App} app
   * @param {NodeJS.Process} [proc]
   */
  start(app, proc = process) {
    this.installEarly();

    app.on('web-contents-created', (event, contents) => {
      this.onWebContentsCreated(event, contents);
    });

    app.whenReady().then(() => this.whenReady());

    app.on('activate', () => {
      this.onActivate();
    });

    app.on('window-all-closed', () => {
      this.onAllWindowsClosed();
      if (process.platform !== 'darwin') app.quit();
    });

    app.on('before-quit', () => this.onBeforeQuit());
    app.on('will-quit', () => this.onWillQuit());

    proc.on('exit', () => this.stopBackgroundServices());
    proc.on('SIGINT', () => {
      this.stopBackgroundServices();
      proc.exit(0);
    });
    proc.on('SIGTERM', () => {
      this.stopBackgroundServices();
      proc.exit(0);
    });
  }
}

/**
 * @param {ConstructorParameters<typeof AppLifecycle>[0]} deps
 * @returns {AppLifecycle}
 */
function createAppLifecycle(deps) {
  const lifecycle = new AppLifecycle(deps);
  if (!isAppBootstrap(lifecycle)) {
    throw new Error('AppLifecycle não satisfaz IAppBootstrap');
  }
  return lifecycle;
}

module.exports = { AppLifecycle, createAppLifecycle };
