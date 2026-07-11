'use strict';

const dbus = require('dbus-next');
const { Message } = dbus;

const MPRIS_PREFIX = 'org.mpris.MediaPlayer2.';
const ROOT_IFACE = 'org.mpris.MediaPlayer2';
const PLAYER_IFACE = 'org.mpris.MediaPlayer2.Player';
const PROPERTIES_IFACE = 'org.freedesktop.DBus.Properties';
const PLAYER_PATH = '/org/mpris/MediaPlayer2';

/**
 * Cliente MPRIS via D-Bus session bus.
 * Funciona com Spotify, Firefox, Chrome, VLC, Rhythmbox e demais players MPRIS.
 */
class MprisClient {
  constructor() {
    this._bus = null;
    this._activePlayer = null;
  }

  connect() {
    if (this._bus) return this._bus;
    this._bus = dbus.sessionBus();
    return this._bus;
  }

  disconnect() {
    if (this._bus) {
      try { this._bus.disconnect(); } catch (_) { /* ignore */ }
      this._bus = null;
    }
    this._activePlayer = null;
  }

  async probe() {
    this.connect();
    await this._listPlayers();
    return true;
  }

  async _listPlayers() {
    const bus = this.connect();
    const obj = await bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus');
    const iface = obj.getInterface('org.freedesktop.DBus');
    const names = await iface.ListNames();
    return names.filter((n) => n.startsWith(MPRIS_PREFIX)).sort();
  }

  /**
   * Chama um método D-Bus diretamente.
   * Necessário para org.freedesktop.DBus.Properties, que players MPRIS
   * implementam mas não listam na introspecção XML.
   */
  async _callMethod(busName, iface, member, inSignature = '', body = []) {
    const bus = this.connect();
    const msg = new Message({
      destination: busName,
      path: PLAYER_PATH,
      interface: iface,
      member,
      signature: inSignature,
      body,
    });
    const reply = await bus.call(msg);
    return reply.body;
  }

  async _getPlayerProperty(busName, propName) {
    const body = await this._callMethod(
      busName,
      PROPERTIES_IFACE,
      'Get',
      'ss',
      [PLAYER_IFACE, propName]
    );
    return unwrap(body[0]);
  }

  async _getPlayerProps(busName) {
    const [metadata, status, position] = await Promise.all([
      this._getPlayerProperty(busName, 'Metadata'),
      this._getPlayerProperty(busName, 'PlaybackStatus'),
      this._getPlayerProperty(busName, 'Position').catch(() => 0),
    ]);
    return {
      metadata: metadata || {},
      status: String(status || ''),
      position: Number(position || 0),
    };
  }

  async resolveActivePlayer() {
    const players = await this._listPlayers();
    if (!players.length) {
      this._activePlayer = null;
      return null;
    }

    if (this._activePlayer && players.includes(this._activePlayer)) {
      try {
        const { status } = await this._getPlayerProps(this._activePlayer);
        if (status !== 'Stopped') return this._activePlayer;
      } catch (_) { /* re-elect */ }
    }

    for (const name of players) {
      try {
        const { status } = await this._getPlayerProps(name);
        if (status === 'Playing') {
          this._activePlayer = name;
          return name;
        }
      } catch (_) { /* skip broken player */ }
    }

    this._activePlayer = players[0];
    return this._activePlayer;
  }

  async getSnapshot() {
    const busName = await this.resolveActivePlayer();
    if (!busName) return null;

    const { metadata, status, position } = await this._getPlayerProps(busName);
    const title = String(metadata['xesam:title'] || '');
    if (status === 'Stopped' && !title) {
      return null;
    }

    return metadataToSnapshot(busName, metadata, status, position);
  }

  async sendCommand(action) {
    const busName = await this.resolveActivePlayer();
    if (!busName) throw new Error('no_active_player');

    const method = MPRIS_COMMANDS[action];
    if (!method) throw new Error('unsupported_action');

    await this._callMethod(busName, PLAYER_IFACE, method);
    return { busName, method };
  }
}

const MPRIS_COMMANDS = {
  play_pause: 'PlayPause',
  play: 'Play',
  pause: 'Pause',
  next: 'Next',
  prev: 'Previous',
  stop: 'Stop',
};

function unwrap(value) {
  if (value == null) return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'object' && 'signature' in value && 'value' in value) {
    return unwrap(value.value);
  }
  if (Array.isArray(value)) return value.map(unwrap);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = unwrap(v);
    }
    return out;
  }
  return value;
}

function busNameToApp(busName) {
  if (!busName || !busName.startsWith(MPRIS_PREFIX)) return busName || 'linux-player';
  return busName.slice(MPRIS_PREFIX.length);
}

function metadataToSnapshot(busName, metadata, status, positionUs) {
  const md = metadata || {};
  const title = String(md['xesam:title'] || '');
  const artistRaw = md['xesam:artist'];
  const artist = Array.isArray(artistRaw)
    ? artistRaw.map(String).join(', ')
    : String(artistRaw || '');
  const album = String(md['xesam:album'] || '');
  const lengthUs = Number(md['mpris:length'] || 0);
  const cover = String(md['xesam:artUrl'] || '');
  const paused = status !== 'Playing';
  const position = Math.max(0, Math.floor(positionUs / 1_000_000));
  const duration = Math.max(0, Math.floor(lengthUs / 1_000_000));
  const app = busNameToApp(busName);
  const signature = [busName, title, artist, album, paused ? '1' : '0'].join('|');

  return {
    sourceAppUserModelId: app,
    title,
    artist,
    album,
    duration,
    position,
    paused,
    playbackStatus: paused ? 'paused' : 'playing',
    cover,
    _signature: signature,
    _busName: busName,
  };
}

module.exports = {
  MprisClient,
  MPRIS_COMMANDS,
};
