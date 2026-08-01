'use strict';

const path = require('path');
const { spawn } = require('child_process');
const { isProcessSupervisor } = require('../contracts/IProcessSupervisor');

/**
 * MediaSdkSupervisor — sobe/para o Dragon Media SDK (ws://127.0.0.1:8974).
 *
 * Por quê processo separado: binding nativo SMTC não bloqueia o renderer;
 * crash/restart isolados; mesmo protocolo que clientes externos.
 *
 * Não faz: healthcheck HTTP, API-DSX, IPC de UI.
 *
 * @implements {import('../contracts/IProcessSupervisor').IProcessSupervisor}
 */
class MediaSdkSupervisor {
  /**
   * @param {{ paths: import('./PathResolver').PathResolver }} deps
   */
  constructor({ paths }) {
    if (!paths) throw new Error('MediaSdkSupervisor: paths obrigatório');
    this._paths = paths;
    /** @type {import('child_process').ChildProcess|null} */
    this._process = null;
  }

  isRunning() {
    return Boolean(this._process);
  }

  start() {
    if (this._process) return;

    const sdkRoot = this._paths.resolve('SDK');
    const sdkEntry = path.join(sdkRoot, 'server.js');

    try {
      this._process = spawn(process.execPath, [sdkEntry], {
        cwd: sdkRoot,
        env: this._paths.childEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      this._process.stdout.on('data', (chunk) => {
        process.stdout.write(`[SDK] ${chunk}`);
      });
      this._process.stderr.on('data', (chunk) => {
        process.stderr.write(`[SDK] ${chunk}`);
      });
      this._process.on('exit', (code, signal) => {
        console.log(`[SDK] processo encerrado (code=${code} signal=${signal})`);
        this._process = null;
      });
      this._process.on('error', (err) => {
        console.error('[SDK] falha ao iniciar:', err.message);
        this._process = null;
      });

      console.log(`[SDK] iniciando em ${sdkEntry}`);
    } catch (err) {
      console.error('[SDK] exceção ao iniciar:', err);
      this._process = null;
    }
  }

  stop() {
    if (!this._process) return;
    try {
      this._process.kill('SIGTERM');
    } catch (_) {
      /* ignore */
    }
    this._process = null;
  }
}

/**
 * @param {{ paths: import('./PathResolver').PathResolver }} deps
 */
function createMediaSdkSupervisor(deps) {
  const supervisor = new MediaSdkSupervisor(deps);
  if (!isProcessSupervisor(supervisor)) {
    throw new Error('MediaSdkSupervisor não satisfaz IProcessSupervisor');
  }
  return supervisor;
}

module.exports = { MediaSdkSupervisor, createMediaSdkSupervisor };
