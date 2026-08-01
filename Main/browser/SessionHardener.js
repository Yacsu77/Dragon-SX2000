'use strict';

const { isSessionHardener } = require('../contracts/ISessionHardener');

/**
 * Permissões web que o DSX concede a sites (request + check alinhados).
 * Check e request precisam bater: sites consultam Permissions API antes
 * de pedir — se o check negar, muitos nunca chegam no request.
 */
const ALLOWED_PERMISSIONS = new Set([
  'media',
  'mediaKeySystem',
  'display-capture',
  'fullscreen',
  'notifications',
  'pointerLock',
  'keyboardLock',
  'clipboard-sanitized-write',
  'clipboard-read',
  'geolocation',
  'midi',
  'midiSysex',
  'idle-detection',
  'openExternal',
  'speaker-selection',
  'storage-access',
  'top-level-storage-access',
  'window-management',
  'fileSystem',
  'autoplay',
]);

/**
 * SessionHardener — permissões, display-media e UA headers na Session.
 *
 * Depende de IUserAgentPolicy (DIP). Não decide popups OAuth.
 *
 * @implements {import('../contracts/ISessionHardener').ISessionHardener}
 */
class SessionHardener {
  /**
   * @param {{
   *   app: Electron.App,
   *   sessionModule: typeof import('electron').session,
   *   desktopCapturer: Electron.DesktopCapturer,
   *   userAgentPolicy: import('./UserAgentPolicy').UserAgentPolicy,
   * }} deps
   */
  constructor({ app, sessionModule, desktopCapturer, userAgentPolicy }) {
    if (!app || !sessionModule || !userAgentPolicy) {
      throw new Error('SessionHardener: app, sessionModule e userAgentPolicy obrigatórios');
    }
    this._app = app;
    this._session = sessionModule;
    this._desktopCapturer = desktopCapturer;
    this._ua = userAgentPolicy;
  }

  /**
   * @param {string} permission
   * @returns {boolean}
   */
  _isAllowed(permission) {
    return ALLOWED_PERMISSIONS.has(String(permission || ''));
  }

  /**
   * @param {Electron.Session} ses
   */
  harden(ses) {
    if (!ses || ses.__dsxHardened) return;
    ses.__dsxHardened = true;

    try {
      ses.webRequest.onBeforeSendHeaders((details, callback) => {
        try {
          const ua = this._ua.forUrl(details.url);
          if (ua) details.requestHeaders['User-Agent'] = ua;
        } catch (_) {
          /* ignore */
        }
        callback({ requestHeaders: details.requestHeaders });
      });
    } catch (_) {
      /* ignore */
    }

    try {
      ses.setUserAgent(this._ua.defaultUa() || this._ua.chromeUa());
    } catch (_) {
      /* ignore */
    }

    try {
      ses.setPermissionRequestHandler((_wc, permission, callback) => {
        callback(this._isAllowed(permission));
      });
    } catch (_) {
      /* ignore */
    }

    try {
      // Sync check (Permissions.query / pré-check do Chromium).
      // Sem geolocation aqui, sites tratam como "denied" e não pedem de novo.
      ses.setPermissionCheckHandler((_wc, permission) => this._isAllowed(permission));
    } catch (_) {
      /* ignore */
    }

    if (
      this._desktopCapturer &&
      typeof ses.setDisplayMediaRequestHandler === 'function'
    ) {
      const handler = async (request, callback) => {
        try {
          if (request?.frame) {
            callback({ video: request.frame, audio: 'loopback' });
            return;
          }
          const sources = await this._desktopCapturer.getSources({
            types: ['screen', 'window'],
            thumbnailSize: { width: 0, height: 0 },
          });
          const preferred =
            sources.find((s) => String(s.id || '').startsWith('screen:')) ||
            sources[0];
          if (!preferred) {
            callback({});
            return;
          }
          callback({ video: preferred, audio: 'loopback' });
        } catch (err) {
          console.warn('[DSX] display-media:', err.message);
          callback({});
        }
      };
      try {
        ses.setDisplayMediaRequestHandler(handler, { useSystemPicker: true });
      } catch (_) {
        try {
          ses.setDisplayMediaRequestHandler(handler);
        } catch (err) {
          console.warn('[DSX] display-media handler:', err.message);
        }
      }
    }
  }

  configureAppIdentity() {
    try {
      this._ua.setDefaultUa(this._session.defaultSession.getUserAgent() || '');
    } catch (_) {
      this._ua.setDefaultUa('');
    }
    try {
      this._app.userAgentFallback =
        this._ua.defaultUa() || this._ua.chromeUa();
    } catch (_) {
      /* ignore */
    }
    this.harden(this._session.defaultSession);
  }

  /**
   * Hook padrão para web-contents-created: harden + UA por navegação.
   * @param {Electron.WebContents} contents
   */
  attachToWebContents(contents) {
    if (!contents) return;

    try {
      this.harden(contents.session);
    } catch (_) {
      /* ignore */
    }

    try {
      if (typeof contents.setMaxListeners === 'function') {
        contents.setMaxListeners(32);
      }
    } catch (_) {
      /* ignore */
    }

    const applyUaForUrl = (url) => {
      try {
        if (typeof contents.setUserAgent === 'function' && url) {
          contents.setUserAgent(this._ua.forUrl(url));
        }
      } catch (_) {
        /* ignore */
      }
    };

    try {
      applyUaForUrl(contents.getURL());
    } catch (_) {
      /* ignore */
    }

    contents.on('did-start-navigation', (_e, url, _isInPlace, isMainFrame) => {
      if (isMainFrame) applyUaForUrl(url);
    });
  }
}

function createSessionHardener(deps) {
  const hardener = new SessionHardener(deps);
  if (!isSessionHardener(hardener)) {
    throw new Error('SessionHardener não satisfaz ISessionHardener');
  }
  return hardener;
}

module.exports = { SessionHardener, createSessionHardener, ALLOWED_PERMISSIONS };
