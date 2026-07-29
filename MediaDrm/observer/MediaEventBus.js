'use strict';

/**
 * Observer — Subject de eventos de mídia/DRM.
 * Eventos:
 *   drm:pending | drm:ready | drm:unavailable | drm:error
 *   capability:applied | capability:failed | media:bootstrapped
 */
class MediaEventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * @param {string} event
   * @param {(payload: object) => void} handler
   * @returns {() => void} unsubscribe
   */
  subscribe(event, handler) {
    if (!event || typeof handler !== 'function') return () => {};
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(handler);
    return () => this.unsubscribe(event, handler);
  }

  /**
   * @param {string} event
   * @param {(payload: object) => void} handler
   */
  unsubscribe(event, handler) {
    const set = this._listeners.get(event);
    if (!set) return;
    set.delete(handler);
    if (!set.size) this._listeners.delete(event);
  }

  /**
   * @param {string} event
   * @param {object} [detail]
   */
  notify(event, detail) {
    const set = this._listeners.get(event);
    if (!set || !set.size) return;
    const payload = detail && typeof detail === 'object' ? { ...detail } : {};
    set.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.warn('[MediaEventBus]', event, err?.message || err);
      }
    });
  }

  clear() {
    this._listeners.clear();
  }
}

module.exports = { MediaEventBus };
