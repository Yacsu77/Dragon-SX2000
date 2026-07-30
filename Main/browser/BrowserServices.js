'use strict';

/**
 * BrowserServices — facade do domínio browser (UA + session + OAuth popup).
 *
 * ISP: consumidores pegam só userAgent / session / popup via getters.
 */
class BrowserServices {
  /**
   * @param {{
   *   userAgent: import('./UserAgentPolicy').UserAgentPolicy,
   *   session: import('./SessionHardener').SessionHardener,
   *   popup: import('./AuthPopupPolicy').AuthPopupPolicy,
   *   guestAttach: import('./GuestWebviewAttach').GuestWebviewAttach,
   * }} deps
   */
  constructor({ userAgent, session, popup, guestAttach }) {
    this._userAgent = userAgent;
    this._session = session;
    this._popup = popup;
    this._guestAttach = guestAttach;
  }

  /** @returns {import('../contracts/IUserAgentPolicy').IUserAgentPolicy} */
  getUserAgentPolicy() {
    return this._userAgent;
  }

  /** @returns {import('../contracts/ISessionHardener').ISessionHardener} */
  getSessionHardener() {
    return this._session;
  }

  /** @returns {import('../contracts/IPopupPolicy').IPopupPolicy} */
  getPopupPolicy() {
    return this._popup;
  }

  configureAppIdentity() {
    return this._session.configureAppIdentity();
  }

  harden(ses) {
    return this._session.harden(ses);
  }

  attachToWebContents(contents) {
    return this._session.attachToWebContents(contents);
  }

  forUrl(url) {
    return this._userAgent.forUrl(url);
  }

  isAllowedNavigationUrl(url) {
    return this._popup.isAllowedNavigationUrl(url);
  }

  /**
   * @param {Electron.BrowserWindow} win
   * @param {object} [shortcutDeps]
   */
  attachGuestWebview(win, shortcutDeps) {
    return this._guestAttach.attach(win, shortcutDeps);
  }
}

module.exports = { BrowserServices };
