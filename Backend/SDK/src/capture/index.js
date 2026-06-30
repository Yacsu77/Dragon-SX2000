'use strict';

const os = require('os');

const WindowsCapture = require('./WindowsCapture');
const MacOSCapture = require('./MacOSCapture');
const LinuxCapture = require('./LinuxCapture');
const NullCapture = require('./NullCapture');

/**
 * Fábrica que retorna o capturador adequado para a plataforma atual.
 *
 * @param {object} [opts]
 * @param {string} [opts.forcePlatform] Força uma plataforma específica
 *   ('win32' | 'darwin' | 'linux' | 'null'). Útil para testes.
 * @param {object} [opts.logger]
 * @param {number} [opts.pollIntervalMs]
 */
function createCaptureForPlatform(opts = {}) {
  const platform = opts.forcePlatform || os.platform();

  switch (platform) {
    case 'win32':
      return new WindowsCapture(opts);
    case 'darwin':
      return new MacOSCapture(opts);
    case 'linux':
      return new LinuxCapture(opts);
    case 'null':
    default:
      return new NullCapture(opts);
  }
}

module.exports = {
  createCaptureForPlatform,
  WindowsCapture,
  MacOSCapture,
  LinuxCapture,
  NullCapture,
};
