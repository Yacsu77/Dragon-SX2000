'use strict';

const { isPopupPolicy } = require('../contracts/IPopupPolicy');

/**
 * AuthPopupPolicy — OAuth/login como BrowserWindow nativo (mantém window.opener).
 *
 * Se virar aba (deny + open-url), o callback fica branco e o site mostra
 * "Não foi possível obter seu perfil do Google".
 *
 * Não faz: createTab, hardenSession, atalhos.
 *
 * @implements {import('../contracts/IPopupPolicy').IPopupPolicy}
 */
class AuthPopupPolicy {
  isAllowedNavigationUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  isAuthPopupUrl(url) {
    if (!url || url === 'about:blank') return false;
    try {
      const parsed = new URL(url);
      const host = String(parsed.hostname || '').toLowerCase();
      const pathName = String(parsed.pathname || '').toLowerCase();
      const href = String(parsed.href || '').toLowerCase();

      if (
        host === 'accounts.google.com' ||
        host === 'accounts.youtube.com' ||
        host === 'account.google.com'
      ) {
        return true;
      }
      if (host === 'www.google.com' || host === 'google.com') {
        if (
          pathName.includes('/o/oauth2') ||
          pathName.includes('/signin') ||
          pathName.includes('/gsi/') ||
          href.includes('oauth') ||
          href.includes('client_id=')
        ) {
          return true;
        }
      }
      if (
        host.endsWith('.google.com') &&
        (pathName.includes('/gsi/') || pathName.includes('/o/oauth2'))
      ) {
        return true;
      }

      if (host === 'appleid.apple.com') return true;
      if (host === 'login.microsoftonline.com' || host === 'login.live.com') {
        return true;
      }
      if (host === 'github.com' && pathName.includes('/login/oauth')) return true;
      if (
        (host === 'facebook.com' || host === 'www.facebook.com') &&
        (pathName.includes('/login') ||
          pathName.includes('/dialog') ||
          pathName.includes('/v'))
      ) {
        return true;
      }
      if (
        (host === 'twitter.com' ||
          host === 'api.twitter.com' ||
          host === 'x.com') &&
        (pathName.includes('/oauth') || pathName.includes('/i/oauth'))
      ) {
        return true;
      }
      if (host.includes('auth0.com') || host.includes('okta.com')) return true;
      return false;
    } catch {
      return false;
    }
  }

  _looksLikeSizedPopup(features) {
    const f = String(features || '');
    return /\bwidth\s*=/i.test(f) && /\bheight\s*=/i.test(f);
  }

  shouldAllowNative(details) {
    const url = details?.url || '';
    const disposition = details?.disposition || '';
    const features = details?.features || '';

    if (this.isAuthPopupUrl(url)) return true;

    // GIS/OAuth costuma abrir about:blank e só depois navega.
    if (
      (url === 'about:blank' || url === '') &&
      (disposition === 'new-window' || this._looksLikeSizedPopup(features))
    ) {
      return true;
    }

    if (disposition === 'new-window' && this._looksLikeSizedPopup(features)) {
      return true;
    }

    return false;
  }

  windowOptions(parentWin) {
    return {
      width: 520,
      height: 740,
      minWidth: 360,
      minHeight: 480,
      autoHideMenuBar: true,
      parent: parentWin && !parentWin.isDestroyed() ? parentWin : undefined,
      modal: false,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        // Sem preload do DSX: popup é conteúdo de terceiros (OAuth).
      },
    };
  }
}

function createAuthPopupPolicy() {
  const policy = new AuthPopupPolicy();
  if (!isPopupPolicy(policy)) {
    throw new Error('AuthPopupPolicy não satisfaz IPopupPolicy');
  }
  return policy;
}

module.exports = { AuthPopupPolicy, createAuthPopupPolicy };
