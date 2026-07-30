'use strict';

const { isJanelasIpcRegistrar } = require('../contracts/IJanelasIpcRegistrar');

/**
 * JanelasIpc — registra canais IPC de multi-janela / drag / ghost.
 *
 * Depende (DIP): WindowServices, ITabsDropRegistry, IDragGhost, getters.
 * Não faz: spawn de backend, UA, wallpaper.
 *
 * @implements {import('../contracts/IJanelasIpcRegistrar').IJanelasIpcRegistrar}
 */
class JanelasIpc {
  /**
   * @param {{
   *   BrowserWindow: typeof import('electron').BrowserWindow,
   *   screen: Electron.Screen,
   *   windows: import('../windows/WindowServices').WindowServices,
   *   dropRegistry: import('./TabsDropRegistry').TabsDropRegistry,
   *   dragGhost: import('./DragGhost').DragGhost,
   *   getActiveUserId: () => string|null,
   *   isAllowedNavigationUrl: (url: string) => boolean,
   * }} deps
   */
  constructor(deps) {
    this._deps = deps;
    this._registered = false;
  }

  register(ipcMain) {
    if (this._registered) return;
    this._registered = true;

    const {
      BrowserWindow,
      screen,
      windows,
      dropRegistry,
      dragGhost,
      getActiveUserId,
      isAllowedNavigationUrl,
    } = this._deps;

    const sanitizeTab = (snapshot) =>
      windows.sanitizeTab(snapshot, isAllowedNavigationUrl);

    ipcMain.handle('cursor:create-window', async (_event, { url, userId } = {}) => {
      if (!url || typeof url !== 'string' || !isAllowedNavigationUrl(url)) {
        return { ok: false, error: 'invalid-url' };
      }
      try {
        windows.create({
          url,
          userId: userId || getActiveUserId() || null,
          cleanSession: true,
        });
        return { ok: true };
      } catch (err) {
        console.error('[CursorControll] falha ao criar janela:', err);
        return { ok: false, error: 'window-failed' };
      }
    });

    ipcMain.handle('cursor:consume-pending-url', (event) => {
      return windows.consumePendingUrl(event.sender.id);
    });

    ipcMain.handle(
      'janelas:create-with-tab',
      async (_event, { snapshot, userId } = {}) => {
        const tab = sanitizeTab(snapshot);
        if (!tab) {
          return { ok: false, error: 'invalid-snapshot' };
        }
        try {
          windows.create({
            tab,
            userId: userId || getActiveUserId() || null,
            cleanSession: true,
          });
          return { ok: true };
        } catch (err) {
          console.error('[Janelas] falha ao criar janela com aba:', err);
          return { ok: false, error: 'window-failed' };
        }
      }
    );

    ipcMain.handle('janelas:consume-pending-tab', (event) => {
      return windows.consumePendingTab(event.sender.id);
    });

    ipcMain.handle('janelas:consume-pending-boot', (event) => {
      return windows.consumePendingBoot(event.sender.id);
    });

    ipcMain.on('janelas:report-tabs-bounds', (event, bounds) => {
      dropRegistry.report(event.sender.id, bounds);
    });

    ipcMain.handle('janelas:resolve-drop-target', (event) => {
      return dropRegistry.resolveTarget(event.sender.id);
    });

    ipcMain.on('janelas:drag-hover', (event, payload = {}) => {
      const targetWindowId = Number(payload.targetWindowId);
      if (!Number.isFinite(targetWindowId)) {
        dropRegistry.broadcastIndicator(null, null);
        return;
      }
      if (targetWindowId === event.sender.id) {
        dropRegistry.broadcastIndicator(null, null);
        return;
      }
      dropRegistry.broadcastIndicator(targetWindowId, payload.screenX);
    });

    ipcMain.on('janelas:drag-hover-clear', () => {
      dropRegistry.broadcastIndicator(null, null);
    });

    ipcMain.handle(
      'janelas:move-tab',
      async (event, { targetWindowId, snapshot } = {}) => {
        const tab = sanitizeTab(snapshot);
        if (!tab) {
          return { ok: false, error: 'invalid-snapshot' };
        }

        const targetId = Number(targetWindowId);
        if (!Number.isFinite(targetId)) {
          return { ok: false, error: 'invalid-target' };
        }

        if (targetId === event.sender.id) {
          return { ok: false, error: 'same-window' };
        }

        const target = BrowserWindow.getAllWindows().find(
          (w) => !w.isDestroyed() && w.webContents.id === targetId
        );
        if (!target) {
          return { ok: false, error: 'target-gone' };
        }

        try {
          target.webContents.send('janelas:receive-tab', tab);
          if (!target.isDestroyed()) {
            if (target.isMinimized()) target.restore();
            target.focus();
          }
          return { ok: true };
        } catch (err) {
          console.error('[Janelas] falha ao mover aba:', err);
          return { ok: false, error: 'send-failed' };
        }
      }
    );

    ipcMain.on('janelas:drag-ghost-start', (_event, payload = {}) => {
      dragGhost.start(payload);
    });

    ipcMain.on('janelas:drag-ghost-update', (_event, payload = {}) => {
      dragGhost.update(payload);
    });

    ipcMain.on('janelas:drag-ghost-end', () => {
      dragGhost.end();
    });

    ipcMain.handle('janelas:get-cursor-screen-point', () => {
      return screen.getCursorScreenPoint();
    });
  }
}

function createJanelasIpc(deps) {
  const ipc = new JanelasIpc(deps);
  if (!isJanelasIpcRegistrar(ipc)) {
    throw new Error('JanelasIpc não satisfaz IJanelasIpcRegistrar');
  }
  return ipc;
}

module.exports = { JanelasIpc, createJanelasIpc };
