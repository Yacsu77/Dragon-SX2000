'use strict';

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

/**
 * PerfProbe — marcos de boot + snapshot de processos para o baseline da v1.5.
 *
 * Só fica ativo quando `DSX_PERF_OUT` aponta para um arquivo JSON de saída.
 * Sem a variável, todos os métodos são no-op (custo zero em produção).
 *
 * Usado por `scripts/perf/measure.js`. Ver Version/Planejamento/Metas de Desempenho v1.5.MD.
 *
 * Env:
 *  - DSX_PERF_OUT          caminho do JSON de saída (ativa o probe)
 *  - DSX_PERF_DURATION_MS  tempo ocioso após a janela carregar antes de coletar e sair (default 15000)
 *  - DSX_PERF_KEEP_ALIVE   "1" para não encerrar o app após coletar
 */
class PerfProbe {
  /**
   * @param {{ app: Electron.App, getChildPids?: () => Array<{ name: string, pid: number|null }> }} deps
   */
  constructor({ app, getChildPids }) {
    this._app = app;
    this._getChildPids = getChildPids || (() => []);
    this._outPath = process.env.DSX_PERF_OUT || null;
    this._durationMs = Number(process.env.DSX_PERF_DURATION_MS) || 15000;
    this._keepAlive = process.env.DSX_PERF_KEEP_ALIVE === '1';
    /** @type {Array<{ name: string, t: number, wall: number }>} */
    this._marks = [];
    this._collected = false;
    this._timer = null;
    if (this.enabled) this.mark('process-start', 0);
  }

  get enabled() {
    return Boolean(this._outPath);
  }

  /**
   * Registra um marco. `t` em ms desde o início do processo (performance.now()).
   * @param {string} name
   * @param {number} [t]
   */
  mark(name, t) {
    if (!this.enabled) return;
    const now = typeof t === 'number' ? t : performance.now();
    this._marks.push({ name: String(name), t: Math.round(now * 100) / 100, wall: Date.now() });
  }

  /**
   * Marcos enviados pelo renderer via IPC `perf:mark`.
   * @param {Electron.IpcMain} ipcMain
   */
  register(ipcMain) {
    if (!this.enabled) return;
    ipcMain.on('perf:mark', (_event, name) => {
      if (typeof name === 'string' && name.length <= 64) this.mark(`renderer:${name}`);
    });
  }

  /**
   * Liga os marcos de janela e agenda a coleta final.
   * @param {Electron.BrowserWindow} win
   */
  attachWindow(win) {
    if (!this.enabled || !win) return;
    this.mark('window-created');
    win.webContents.once('did-finish-load', () => {
      this.mark('window-did-finish-load');
      this._schedule();
    });
    win.once('ready-to-show', () => this.mark('window-ready-to-show'));
  }

  _schedule() {
    if (this._timer) return;
    this._timer = setTimeout(() => this.collect(), this._durationMs);
  }

  /** Coleta métricas e grava o JSON; encerra o app salvo DSX_PERF_KEEP_ALIVE=1. */
  collect() {
    if (!this.enabled || this._collected) return;
    this._collected = true;

    let appMetrics = [];
    try {
      appMetrics = this._app.getAppMetrics().map((m) => ({
        pid: m.pid,
        type: m.type,
        name: m.name || null,
        serviceName: m.serviceName || null,
        cpuPercent: m.cpu ? Math.round(m.cpu.percentCPUUsage * 100) / 100 : null,
        workingSetKB: m.memory ? m.memory.workingSetSize : null,
        peakWorkingSetKB: m.memory ? m.memory.peakWorkingSetSize : null,
        privateKB: m.memory ? m.memory.privateBytes || null : null,
      }));
    } catch (_) {
      /* ignore */
    }

    const mainMem = process.memoryUsage();
    const payload = {
      version: 1,
      collectedAt: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      node: process.versions.node,
      chrome: process.versions.chrome,
      packaged: Boolean(this._app.isPackaged),
      durationMs: this._durationMs,
      marks: this._marks,
      main: {
        pid: process.pid,
        rssKB: Math.round(mainMem.rss / 1024),
        heapUsedKB: Math.round(mainMem.heapUsed / 1024),
      },
      children: this._getChildPids(),
      appMetrics,
    };

    try {
      fs.mkdirSync(path.dirname(this._outPath), { recursive: true });
      fs.writeFileSync(this._outPath, JSON.stringify(payload, null, 2));
      console.log(`[PerfProbe] métricas gravadas em ${this._outPath}`);
    } catch (err) {
      console.error('[PerfProbe] falha ao gravar métricas:', err.message);
    }

    if (!this._keepAlive) {
      setTimeout(() => this._app.quit(), 50);
    }
  }
}

/**
 * @param {ConstructorParameters<typeof PerfProbe>[0]} deps
 */
function createPerfProbe(deps) {
  return new PerfProbe(deps);
}

module.exports = { PerfProbe, createPerfProbe };
