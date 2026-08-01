'use strict';

const { isUserAgentPolicy } = require('../contracts/IUserAgentPolicy');

/**
 * UserAgentPolicy — Chrome “puro” vs UA honesto do Electron por domínio.
 *
 * Google: UA honesto (Chrome puro em embedded → bloqueio de login).
 * WhatsApp/Discord/Spotify: Chrome puro (senão UI/player quebram).
 *
 * Não faz: harden de session, popups, IPC.
 *
 * @implements {import('../contracts/IUserAgentPolicy').IUserAgentPolicy}
 */
class UserAgentPolicy {
  constructor() {
    this._chromeUa = buildChromeUserAgent();
    /** @type {string} */
    this._defaultUa = '';
    this._spoofHostRe =
      /(?:^|\.)(?:whatsapp\.(?:com|net)|discord\.(?:com|gg|media)|discordapp\.(?:com|net)|spotify\.(?:com|net)|spotifycdn\.com|scdn\.co)$/i;
  }

  chromeUa() {
    return this._chromeUa;
  }

  defaultUa() {
    return this._defaultUa;
  }

  setDefaultUa(ua) {
    this._defaultUa = String(ua || '');
  }

  _hostFromUrl(url) {
    try {
      return new URL(url).hostname || '';
    } catch (_) {
      return '';
    }
  }

  shouldSpoofChrome(url) {
    return this._spoofHostRe.test(this._hostFromUrl(url));
  }

  forUrl(url) {
    if (this.shouldSpoofChrome(url)) return this._chromeUa;
    return this._defaultUa || this._chromeUa;
  }
}

function buildChromeUserAgent() {
  const chrome = process.versions.chrome || '146.0.7680.65';
  let osToken = 'Windows NT 10.0; Win64; x64';
  if (process.platform === 'darwin') {
    osToken = 'Macintosh; Intel Mac OS X 10_15_7';
  } else if (process.platform === 'linux') {
    osToken = 'X11; Linux x86_64';
  }
  return (
    `Mozilla/5.0 (${osToken}) AppleWebKit/537.36 (KHTML, like Gecko) ` +
    `Chrome/${chrome} Safari/537.36`
  );
}

function createUserAgentPolicy() {
  const policy = new UserAgentPolicy();
  if (!isUserAgentPolicy(policy)) {
    throw new Error('UserAgentPolicy não satisfaz IUserAgentPolicy');
  }
  return policy;
}

module.exports = { UserAgentPolicy, createUserAgentPolicy, buildChromeUserAgent };
