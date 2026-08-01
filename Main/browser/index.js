'use strict';

/**
 * Main/browser — identidade Chromium, session harden, OAuth popup.
 *
 * Contratos: IUserAgentPolicy | ISessionHardener | IPopupPolicy
 * Ver: Version/Docs/MainProcess.md 
 */

const { createUserAgentPolicy, UserAgentPolicy } = require('./UserAgentPolicy');
const {
  createSessionHardener,
  SessionHardener,
} = require('./SessionHardener');
const {
  createAuthPopupPolicy,
  AuthPopupPolicy,
} = require('./AuthPopupPolicy');
const { GuestWebviewAttach } = require('./GuestWebviewAttach');
const { BrowserServices } = require('./BrowserServices');

/**
 * @param {{
 *   app: Electron.App,
 *   session: typeof import('electron').session,
 *   desktopCapturer: Electron.DesktopCapturer,
 * }} options
 * @returns {BrowserServices}
 */
function createBrowserServices({ app, session, desktopCapturer }) {
  const userAgent = createUserAgentPolicy();
  const sessionHardener = createSessionHardener({
    app,
    sessionModule: session,
    desktopCapturer,
    userAgentPolicy: userAgent,
  });
  const popup = createAuthPopupPolicy();
  const guestAttach = new GuestWebviewAttach({
    sessionHardener,
    userAgentPolicy: userAgent,
    popupPolicy: popup,
  });
  return new BrowserServices({
    userAgent,
    session: sessionHardener,
    popup,
    guestAttach,
  });
}

module.exports = {
  createBrowserServices,
  BrowserServices,
  UserAgentPolicy,
  createUserAgentPolicy,
  SessionHardener,
  createSessionHardener,
  AuthPopupPolicy,
  createAuthPopupPolicy,
  GuestWebviewAttach,
};
