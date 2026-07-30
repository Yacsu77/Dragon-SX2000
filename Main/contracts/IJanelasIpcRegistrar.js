'use strict';

/**
 * Contrato ISP — registra handlers IPC do domínio Janelas.
 * Main só chama register(ipcMain); não conhece canais individuais.
 *
 * @typedef {Object} IJanelasIpcRegistrar
 * @property {(ipcMain: Electron.IpcMain) => void} register
 */

/**
 * @param {any} candidate
 * @returns {candidate is IJanelasIpcRegistrar}
 */
function isJanelasIpcRegistrar(candidate) {
  return candidate && typeof candidate.register === 'function';
}

module.exports = { isJanelasIpcRegistrar };
