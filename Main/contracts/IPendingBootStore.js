'use strict';

/**
 * Contrato ISP — pending URL/tab/boot por webContents.id (multi-janela).
 *
 * @typedef {{ userId: string|null, cleanSession: boolean }} PendingBootPayload
 *
 * @typedef {Object} IPendingBootStore
 * @property {(wcId: number, url: string) => void} setUrl
 * @property {(wcId: number, tab: object) => void} setTab
 * @property {(wcId: number, boot: PendingBootPayload) => void} setBoot
 * @property {(wcId: number) => string|null} consumeUrl
 * @property {(wcId: number) => object|null} consumeTab
 * @property {(wcId: number) => PendingBootPayload|null} consumeBoot
 * @property {(wcId: number) => void} clear
 */

/**
 * @param {any} candidate
 * @returns {candidate is IPendingBootStore}
 */
function isPendingBootStore(candidate) {
  return (
    candidate &&
    typeof candidate.setUrl === 'function' &&
    typeof candidate.setTab === 'function' &&
    typeof candidate.setBoot === 'function' &&
    typeof candidate.consumeUrl === 'function' &&
    typeof candidate.consumeTab === 'function' &&
    typeof candidate.consumeBoot === 'function' &&
    typeof candidate.clear === 'function'
  );
}

module.exports = { isPendingBootStore };
