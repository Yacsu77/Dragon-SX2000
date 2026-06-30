'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const BaseController = require('./BaseController');

const HELPER_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'windows-smtc-control.ps1');

/**
 * Controlador de mídia para Windows via SMTC (System Media Transport Controls).
 *
 * Usa TryPlayAsync / TrySkipNextAsync etc. — mesma API WinRT que o capturador
 * SMTC lê — em vez de keybd_event, que não funciona de processos filhos
 * do Electron em background.
 */
class WindowsController extends BaseController {
  constructor(opts = {}) {
    super(opts);
    this._proc = null;
    this._restarting = false;
    this._scriptPath = opts.scriptPath || HELPER_SCRIPT;
    this._pending = null;
    this._stdoutBuffer = '';
    this._onStdoutData = (chunk) => this._handleStdout(chunk);
  }

  async start() {
    if (this._proc) return;
    if (!fs.existsSync(this._scriptPath)) {
      this.logger?.warn?.(`Script SMTC não encontrado: ${this._scriptPath}`);
      this.ready = false;
      return;
    }
    await this._spawnHelper();
  }

  async stop() {
    this.ready = false;
    if (this._pending) {
      this._pending.resolve({ ok: false, error: 'controller_stopped' });
      this._pending = null;
    }
    if (this._proc) {
      try {
        if (this._proc.stdout) this._proc.stdout.off('data', this._onStdoutData);
        if (this._proc.stdin && !this._proc.stdin.destroyed) {
          this._proc.stdin.write('exit\n');
          this._proc.stdin.end();
        }
        this._proc.kill();
      } catch (_) { /* ignore */ }
      this._proc = null;
    }
  }

  _spawnHelper() {
    return new Promise((resolve) => {
      let proc;
      try {
        proc = spawn('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy', 'Bypass',
          '-File', this._scriptPath,
          '-Server',
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
        });
      } catch (err) {
        this.logger?.error?.('Não foi possível iniciar helper SMTC:', err.message);
        this.ready = false;
        resolve(false);
        return;
      }

      let bootstrapped = false;
      const bootTimeout = setTimeout(() => {
        if (!bootstrapped) {
          this.logger?.warn?.('Helper SMTC não respondeu a tempo');
          this.ready = false;
          resolve(false);
        }
      }, 15000);

      proc.on('error', (err) => {
        this.logger?.warn?.('Erro no helper SMTC:', err.message);
      });

      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString().trim();
        if (text) this.logger?.debug?.('[SMTC stderr]', text);
      });

      proc.stdout.on('data', this._onStdoutData);

      proc.on('exit', (code, signal) => {
        this.logger?.warn?.(`Helper SMTC encerrado (code=${code} signal=${signal})`);
        if (this._pending) {
          this._pending.resolve({ ok: false, error: 'helper_exited' });
          this._pending = null;
        }
        this._proc = null;
        if (this.ready && !this._restarting) {
          this._restarting = true;
          setTimeout(async () => {
            this._restarting = false;
            if (this.ready) await this._spawnHelper();
          }, 500);
        }
      });

      this._proc = proc;
      this._stdoutBuffer = '';

      this._bootResolve = (ok) => {
        if (bootstrapped) return;
        bootstrapped = true;
        clearTimeout(bootTimeout);
        this.ready = ok;
        if (ok) this.logger?.info?.('Helper SMTC (Windows) iniciado');
        resolve(ok);
      };
    });
  }

  _handleStdout(chunk) {
    this._stdoutBuffer += chunk.toString();
    const lines = this._stdoutBuffer.split(/\r?\n/);
    this._stdoutBuffer = lines.pop() || '';

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      this.logger?.debug?.('[SMTC stdout]', line);

      if (line === 'ready' && this._bootResolve) {
        this._bootResolve(true);
        this._bootResolve = null;
        continue;
      }

      if (!this._pending) continue;

      const { action } = this._pending;
      if (line === `ok:${action}`) {
        const { resolve } = this._pending;
        this._pending = null;
        clearTimeout(this._pendingTimer);
        resolve({ ok: true, action });
      } else if (line.startsWith(`fail:${action}`)) {
        const errMsg = line.slice(`fail:${action}`.length).trim() || 'command_failed';
        const { resolve } = this._pending;
        this._pending = null;
        clearTimeout(this._pendingTimer);
        resolve({ ok: false, error: errMsg, action });
      }
    }
  }

  async send(action) {
    const norm = this._normalize(action);
    if (!norm) {
      this.logger?.warn?.(`comando inválido: '${action}'`);
      return { ok: false, error: 'invalid_action' };
    }

    if (this._pending) {
      return { ok: false, error: 'command_in_progress' };
    }

    if (!this.ready || !this._proc || !this._proc.stdin || this._proc.stdin.destroyed) {
      this.logger?.warn?.('Helper SMTC não disponível, tentando reiniciar');
      await this._spawnHelper();
      if (!this.ready || !this._proc) return { ok: false, error: 'helper_unavailable' };
    }

    return new Promise((resolve) => {
      this._pending = { action: norm, resolve };
      this._pendingTimer = setTimeout(() => {
        if (this._pending && this._pending.action === norm) {
          this._pending = null;
          resolve({ ok: false, error: 'command_timeout', action: norm });
        }
      }, 10000);

      try {
        this._proc.stdin.write(`${norm}\n`);
        this.logger?.info?.(`▶ executando '${norm}' via SMTC`);
      } catch (err) {
        clearTimeout(this._pendingTimer);
        this._pending = null;
        resolve({ ok: false, error: err.message, action: norm });
      }
    });
  }
}

module.exports = WindowsController;
