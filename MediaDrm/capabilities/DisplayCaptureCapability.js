'use strict';

/**
 * Capability folha — display-capture (Discord / Meet).
 * A wiring concreta continua em main.hardenSession; esta classe
 * documenta e reporta a capability no Composite.
 */
class DisplayCaptureCapability {
  constructor() {
    this._id = 'display-capture';
    this._ok = true;
    this._message = 'delegado a hardenSession (setDisplayMediaRequestHandler)';
  }

  getId() {
    return this._id;
  }

  isComposite() {
    return false;
  }

  apply() {
    return this.getStatus();
  }

  getStatus() {
    return { id: this._id, ok: this._ok, message: this._message };
  }
}

module.exports = { DisplayCaptureCapability };
