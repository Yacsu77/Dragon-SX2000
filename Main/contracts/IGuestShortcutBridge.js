'use strict';

/**
 * Contrato ISP — atalhos globais quando o foco está no guest (&lt;webview&gt;).
 *
 * @typedef {Object} IGuestShortcutBridge
 * @property {(hostWcId: number, combos: string[]) => void} setCombos
 * @property {(hostWcId: number, combos: string[]) => void} setHoldCombos
 * @property {(hostWcId: number) => void} clear
 * @property {(hostWcId: number) => Set<string>|undefined} getPressCombos
 * @property {(hostWcId: number) => Set<string>|undefined} getHoldCombos
 * @property {(input: object) => string} comboFromInput
 */

/**
 * @param {any} candidate
 * @returns {candidate is IGuestShortcutBridge}
 */
function isGuestShortcutBridge(candidate) {
  return (
    candidate &&
    typeof candidate.setCombos === 'function' &&
    typeof candidate.setHoldCombos === 'function' &&
    typeof candidate.clear === 'function' &&
    typeof candidate.getPressCombos === 'function' &&
    typeof candidate.getHoldCombos === 'function' &&
    typeof candidate.comboFromInput === 'function'
  );
}

module.exports = { isGuestShortcutBridge };
