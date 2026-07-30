'use strict';

const { Menu } = require('electron');

/**
 * ApplicationMenu — remove aceleradores globais do menu no Win/Linux
 * para o ShortcutManager do renderer ser a única fonte.
 *
 * No macOS mantém o menu padrão (Cmd+C/V/etc.).
 */
function setupApplicationMenu() {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
  }
}

module.exports = { setupApplicationMenu };
