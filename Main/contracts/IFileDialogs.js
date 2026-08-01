'use strict';

/**
 * Contrato ISP — listagem/diálogos de arquivos (sem lógica de wallpaper/user).
 *
 * @typedef {{ name: string, isDirectory: boolean, path: string }} DirEntry
 *
 * @typedef {Object} IFileDialogs
 * @property {(dirPath: string) => Promise<DirEntry[]>} readDir
 * @property {() => string} getHome
 * @property {() => Promise<string|null>} pickFolder
 */

/**
 * @param {any} candidate
 * @returns {candidate is IFileDialogs}
 */
function isFileDialogs(candidate) {
  return (
    candidate &&
    typeof candidate.readDir === 'function' &&
    typeof candidate.getHome === 'function' &&
    typeof candidate.pickFolder === 'function'
  );
}

module.exports = { isFileDialogs };
