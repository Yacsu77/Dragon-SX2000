'use strict';

const { isPendingBootStore } = require('../contracts/IPendingBootStore');

/**
 * PendingBootStore — estado transitório de boot por janela (URL/tab/user).
 *
 * Não faz: criar BrowserWindow, drag/drop, wallpaper.
 *
 * @implements {import('../contracts/IPendingBootStore').IPendingBootStore}
 */
class PendingBootStore {
  constructor() {
    /** @type {Map<number, string>} */
    this._urls = new Map();
    /** @type {Map<number, object>} */
    this._tabs = new Map();
    /** @type {Map<number, { userId: string|null, cleanSession: boolean }>} */
    this._boots = new Map();
  }

  setUrl(wcId, url) {
    if (wcId == null || !url) return;
    this._urls.set(wcId, url);
  }

  setTab(wcId, tab) {
    if (wcId == null || !tab) return;
    this._tabs.set(wcId, tab);
  }

  setBoot(wcId, boot) {
    if (wcId == null || !boot) return;
    this._boots.set(wcId, boot);
  }

  consumeUrl(wcId) {
    const url = this._urls.get(wcId);
    if (url) {
      this._urls.delete(wcId);
      return url;
    }
    return null;
  }

  consumeTab(wcId) {
    const tab = this._tabs.get(wcId);
    if (tab) {
      this._tabs.delete(wcId);
      return tab;
    }
    return null;
  }

  consumeBoot(wcId) {
    const boot = this._boots.get(wcId);
    if (boot) {
      this._boots.delete(wcId);
      return boot;
    }
    return null;
  }

  clear(wcId) {
    this._urls.delete(wcId);
    this._tabs.delete(wcId);
    this._boots.delete(wcId);
  }

  /**
   * Normaliza snapshot de aba vindo do renderer (Janelas detach).
   * @param {object} snapshot
   * @param {(url: string) => boolean} isAllowedNavigationUrl
   */
  sanitizeTab(snapshot, isAllowedNavigationUrl) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    const isHome = Boolean(snapshot.is_home || snapshot.isHomeTab);
    const url = typeof snapshot.url === 'string' ? snapshot.url : null;
    if (!isHome && (!url || !isAllowedNavigationUrl(url))) return null;
    return {
      url: isHome ? null : url,
      title: typeof snapshot.title === 'string' ? snapshot.title : null,
      favicon_url:
        typeof snapshot.favicon_url === 'string' ? snapshot.favicon_url : null,
      is_home: isHome,
      active: true,
    };
  }
}

function createPendingBootStore() {
  const store = new PendingBootStore();
  if (!isPendingBootStore(store)) {
    throw new Error('PendingBootStore não satisfaz IPendingBootStore');
  }
  return store;
}

module.exports = { PendingBootStore, createPendingBootStore };
