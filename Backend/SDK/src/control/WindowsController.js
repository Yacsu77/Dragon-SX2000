'use strict';

const { spawn } = require('child_process');
const path = require('path');
const BaseController = require('./BaseController');

/**
 * Controlador de mídia para Windows.
 *
 * Estratégia: envia teclas multimídia globais via `keybd_event` (user32.dll).
 * Funciona com qualquer aplicativo que registre handler SMTC (Spotify, Chrome,
 * Edge, Firefox, Groove, players nativos, etc.) — exatamente os mesmos
 * que o capturador SMTC consegue ler.
 *
 * Implementação: spawna UM PowerShell de longa duração e envia comandos via
 * stdin. Eliminamos o cold start (~500ms) que aconteceria a cada comando.
 *
 * Vantagens vs. dependência nativa:
 *   - Zero deps adicionais (PowerShell vem com Windows)
 *   - Funciona em qualquer Windows 7+
 *   - Não precisa de toolchain de C++ ou rebuild para Electron
 *
 * Virtual-Key codes:
 *   0xB0 VK_MEDIA_NEXT_TRACK
 *   0xB1 VK_MEDIA_PREV_TRACK
 *   0xB2 VK_MEDIA_STOP
 *   0xB3 VK_MEDIA_PLAY_PAUSE
 *
 * Flags do keybd_event:
 *   0x0001 KEYEVENTF_EXTENDEDKEY
 *   0x0002 KEYEVENTF_KEYUP
 */
class WindowsController extends BaseController {
  constructor(opts = {}) {
    super(opts);
    this._proc = null;
    this._exitHandler = null;
    this._restarting = false;
  }

  async start() {
    if (this._proc) return;
    this._spawnHelper();
    this.ready = !!this._proc;
  }

  async stop() {
    this.ready = false;
    if (this._proc) {
      try {
        this._proc.stdin.end();
        this._proc.kill();
      } catch (_) { /* ignore */ }
      this._proc = null;
    }
  }

  _spawnHelper() {
    // PowerShell em modo "silencioso" e sem profile (mais rápido).
    const args = [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', '-',
    ];

    let proc;
    try {
      proc = spawn('powershell.exe', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (err) {
      this.logger?.error?.('Não foi possível iniciar PowerShell:', err.message);
      return;
    }

    proc.on('error', (err) => {
      this.logger?.warn?.('Erro no helper PowerShell:', err.message);
    });

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString().trim();
      if (text) this.logger?.debug?.('[helper stderr]', text);
    });

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString().trim();
      if (text) this.logger?.debug?.('[helper stdout]', text);
    });

    proc.on('exit', (code, signal) => {
      this.logger?.warn?.(`Helper PowerShell encerrado (code=${code} signal=${signal})`);
      this._proc = null;
      // Auto-reinicia se a SDK ainda estiver ativa
      if (this.ready && !this._restarting) {
        this._restarting = true;
        setTimeout(() => {
          this._restarting = false;
          if (this.ready) this._spawnHelper();
        }, 500);
      }
    });

    // Compila a função `Send-MediaKey` uma vez na sessão e fica em loop lendo
    // linhas do stdin. Cada linha é um nome de tecla.
    const bootstrap = `
$ErrorActionPreference = 'SilentlyContinue';
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class DragonMedia {
    [DllImport("user32.dll", CharSet = CharSet.Auto, ExactSpelling = true)]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void Tap(byte vk) {
        keybd_event(vk, 0, 0x0001, UIntPtr.Zero);
        keybd_event(vk, 0, 0x0001 | 0x0002, UIntPtr.Zero);
    }
}
"@ -ErrorAction SilentlyContinue;
function Send-MediaKey([string]$name) {
    switch ($name) {
        'play_pause' { [DragonMedia]::Tap(0xB3) }
        'play'       { [DragonMedia]::Tap(0xB3) }
        'pause'      { [DragonMedia]::Tap(0xB3) }
        'next'       { [DragonMedia]::Tap(0xB0) }
        'prev'       { [DragonMedia]::Tap(0xB1) }
        'stop'       { [DragonMedia]::Tap(0xB2) }
    }
    Write-Output "ok:$name"
}
Write-Output "ready"
while ($line = [Console]::In.ReadLine()) {
    if ($line -eq 'exit') { break }
    Send-MediaKey -name $line
}
`.trim() + '\n';

    proc.stdin.write(bootstrap);
    this._proc = proc;
    this.logger?.info?.('Helper PowerShell de controle de mídia iniciado');
  }

  async send(action) {
    const norm = this._normalize(action);
    if (!norm) {
      this.logger?.warn?.(`comando inválido: '${action}'`);
      return { ok: false, error: 'invalid_action' };
    }
    if (!this._proc || !this._proc.stdin || this._proc.stdin.destroyed) {
      this.logger?.warn?.('Helper PowerShell não disponível, tentando reiniciar');
      this._spawnHelper();
      if (!this._proc) return { ok: false, error: 'helper_unavailable' };
    }

    try {
      this._proc.stdin.write(`${norm}\n`);
      this.logger?.info?.(`▶ enviando tecla multimídia: ${norm}`);
      return { ok: true, action: norm };
    } catch (err) {
      this.logger?.warn?.('Falha ao enviar comando:', err.message);
      return { ok: false, error: err.message };
    }
  }
}

module.exports = WindowsController;
