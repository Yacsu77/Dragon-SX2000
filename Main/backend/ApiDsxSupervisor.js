'use strict';

const path = require('path');
const http = require('http');
const { spawn, execFile } = require('child_process');
const { isProcessSupervisor } = require('../contracts/IProcessSupervisor');
const { isApiProbe } = require('../contracts/IApiProbe');

/**
 * ApiDsxSupervisor — spawn/stop + probe da API-DSX (http://127.0.0.1:3333).
 *
 * Implementa IProcessSupervisor e IApiProbe no mesmo objeto (cliente pode
 * depender só de um dos contratos — ISP no uso, não na classe).
 *
 * Não faz: Media SDK, wallpaper, IPC de UI.
 *
 * @implements {import('../contracts/IProcessSupervisor').IProcessSupervisor}
 * @implements {import('../contracts/IApiProbe').IApiProbe}
 */
class ApiDsxSupervisor {
  /**
   * @param {{
   *   paths: import('./PathResolver').PathResolver,
   *   app: Electron.App,
   *   getIsQuitting?: () => boolean,
   * }} deps
   */
  constructor({ paths, app, getIsQuitting }) {
    if (!paths || !app) {
      throw new Error('ApiDsxSupervisor: paths e app são obrigatórios');
    }
    this._paths = paths;
    this._app = app;
    this._getIsQuitting =
      typeof getIsQuitting === 'function' ? getIsQuitting : () => false;

    /** @type {import('child_process').ChildProcess|null} */
    this._process = null;
    this._restartAttempt = 0;
    /** @type {Promise<void>|null} */
    this._startInFlight = null;
  }

  isRunning() {
    return Boolean(this._process);
  }

  /**
   * @param {string} urlPath
   * @param {number} [timeoutMs]
   */
  _httpGetJson(urlPath, timeoutMs = 1500) {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:3333${urlPath}`, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode, json });
        });
      });

      req.on('error', () => resolve(null));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve(null);
      });
    });
  }

  _isSameApiProject(payload) {
    const incoming = path.resolve(payload?.project_root || '');
    const expected = this._paths.expectedProjectRoot();
    if (incoming === expected) return true;
    // Compat: API antiga reportava o root do repo / asar
    if (incoming === this._paths.getProjectRoot()) return true;
    if (
      this._app.isPackaged &&
      incoming.startsWith(path.resolve(process.resourcesPath))
    ) {
      return true;
    }
    return false;
  }

  _isApiFromCurrentProject(payload) {
    // Exigir feature recente força restart de instâncias antigas sem rotas novas.
    if (!payload?.success || !payload?.features?.includes?.('smart-suggestions')) {
      return false;
    }
    return this._isSameApiProject(payload);
  }

  /** @returns {Promise<'ready'|'starting'|'stale'|'down'>} */
  async probe() {
    const ready = await this._httpGetJson('/ready');
    if (ready?.json) {
      if (ready.status === 200 && ready.json.success) {
        return this._isApiFromCurrentProject(ready.json) ? 'ready' : 'stale';
      }

      if (
        ready.json.starting === true &&
        this._isSameApiProject(ready.json) &&
        Array.isArray(ready.json.features) &&
        ready.json.features.includes('smart-suggestions')
      ) {
        return 'starting';
      }
    }

    const users = await this._httpGetJson('/users');
    if (users && users.status === 200 && users.json?.success === true) {
      return 'stale';
    }

    const health = await this._httpGetJson('/health');
    if (health && health.status === 200 && health.json?.starting !== true) {
      return 'stale';
    }

    return 'down';
  }

  _freePort3333() {
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        execFile(
          'cmd',
          [
            '/c',
            'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :3333 ^| findstr LISTENING\') do taskkill /F /PID %a',
          ],
          { windowsHide: true },
          () => resolve()
        );
        return;
      }

      execFile('lsof', ['-ti', 'tcp:3333'], (err, stdout) => {
        if (err || !stdout) {
          resolve();
          return;
        }
        const pids = String(stdout)
          .split(/\s+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (!pids.length) {
          resolve();
          return;
        }
        execFile('kill', ['-TERM', ...pids], () => {
          setTimeout(() => {
            execFile('kill', ['-KILL', ...pids], () => resolve());
          }, 400);
        });
      });
    });
  }

  async waitUntilReady(timeoutMs = 90000) {
    const started = Date.now();
    let lastStatus = 'down';
    while (Date.now() - started < timeoutMs) {
      const status = await this.probe();
      lastStatus = status;
      if (status === 'ready') return true;
      const delay = status === 'starting' ? 350 : 500;
      await new Promise((r) => setTimeout(r, delay));
    }
    console.warn(
      `[API-DSX] waitForApiReady esgotou (último status=${lastStatus})`
    );
    return false;
  }

  start() {
    if (this._startInFlight) return this._startInFlight;
    this._startInFlight = this._startInner().finally(() => {
      this._startInFlight = null;
    });
    return this._startInFlight;
  }

  async _startInner() {
    if (this._process) {
      await this.waitUntilReady(90000);
      return;
    }

    const status = await this.probe();
    if (status === 'ready') {
      console.log('[API-DSX] já em execução (pronta) em http://localhost:3333');
      this._restartAttempt = 0;
      return;
    }

    if (status === 'starting') {
      console.log('[API-DSX] já em execução (inicializando)…');
      const ready = await this.waitUntilReady(90000);
      if (ready) {
        console.log('[API-DSX] pronta em http://localhost:3333');
        this._restartAttempt = 0;
      } else {
        console.warn('[API-DSX] ainda não respondeu /ready a tempo');
      }
      return;
    }

    if (status === 'stale') {
      console.warn('[API-DSX] instância antiga detectada. Reiniciando…');
    }

    // Liberar porta: sockets zumbis deixam probe "down" mas bloqueiam listen.
    await this._freePort3333();
    await new Promise((r) => setTimeout(r, 500));

    // boot.js materializa arquivos antes do require (evita ETIMEDOUT iCloud).
    const apiRoot = this._paths.resolve('API-DSX');
    const apiEntry = path.join(apiRoot, 'boot.js');

    try {
      this._process = spawn(process.execPath, [apiEntry], {
        cwd: apiRoot,
        env: this._paths.childEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      this._process.stdout.on('data', (chunk) => {
        process.stdout.write(`[API-DSX] ${chunk}`);
      });
      this._process.stderr.on('data', (chunk) => {
        process.stderr.write(`[API-DSX] ${chunk}`);
      });
      this._process.on('exit', (code, signal) => {
        console.log(
          `[API-DSX] processo encerrado (code=${code} signal=${signal})`
        );
        this._process = null;

        if (!this._getIsQuitting() && code !== 0) {
          this._restartAttempt += 1;
          const delay = Math.min(
            2000 * 2 ** Math.min(this._restartAttempt - 1, 4),
            30000
          );
          console.warn(
            `[API-DSX] reinício em ${delay}ms (tentativa ${this._restartAttempt})` +
              (code === 1
                ? ' — se o erro for ETIMEDOUT, o projeto pode estar em pasta iCloud/Desktop ainda hidratando'
                : '')
          );
          setTimeout(() => {
            this.start();
          }, delay);
        }
      });
      this._process.on('error', (err) => {
        console.error('[API-DSX] falha ao iniciar:', err.message);
        this._process = null;
      });

      console.log(`[API-DSX] iniciando em ${apiEntry}`);
    } catch (err) {
      console.error('[API-DSX] exceção ao iniciar:', err);
      this._process = null;
    }

    const ready = await this.waitUntilReady(90000);
    if (ready) {
      console.log('[API-DSX] pronta em http://localhost:3333');
      this._restartAttempt = 0;
    } else {
      console.warn('[API-DSX] ainda não respondeu /ready a tempo');
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
 * @param {{
 *   paths: import('./PathResolver').PathResolver,
 *   app: Electron.App,
 *   getIsQuitting?: () => boolean,
 * }} deps
 */
function createApiDsxSupervisor(deps) {
  const supervisor = new ApiDsxSupervisor(deps);
  if (!isProcessSupervisor(supervisor) || !isApiProbe(supervisor)) {
    throw new Error('ApiDsxSupervisor não satisfaz IProcessSupervisor/IApiProbe');
  }
  return supervisor;
}

module.exports = { ApiDsxSupervisor, createApiDsxSupervisor };
