'use strict';

/**
 * Capability folha — política de autoplay do Chromium.
 * Deve rodar ANTES de app.whenReady() (commandLine).
 */
class AutoplayCapability {
  constructor() {
    this._id = 'autoplay';
    this._ok = false;
    this._message = 'não aplicado';
  }

  getId() {
    return this._id;
  }

  isComposite() {
    return false;
  }

  /**
   * @param {{ app: import('electron').App }} ctx
   */
  apply(ctx) {
    try {
      if (ctx?.app?.commandLine?.appendSwitch) {
        ctx.app.commandLine.appendSwitch(
          'autoplay-policy',
          'no-user-gesture-required'
        );
      }
      this._ok = true;
      this._message = 'autoplay-policy=no-user-gesture-required';
    } catch (err) {
      this._ok = false;
      this._message = err?.message || String(err);
    }
    return this.getStatus();
  }

  getStatus() {
    return { id: this._id, ok: this._ok, message: this._message };
  }
}

module.exports = { AutoplayCapability };
