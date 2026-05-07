'use strict';

const { spawn } = require('child_process');
const BaseCapture = require('./BaseCapture');

/**
 * Captura via `nowplaying-cli` (https://github.com/kirtan-shah/nowplaying-cli)
 * que expõe o MPNowPlayingInfoCenter / MediaRemote do macOS em formato JSON.
 *
 * Instale com: `brew install nowplaying-cli`.
 *
 * Caso o binário não esteja disponível, o capturador emite `error`
 * imediatamente para que o Core caia em outro modo (NullCapture).
 */
class MacOSCapture extends BaseCapture {
  constructor(opts = {}) {
    super(opts);
    this._timer = null;
    this._lastSignature = '';
    this._binary = opts.binary || 'nowplaying-cli';
  }

  async start() {
    if (this.running) return;
    this.running = true;

    const ok = await this._probeBinary();
    if (!ok) {
      this.running = false;
      const err = new Error(
        `'${this._binary}' não encontrado. Instale com: brew install nowplaying-cli`
      );
      this.logger?.warn(err.message);
      this.emit('error', err);
      return;
    }

    this.logger?.info('Capturador MPNowPlayingInfoCenter (macOS) iniciado');

    const tick = async () => {
      if (!this.running) return;
      try {
        await this._pollOnce();
      } catch (err) {
        this.logger?.warn('Erro ao consultar nowplaying-cli:', err.message);
        this.emit('error', err);
      } finally {
        if (this.running) {
          this._timer = setTimeout(tick, this.pollIntervalMs);
        }
      }
    };
    tick();
  }

  async stop() {
    this.running = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._lastSignature = '';
    this.logger?.info('Capturador macOS parado');
  }

  _probeBinary() {
    return new Promise((resolve) => {
      try {
        const proc = spawn(this._binary, ['--help']);
        proc.on('error', () => resolve(false));
        proc.on('exit', (code) => resolve(code === 0 || code === 1));
      } catch (_) {
        resolve(false);
      }
    });
  }

  _runJson(args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(this._binary, args);
      let out = '';
      let err = '';
      proc.stdout.on('data', (d) => { out += d.toString(); });
      proc.stderr.on('data', (d) => { err += d.toString(); });
      proc.on('error', reject);
      proc.on('exit', (code) => {
        if (code !== 0) return reject(new Error(err || `exit ${code}`));
        try {
          resolve(JSON.parse(out));
        } catch (_) {
          resolve({ _raw: out.trim() });
        }
      });
    });
  }

  async _pollOnce() {
    let info = null;
    try {
      info = await this._runJson(['get-raw']);
    } catch (_) {
      info = null;
    }

    if (!info || (typeof info === 'object' && Object.keys(info).length === 0)) {
      if (this._lastSignature) {
        this._lastSignature = '';
        this.emit('lost');
      }
      return;
    }

    const title = info.kMRMediaRemoteNowPlayingInfoTitle || '';
    const artist = info.kMRMediaRemoteNowPlayingInfoArtist || '';
    const album = info.kMRMediaRemoteNowPlayingInfoAlbum || '';
    const duration = Number(info.kMRMediaRemoteNowPlayingInfoDuration || 0);
    const elapsed = Number(info.kMRMediaRemoteNowPlayingInfoElapsedTime || 0);
    const rate = Number(info.kMRMediaRemoteNowPlayingInfoPlaybackRate || 0);
    const paused = rate === 0;
    const sourceApp = info.kMRMediaRemoteNowPlayingInfoClientPropertiesData || '';

    const signature = [sourceApp, title, artist, album, paused ? '1' : '0'].join('|');

    const payload = {
      sourceAppUserModelId: typeof sourceApp === 'string' ? sourceApp : 'macOS Player',
      title,
      artist,
      album,
      duration: Math.floor(duration),
      position: Math.floor(elapsed),
      paused,
      playbackStatus: paused ? 'paused' : 'playing',
      _signature: signature,
      _signatureChanged: signature !== this._lastSignature,
    };

    this._lastSignature = signature;
    this.emit('snapshot', payload);
  }
}

module.exports = MacOSCapture;
