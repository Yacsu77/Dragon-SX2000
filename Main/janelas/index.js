'use strict';

/**
 * Main/janelas — multi-window IPC, drop registry, drag ghost.
 *
 * Contratos: ITabsDropRegistry | IDragGhost | IJanelasIpcRegistrar
 * Ver: Version/Docs/MainProcess.md (Fase 4)
 */

const {
  createTabsDropRegistry,
  TabsDropRegistry,
} = require('./TabsDropRegistry');
const { createDragGhost, DragGhost } = require('./DragGhost');
const { createJanelasIpc, JanelasIpc } = require('./JanelasIpc');
const { JanelasServices } = require('./JanelasServices');

/**
 * @param {{
 *   BrowserWindow: typeof import('electron').BrowserWindow,
 *   screen: Electron.Screen,
 *   windows: import('../windows/WindowServices').WindowServices,
 *   getActiveUserId: () => string|null,
 *   isAllowedNavigationUrl: (url: string) => boolean,
 * }} options
 * @returns {JanelasServices}
 */
function createJanelasServices(options) {
  const dragGhost = createDragGhost({
    BrowserWindow: options.BrowserWindow,
    screen: options.screen,
  });
  const dropRegistry = createTabsDropRegistry({
    BrowserWindow: options.BrowserWindow,
    screen: options.screen,
    isGhostWindow: (win) => dragGhost.isGhostWindow(win),
  });
  const ipc = createJanelasIpc({
    BrowserWindow: options.BrowserWindow,
    screen: options.screen,
    windows: options.windows,
    dropRegistry,
    dragGhost,
    getActiveUserId: options.getActiveUserId,
    isAllowedNavigationUrl: options.isAllowedNavigationUrl,
  });
  return new JanelasServices({ dropRegistry, dragGhost, ipc });
}

module.exports = {
  createJanelasServices,
  JanelasServices,
  TabsDropRegistry,
  createTabsDropRegistry,
  DragGhost,
  createDragGhost,
  JanelasIpc,
  createJanelasIpc,
};
