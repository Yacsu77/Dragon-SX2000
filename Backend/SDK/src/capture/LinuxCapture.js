'use strict';

const BaseCapture = require('./BaseCapture');
const { MprisClient } = require('../utils/mpris');

/**
 * Captura via MPRIS (D-Bus session bus).
 *
 * Compatível com Spotify, Firefox, Chrome, VLC, Rhythmbox e qualquer
 * player que exponha org.mpris.MediaPlayer2 no desktop Linux.
 *
 * Requer sessão D-Bus ativa (padrão em GNOME, KDE, Zorin, Ubuntu, etc.).
 * A dependência `dbus-next` é instalada via npm no build do AppImage.
 */
class LinuxCapture extends BaseCapture {
  constructor(opts = {}) {
    super(opts);
    this._timer = null;
    this._lastSignature = '';
    this._mpris = new MprisClient();
  }

  async start() {
    if (this.running) return;
    this.running = true;

    try {
      await this._mpris.probe();
    } catch (err) {
      this.running = false;
      const hint = process.env.DBUS_SESSION_BUS_ADDRESS
        ? err.message
        : `${err.message} (DBUS_SESSION_BUS_ADDRESS não definido)`;
      const error = new Error(`MPRIS/D-Bus indisponível: ${hint}`);
      this.logger?.warn(error.message);
      this.emit('error', error);
      return;
    }

    this.logger?.info('Capturador MPRIS (Linux) iniciado');

    const tick = async () => {
      if (!this.running) return;
      try {
        await this._pollOnce();
      } catch (err) {
        this.logger?.warn('Erro ao consultar MPRIS:', err.message);
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
    this._mpris.disconnect();
    this.logger?.info('Capturador Linux parado');
  }

  async _pollOnce() {
    const payload = await this._mpris.getSnapshot();

    if (!payload) {
      if (this._lastSignature) {
        this._lastSignature = '';
        this.emit('lost');
      }
      return;
    }

    const signature = payload._signature;
    payload._signatureChanged = signature !== this._lastSignature;
    this._lastSignature = signature;
    this.emit('snapshot', payload);
  }
}

module.exports = LinuxCapture;
