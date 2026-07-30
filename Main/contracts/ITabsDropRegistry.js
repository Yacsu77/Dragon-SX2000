'use strict';

/**
 * Contrato ISP — bounds da barra de abas por janela (drop target).
 *
 * @typedef {{ x: number, y: number, width: number, height: number }} TabsBounds
 * @typedef {{ windowId: number, zone: string, screenX: number, screenY: number }} DropTarget
 *
 * @typedef {Object} ITabsDropRegistry
 * @property {(hostWcId: number, bounds: TabsBounds) => void} report
 * @property {(hostWcId: number) => void} clear
 * @property {(sourceWcId: number) => DropTarget|null} resolveTarget
 * @property {(targetWindowId: number|null, screenX?: number|null) => void} broadcastIndicator
 */

/**
 * @param {any} candidate
 * @returns {candidate is ITabsDropRegistry}
 */
function isTabsDropRegistry(candidate) {
  return (
    candidate &&
    typeof candidate.report === 'function' &&
    typeof candidate.clear === 'function' &&
    typeof candidate.resolveTarget === 'function' &&
    typeof candidate.broadcastIndicator === 'function'
  );
}

module.exports = { isTabsDropRegistry };
