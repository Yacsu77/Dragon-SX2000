'use strict';

/**
 * WindowServices — facade do domínio windows (factory + pending + menu).
 */
class WindowServices {
  /**
   * @param {{
   *   factory: import('./WindowFactory').WindowFactory,
   *   pending: import('./PendingBootStore').PendingBootStore,
   *   setupMenu: () => void,
   * }} deps
   */
  constructor({ factory, pending, setupMenu }) {
    this._factory = factory;
    this._pending = pending;
    this._setupMenu = setupMenu;
  }

  /** @returns {import('../contracts/IWindowFactory').IWindowFactory} */
  getFactory() {
    return this._factory;
  }

  /** @returns {import('./PendingBootStore').PendingBootStore} */
  getPendingStore() {
    return this._pending;
  }

  create(pending) {
    return this._factory.create(pending);
  }

  createMain() {
    return this._factory.createMain();
  }

  getMain() {
    return this._factory.getMain();
  }

  setupApplicationMenu() {
    return this._setupMenu();
  }

  consumePendingUrl(wcId) {
    return this._pending.consumeUrl(wcId);
  }

  consumePendingTab(wcId) {
    return this._pending.consumeTab(wcId);
  }

  consumePendingBoot(wcId) {
    return this._pending.consumeBoot(wcId);
  }

  sanitizeTab(snapshot, isAllowedNavigationUrl) {
    return this._pending.sanitizeTab(snapshot, isAllowedNavigationUrl);
  }
}

module.exports = { WindowServices };
