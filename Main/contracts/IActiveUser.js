'use strict';

/**
 * Contrato ISP — perfil ativo e dados de usuário em disco.
 *
 * @typedef {Object} IActiveUser
 * @property {() => string|null} get
 * @property {(userId: string|null) => Promise<{ok:boolean,userId:string|null}>} set
 * @property {(userId: string) => Promise<string>} ensureDir
 * @property {(userId: string, dataUrl: string) => Promise<string>} saveAvatarDataUrl
 * @property {(userId: string) => Promise<{ok:boolean}>} deleteUserData
 * @property {() => Promise<string[]>} listKnownOrigins
 */

/**
 * @param {any} candidate
 * @returns {candidate is IActiveUser}
 */
function isActiveUser(candidate) {
  return (
    candidate &&
    typeof candidate.get === 'function' &&
    typeof candidate.set === 'function' &&
    typeof candidate.ensureDir === 'function' &&
    typeof candidate.saveAvatarDataUrl === 'function' &&
    typeof candidate.deleteUserData === 'function' &&
    typeof candidate.listKnownOrigins === 'function'
  );
}

module.exports = { isActiveUser };
