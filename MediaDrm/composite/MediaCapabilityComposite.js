'use strict';

const { isMediaCapability } = require('../contracts/IMediaCapability');

/**
 * Composite — trata um grupo de IMediaCapability como uma só.
 * Folhas e compostos compartilham a mesma interface (getId/apply/getStatus).
 */
class MediaCapabilityComposite {
  /**
   * @param {string} id
   * @param {import('../contracts/IMediaCapability').IMediaCapability[]} [children]
   */
  constructor(id, children = []) {
    this._id = id || 'media-capabilities';
    /** @type {import('../contracts/IMediaCapability').IMediaCapability[]} */
    this._children = [];
    children.forEach((child) => this.add(child));
    this._lastResults = [];
  }

  getId() {
    return this._id;
  }

  isComposite() {
    return true;
  }

  /**
   * @param {import('../contracts/IMediaCapability').IMediaCapability} capability
   */
  add(capability) {
    if (!isMediaCapability(capability)) {
      throw new Error('MediaCapabilityComposite.add: capability inválida');
    }
    this._children.push(capability);
    return this;
  }

  /**
   * @param {string} id
   */
  remove(id) {
    this._children = this._children.filter((c) => c.getId() !== id);
    return this;
  }

  /**
   * @param {string} id
   */
  find(id) {
    for (const child of this._children) {
      if (child.getId() === id) return child;
      if (child.isComposite() && typeof child.find === 'function') {
        const found = child.find(id);
        if (found) return found;
      }
    }
    return null;
  }

  children() {
    return this._children.slice();
  }

  /**
   * @param {import('../contracts/IMediaCapability').MediaCapabilityContext} ctx
   */
  async apply(ctx) {
    this._lastResults = [];
    for (const child of this._children) {
      try {
        const result = await child.apply(ctx);
        this._lastResults.push(result);
      } catch (err) {
        this._lastResults.push({
          id: child.getId(),
          ok: false,
          message: err?.message || String(err),
        });
      }
    }
    return this.getStatus();
  }

  getStatus() {
    const results =
      this._lastResults.length > 0
        ? this._lastResults
        : this._children.map((c) => c.getStatus());
    const ok = results.every((r) => r && r.ok);
    return {
      id: this._id,
      ok,
      message: ok
        ? `${results.length} capabilities ok`
        : 'uma ou mais capabilities pendentes/falharam',
      children: results,
    };
  }
}

module.exports = { MediaCapabilityComposite };
