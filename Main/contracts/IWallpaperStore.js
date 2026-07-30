'use strict';

/**
 * Contrato ISP — persistência de wallpaper por usuário.
 *
 * @typedef {Object} IWallpaperStore
 * @property {(userId: string) => Promise<object|null>} readState
 * @property {(userId: string, state: object) => Promise<boolean>} saveState
 * @property {(opts: {sourcePath:string,type?:string,userId?:string}) => Promise<string>} importFile
 * @property {(opts: {dataUrl:string,userId?:string}) => Promise<string>} importDataUrl
 * @property {(opts: {buffer:any,ext?:string,userId?:string}) => Promise<string>} importBlob
 * @property {(userId?: string) => Promise<object>} seedDefault
 */

/**
 * @param {any} candidate
 * @returns {candidate is IWallpaperStore}
 */
function isWallpaperStore(candidate) {
  return (
    candidate &&
    typeof candidate.readState === 'function' &&
    typeof candidate.saveState === 'function' &&
    typeof candidate.importFile === 'function' &&
    typeof candidate.importDataUrl === 'function' &&
    typeof candidate.importBlob === 'function' &&
    typeof candidate.seedDefault === 'function'
  );
}

module.exports = { isWallpaperStore };
