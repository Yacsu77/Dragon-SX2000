'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Resolve o caminho do binário nowplaying-cli.
 * Ordem: opts.binary → bundled em Backend/SDK/bin → PATH.
 */
function resolveNowPlayingCliBinary(opts = {}) {
  if (opts.binary) return opts.binary;
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const bundled = path.join(__dirname, '..', '..', 'bin', `darwin-${arch}`, 'nowplaying-cli');
  if (fs.existsSync(bundled)) return bundled;
  return 'nowplaying-cli';
}

function probeNowPlayingCliBinary(binary) {
  return new Promise((resolve) => {
    try {
      const proc = spawn(binary, ['--help']);
      proc.on('error', () => resolve(false));
      proc.on('exit', (code) => resolve(code === 0 || code === 1));
    } catch (_) {
      resolve(false);
    }
  });
}

function runNowPlayingCliCommand(binary, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(binary, args);
    let err = '';
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code !== 0) return reject(new Error(err.trim() || `exit ${code}`));
      resolve();
    });
  });
}

module.exports = {
  resolveNowPlayingCliBinary,
  probeNowPlayingCliBinary,
  runNowPlayingCliCommand,
};
