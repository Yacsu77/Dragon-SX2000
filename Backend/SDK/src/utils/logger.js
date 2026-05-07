'use strict';

/**
 * Logger simples e padronizado do Dragon Media SDK.
 * Todos os logs ganham um prefixo `[Dragon Media SDK]` com tag de subsistema
 * para facilitar debugging quando rodando junto do Electron/Backend.
 */

const LEVELS = Object.freeze({
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  SILENT: 100,
});

let currentLevel = LEVELS.INFO;

function setLevel(level) {
  if (typeof level === 'string') {
    const upper = level.toUpperCase();
    if (LEVELS[upper] !== undefined) {
      currentLevel = LEVELS[upper];
      return;
    }
  }
  if (typeof level === 'number') {
    currentLevel = level;
  }
}

function format(tag, ...args) {
  return [`[Dragon Media SDK]${tag ? ` [${tag}]` : ''}`, ...args];
}

function createLogger(tag = '') {
  return {
    debug: (...args) => {
      if (currentLevel <= LEVELS.DEBUG) console.debug(...format(tag, ...args));
    },
    info: (...args) => {
      if (currentLevel <= LEVELS.INFO) console.info(...format(tag, ...args));
    },
    warn: (...args) => {
      if (currentLevel <= LEVELS.WARN) console.warn(...format(tag, ...args));
    },
    error: (...args) => {
      if (currentLevel <= LEVELS.ERROR) console.error(...format(tag, ...args));
    },
    child: (subTag) => createLogger(tag ? `${tag}/${subTag}` : subTag),
  };
}

module.exports = {
  LEVELS,
  setLevel,
  createLogger,
};
