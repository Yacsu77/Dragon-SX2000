'use strict';

const BaseCapture = require('./BaseCapture');

/**
 * Captura via Windows SMTC (System Media Transport Controls).
 *
 * Usa o pacote `@coooookies/windows-smtc-monitor` (binding Rust + napi-rs com
 * prebuilds, sem necessidade de toolchain de C++).
 *
 * Estratégia "session lock":
 *   - O Windows pode ter várias sessões SMTC simultâneas (ex.: Spotify +
 *     Chrome tocando vídeo). O `getCurrentSession()` do SO oscila entre elas
 *     e isso fazia o widget piscar entre as duas mídias.
 *   - Aqui lemos `getMediaSessions()` (lista completa) e mantemos um "lock"
 *     em uma sessão específica até ela perder relevância.
 *
 * Critérios para escolher a sessão preferida:
 *   1. Mantém a sessão atualmente lockada se ela ainda existe E:
 *      - está tocando, OU
 *      - está pausada há menos de SESSION_HOLD_MS
 *   2. Caso contrário, escolhe entre as outras a que está tocando E mais
 *      recentemente atualizada (`lastUpdatedTime` mais alto).
 *   3. Se nenhuma estiver tocando, prefere a sessão "current" do SO.
 *
 * Se o pacote não estiver instalado, o capturador degrada graciosamente.
 *
 * Requisitos: Windows 10 1809+ (>= 10.0.17763).
 */

const SESSION_HOLD_MS = 12_000;

class WindowsCapture extends BaseCapture {
  constructor(opts = {}) {
    super(opts);
    this._monitor = null;
    this._timer = null;
    this._lockedAppId = null;
    this._lockedPausedSinceMs = 0;
    this._lastSignature = '';
    this._SMTCMonitor = null;

    this._onMediaChanged = (appId) => this._refresh(appId, 'media');
    this._onPlaybackChanged = (appId) => this._refresh(appId, 'playback');
    this._onTimelineChanged = (appId) => this._refresh(appId, 'timeline');
    this._onCurrentSessionChanged = (appId) => this._refresh(appId, 'current');
    this._onSessionRemoved = (appId) => {
      if (appId && appId === this._lockedAppId) {
        this._lockedAppId = null;
        this._lockedPausedSinceMs = 0;
        this._lastSignature = '';
        // Re-elege na próxima leitura; se nada existir, emite lost.
        this._refresh(null, 'session-removed');
      }
    };
  }

  async _loadModule() {
    try {
      // eslint-disable-next-line global-require, import/no-unresolved
      return require('@coooookies/windows-smtc-monitor');
    } catch (err) {
      this.logger?.warn(
        'Pacote nativo @coooookies/windows-smtc-monitor não disponível.',
        'Instale com: npm install @coooookies/windows-smtc-monitor',
        err.message
      );
      return null;
    }
  }

  async start() {
    if (this.running) return;

    const mod = await this._loadModule();
    if (!mod || !mod.SMTCMonitor) {
      this.emit('error', new Error('windows-smtc-monitor indisponível'));
      return;
    }

    this._SMTCMonitor = mod.SMTCMonitor;

    try {
      this._monitor = new this._SMTCMonitor();
    } catch (err) {
      this.logger?.error('Falha ao instanciar SMTCMonitor:', err.message);
      this.emit('error', err);
      return;
    }

    this._monitor.on('session-media-changed', this._onMediaChanged);
    this._monitor.on('session-playback-changed', this._onPlaybackChanged);
    this._monitor.on('session-timeline-changed', this._onTimelineChanged);
    this._monitor.on('current-session-changed', this._onCurrentSessionChanged);
    this._monitor.on('session-removed', this._onSessionRemoved);

    this.running = true;
    this.logger?.info('Capturador SMTC (Windows) iniciado');

    this._refresh(null, 'init');

    const tick = () => {
      if (!this.running) return;
      try {
        this._refresh(null, 'tick');
      } catch (err) {
        this.logger?.warn('Erro no tick SMTC:', err.message);
      } finally {
        if (this.running) {
          this._timer = setTimeout(tick, this.pollIntervalMs);
        }
      }
    };
    this._timer = setTimeout(tick, this.pollIntervalMs);
  }

  async stop() {
    this.running = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    if (this._monitor) {
      try {
        this._monitor.off('session-media-changed', this._onMediaChanged);
        this._monitor.off('session-playback-changed', this._onPlaybackChanged);
        this._monitor.off('session-timeline-changed', this._onTimelineChanged);
        this._monitor.off('current-session-changed', this._onCurrentSessionChanged);
        this._monitor.off('session-removed', this._onSessionRemoved);
      } catch (_) { /* ignore */ }
      try { this._monitor.destroy?.(); } catch (_) { /* ignore */ }
      this._monitor = null;
    }
    this._lockedAppId = null;
    this._lockedPausedSinceMs = 0;
    this._lastSignature = '';
    this.logger?.info('Capturador SMTC (Windows) parado');
  }

  _listSessions() {
    if (!this._SMTCMonitor) return [];
    try {
      const list = this._SMTCMonitor.getMediaSessions?.();
      if (Array.isArray(list)) return list;
    } catch (_) { /* ignore */ }
    return [];
  }

  _getCurrentSessionAppId() {
    if (!this._SMTCMonitor) return null;
    try {
      const cur = this._SMTCMonitor.getCurrentMediaSession?.();
      return cur ? cur.sourceAppId : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Decide qual sessão usar. Implementa o "session lock":
   *  - mantém a lockada enquanto ela for relevante (tocando ou pausada há pouco)
   *  - troca para outra que esteja tocando se a atual foi abandonada
   *
   * @param {Array<object>} sessions
   * @returns {object|null}
   */
  _pickPreferredSession(sessions) {
    if (!sessions || sessions.length === 0) return null;

    const now = Date.now();
    const currentAppId = this._getCurrentSessionAppId();

    const playing = sessions.filter((s) => this._isPlaying(s));
    const lockedSession = this._lockedAppId
      ? sessions.find((s) => s.sourceAppId === this._lockedAppId)
      : null;

    // 1) Lock vigente: ainda tocando? mantém.
    if (lockedSession && this._isPlaying(lockedSession)) {
      this._lockedPausedSinceMs = 0;
      return lockedSession;
    }

    // 2) Lock vigente mas pausado: mantém se foi pausada há pouco.
    if (lockedSession) {
      if (!this._lockedPausedSinceMs) this._lockedPausedSinceMs = now;
      const pausedFor = now - this._lockedPausedSinceMs;
      if (pausedFor < SESSION_HOLD_MS) return lockedSession;
      // expirou o hold — vai re-eleger logo abaixo
    }

    // 3) Re-eleição: prefere uma sessão tocando, mais recentemente atualizada
    let candidate = null;
    if (playing.length > 0) {
      candidate = playing.reduce((best, s) => {
        if (!best) return s;
        return (s.lastUpdatedTime || 0) > (best.lastUpdatedTime || 0) ? s : best;
      }, null);
    } else if (currentAppId) {
      candidate = sessions.find((s) => s.sourceAppId === currentAppId) || sessions[0];
    } else {
      candidate = sessions[0];
    }

    if (candidate && candidate.sourceAppId !== this._lockedAppId) {
      this._lockedAppId = candidate.sourceAppId;
      this._lockedPausedSinceMs = this._isPlaying(candidate) ? 0 : now;
      this._lastSignature = '';
      this.logger?.debug?.(`Session lock → ${candidate.sourceAppId}`);
    }

    return candidate;
  }

  // eslint-disable-next-line class-methods-use-this
  _isPlaying(session) {
    if (!session || !session.playback) return false;
    return this._mapPlaybackStatus(session.playback.playbackStatus) === 'playing';
  }

  _refresh(_appId, reason) {
    const sessions = this._listSessions();
    const session = this._pickPreferredSession(sessions);

    if (!session) {
      if (this._lockedAppId) {
        this._lockedAppId = null;
        this._lockedPausedSinceMs = 0;
        this._lastSignature = '';
        this.emit('lost');
      }
      return;
    }

    const media = session.media || {};
    const playback = session.playback || {};
    const timeline = session.timeline || {};

    const playbackStatus = this._mapPlaybackStatus(playback.playbackStatus);
    const paused = playbackStatus !== 'playing';

    const positionSec = Number(timeline.position || 0);
    const durationSec = Number(timeline.duration || 0);

    const coverBuffer = Buffer.isBuffer(media.thumbnail) ? media.thumbnail : null;
    const coverMime = this._sniffMime(coverBuffer);

    const signature = [
      session.sourceAppId || '',
      media.title || '',
      media.artist || '',
      media.albumTitle || '',
      paused ? '1' : '0',
      coverBuffer ? coverBuffer.length : 0,
    ].join('|');

    const payload = {
      sourceAppUserModelId: this._friendlyAppName(session.sourceAppId),
      title: media.title || '',
      artist: media.artist || '',
      album: media.albumTitle || '',
      duration: Math.floor(durationSec),
      position: Math.floor(positionSec),
      paused,
      playbackStatus,
      coverBuffer,
      coverMime,
      _reason: reason,
      _signature: signature,
      _signatureChanged: signature !== this._lastSignature,
    };

    this._lastSignature = signature;
    this.emit('snapshot', payload);
  }

  // eslint-disable-next-line class-methods-use-this
  _mapPlaybackStatus(raw) {
    // 0 Closed, 1 Opened, 2 Changing, 3 Stopped, 4 Playing, 5 Paused
    switch (raw) {
      case 4: return 'playing';
      case 5: return 'paused';
      case 3: return 'stopped';
      case 1:
      case 2: return 'unknown';
      default: return 'unknown';
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _sniffMime(buf) {
    if (!buf || buf.length < 4) return 'image/png';
    if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
    if (buf[0] === 0x42 && buf[1] === 0x4D) return 'image/bmp';
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
    return 'image/png';
  }

  // eslint-disable-next-line class-methods-use-this
  _friendlyAppName(appId) {
    if (!appId) return 'Unknown';
    const known = [
      [/spotify/i, 'Spotify'],
      [/chrome/i, 'Chrome'],
      [/msedge|edge/i, 'Edge'],
      [/firefox/i, 'Firefox'],
      [/opera/i, 'Opera'],
      [/brave/i, 'Brave'],
      [/zunemusic|groove/i, 'Groove Music'],
      [/applemusic|itunes/i, 'Apple Music'],
      [/foobar/i, 'foobar2000'],
      [/vlc/i, 'VLC'],
      [/potplayer/i, 'PotPlayer'],
      [/youtube\s*music/i, 'YouTube Music'],
      [/deezer/i, 'Deezer'],
      [/tidal/i, 'Tidal'],
      [/soundcloud/i, 'SoundCloud'],
      [/dragon/i, 'Dragon SX2000'],
    ];
    for (const [re, name] of known) {
      if (re.test(appId)) return name;
    }
    const cleaned = appId.replace(/\.exe$/i, '').replace(/_.*$/, '');
    return cleaned || appId;
  }
}

module.exports = WindowsCapture;
