'use strict';

const { isTabsDropRegistry } = require('../contracts/ITabsDropRegistry');

/**
 * TabsDropRegistry — bounds reportados + resolve de drop entre janelas.
 *
 * Não faz: ghost window, createBrowserWindow, wallpaper.
 *
 * @implements {import('../contracts/ITabsDropRegistry').ITabsDropRegistry}
 */
class TabsDropRegistry {
  /**
   * @param {{
   *   BrowserWindow: typeof import('electron').BrowserWindow,
   *   screen: Electron.Screen,
   *   isGhostWindow?: (win: Electron.BrowserWindow) => boolean,
   * }} deps
   */
  constructor({ BrowserWindow, screen, isGhostWindow }) {
    this._BrowserWindow = BrowserWindow;
    this._screen = screen;
    this._isGhostWindow = isGhostWindow || (() => false);
    /** @type {Map<number, { x: number, y: number, width: number, height: number }>} */
    this._bounds = new Map();
  }

  report(hostWcId, bounds) {
    if (
      hostWcId == null ||
      !bounds ||
      typeof bounds.x !== 'number' ||
      typeof bounds.y !== 'number' ||
      typeof bounds.width !== 'number' ||
      typeof bounds.height !== 'number'
    ) {
      return;
    }
    this._bounds.set(hostWcId, {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    });
  }

  clear(hostWcId) {
    this._bounds.delete(hostWcId);
  }

  _pointInBounds(x, y, b) {
    return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
  }

  resolveTarget(sourceWcId) {
    const point = this._screen.getCursorScreenPoint();

    for (const win of this._BrowserWindow.getAllWindows()) {
      if (!win || win.isDestroyed()) continue;
      if (this._isGhostWindow(win)) continue;

      const id = win.webContents.id;
      if (id === sourceWcId) continue;

      const reported = this._bounds.get(id);
      if (reported && this._pointInBounds(point.x, point.y, reported)) {
        return {
          windowId: id,
          zone: 'tabs',
          screenX: point.x,
          screenY: point.y,
        };
      }

      // Fallback: faixa superior do content (nav + abas)
      try {
        const content = win.getContentBounds();
        const tabsZone = {
          x: content.x,
          y: content.y,
          width: content.width,
          height: Math.min(160, Math.max(84, Math.round(content.height * 0.18))),
        };
        if (this._pointInBounds(point.x, point.y, tabsZone)) {
          return {
            windowId: id,
            zone: 'tabs',
            screenX: point.x,
            screenY: point.y,
          };
        }
      } catch (_) {
        /* ignore */
      }
    }

    return null;
  }

  broadcastIndicator(targetWindowId, screenX) {
    for (const win of this._BrowserWindow.getAllWindows()) {
      if (!win || win.isDestroyed()) continue;
      const id = win.webContents.id;
      try {
        if (targetWindowId && id === targetWindowId) {
          win.webContents.send('janelas:drop-indicator', {
            show: true,
            screenX: screenX || null,
          });
        } else {
          win.webContents.send('janelas:drop-indicator', { show: false });
        }
      } catch (_) {
        /* ignore */
      }
    }
  }
}

function createTabsDropRegistry(deps) {
  const registry = new TabsDropRegistry(deps);
  if (!isTabsDropRegistry(registry)) {
    throw new Error('TabsDropRegistry não satisfaz ITabsDropRegistry');
  }
  return registry;
}

module.exports = { TabsDropRegistry, createTabsDropRegistry };
