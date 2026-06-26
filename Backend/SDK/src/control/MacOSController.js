'use strict';

const BaseController = require('./BaseController');
const {
  resolveNowPlayingCliBinary,
  probeNowPlayingCliBinary,
  runNowPlayingCliCommand,
} = require('../utils/nowPlayingCli');

/**
 * Controlador de mídia para macOS via `nowplaying-cli`.
 *
 * Usa os mesmos comandos MediaRemote que o MacOSCapture (togglePlayPause,
 * next, previous, etc.), funcionando com qualquer app registrado no
 * MPNowPlayingInfoCenter (Spotify, Chrome, Safari, Music, etc.).
 *
 * Instale com: `brew install nowplaying-cli`
 * ou use o binário bundled em Backend/SDK/bin/darwin-{arch}/.
 */
class MacOSController extends BaseController {
  constructor(opts = {}) {
    super(opts);
    this._binary = resolveNowPlayingCliBinary(opts);
  }

  async start() {
    const ok = await probeNowPlayingCliBinary(this._binary);
    if (!ok) {
      this.logger?.warn?.(
        `'${this._binary}' não encontrado. Instale com: brew install nowplaying-cli`
      );
      this.ready = false;
      return;
    }
    this.ready = true;
    this.logger?.info?.(`Controlador macOS iniciado (${this._binary})`);
  }

  async send(action) {
    const norm = this._normalize(action);
    if (!norm) {
      this.logger?.warn?.(`comando inválido: '${action}'`);
      return { ok: false, error: 'invalid_action' };
    }
    if (!this.ready) {
      this.logger?.warn?.(`controlador indisponível, comando ignorado: '${norm}'`);
      return { ok: false, error: 'controller_not_ready' };
    }

    const cliCmd = this._mapToCliCommand(norm);
    if (!cliCmd) return { ok: false, error: 'unsupported_action' };

    this.logger?.info?.(`▶ executando '${cliCmd}' via nowplaying-cli`);
    try {
      await runNowPlayingCliCommand(this._binary, [cliCmd]);
      return { ok: true, action: norm };
    } catch (err) {
      this.logger?.warn?.(`falha ao executar '${cliCmd}':`, err.message);
      return { ok: false, error: err.message, action: norm };
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _mapToCliCommand(action) {
    switch (action) {
      case 'play_pause': return 'togglePlayPause';
      case 'play': return 'play';
      case 'pause': return 'pause';
      case 'next': return 'next';
      case 'prev': return 'previous';
      case 'stop': return 'pause';
      default: return null;
    }
  }
}

module.exports = MacOSController;
