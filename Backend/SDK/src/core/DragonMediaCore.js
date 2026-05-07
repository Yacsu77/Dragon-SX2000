'use strict';

const EventBus = require('../events/EventBus');
const { InternalEvents } = require('../events/eventNames');
const { createCaptureForPlatform } = require('../capture');
const { normalize, diffSnapshots } = require('../utils/normalize');

/**
 * Dragon Media Core
 *
 * Responsabilidades:
 *   - Gerenciar o capturador ativo do sistema operacional
 *   - Normalizar dados brutos para o Dragon Media Format
 *   - Manter o estado da sessão atual
 *   - Interpolar a posição em tempo real (o SMTC do Windows não tica)
 *   - Emitir eventos internos via EventBus
 *   - Tratar reconexões/perda de sessão
 */
class DragonMediaCore {
  /**
   * @param {object} [opts]
   * @param {object} [opts.logger]
   * @param {number} [opts.progressIntervalMs] Intervalo de emissão de progresso interpolado. Default 500ms.
   * @param {number} [opts.captureIntervalMs]  Intervalo do polling do capturador. Default 800.
   * @param {string} [opts.forcePlatform]      Força capturador (win32/darwin/null).
   */
  constructor(opts = {}) {
    this.logger = opts.logger?.child?.('Core') || opts.logger;
    this.bus = new EventBus();

    /** @type {import('../types/DragonMediaFormat').DragonMediaFormat | null} */
    this.snapshot = null;

    // Marca o tempo (Date.now) em que `snapshot.position` foi capturado pelo SO.
    // Usado para interpolar a posição entre updates do capturador.
    this._positionAnchorAt = 0;

    this._progressIntervalMs = opts.progressIntervalMs ?? 500;
    this._tickTimer = null;

    this.capture = createCaptureForPlatform({
      logger: this.logger?.child?.('Capture'),
      pollIntervalMs: opts.captureIntervalMs ?? 800,
      forcePlatform: opts.forcePlatform,
    });

    this._wireCapture();
  }

  _wireCapture() {
    this.capture.on('snapshot', (raw) => this._onRawSnapshot(raw));
    this.capture.on('lost', () => this._onSessionLost());
    this.capture.on('error', (err) => {
      this.logger?.warn('Erro no capturador:', err.message);
      this.bus.publish(InternalEvents.ERROR, { error: err.message });
    });
  }

  /**
   * Inicia a captura e o ciclo de vida do core.
   */
  async start() {
    this.logger?.info(`Iniciando capturador: ${this.capture.name}`);
    await this.capture.start();
    this._startTick();
  }

  /**
   * Encerra a captura e libera recursos.
   */
  async stop() {
    this._stopTick();
    await this.capture.stop();
    this.snapshot = null;
    this._positionAnchorAt = 0;
  }

  /**
   * Retorna um snapshot fresco (com `position` interpolada se estiver tocando).
   * @returns {import('../types/DragonMediaFormat').DragonMediaFormat | null}
   */
  getSnapshot() {
    if (!this.snapshot) return null;
    return this._snapshotWithInterpolatedPosition();
  }

  /**
   * Calcula a posição corrente interpolando do último anchor enquanto a faixa
   * estiver tocando. Não modifica `this.snapshot`.
   * @private
   */
  _snapshotWithInterpolatedPosition() {
    if (!this.snapshot) return null;
    const base = this.snapshot;
    if (base.paused || !this._positionAnchorAt) {
      return { ...base };
    }
    const elapsedSec = (Date.now() - this._positionAnchorAt) / 1000;
    let pos = (base.position || 0) + elapsedSec;
    if (base.duration > 0) pos = Math.min(pos, base.duration);
    if (pos < 0) pos = 0;
    return { ...base, position: Math.floor(pos), timestamp: Date.now() };
  }

  _onRawSnapshot(raw) {
    const next = normalize(raw);
    const prev = this.snapshot;
    const diff = diffSnapshots(prev, next);

    if (!prev || diff.trackChanged) {
      this.snapshot = next;
      this._positionAnchorAt = Date.now();
      this.bus.publish(InternalEvents.TRACK_CHANGED, { snapshot: next });
      return;
    }

    if (diff.pauseToggled) {
      this.snapshot = next;
      this._positionAnchorAt = Date.now();
      const event = next.paused
        ? InternalEvents.PLAYBACK_PAUSED
        : InternalEvents.PLAYBACK_RESUMED;
      this.bus.publish(event, { snapshot: next });
      this._emitProgressNow();
      return;
    }

    // Mesma faixa, mesmo estado: o capturador pode estar reportando uma posição
    // antiga (SMTC do Windows não tica). Só re-anchor se houver seek perceptível
    // (delta significativo em relação ao que esperaríamos pela interpolação).
    const expected = this._snapshotWithInterpolatedPosition();
    const expectedPos = expected ? expected.position : (prev.position || 0);
    const drift = Math.abs((next.position || 0) - expectedPos);

    // Atualizamos metadados (capa, etc.) mas preservamos o anchor de tempo
    // se o delta for pequeno (provavelmente é a mesma leitura cacheada do SO).
    const SEEK_THRESHOLD_SEC = 2;
    if (drift >= SEEK_THRESHOLD_SEC) {
      this.snapshot = next;
      this._positionAnchorAt = Date.now();
    } else {
      // Mantém o anchor; apenas refresca metadados que podem ter mudado
      // (ex.: cover carregou depois, duração corrigida).
      this.snapshot = {
        ...this.snapshot,
        cover: next.cover || this.snapshot.cover,
        duration: next.duration || this.snapshot.duration,
        app: next.app || this.snapshot.app,
        album: next.album || this.snapshot.album,
      };
    }
    // Não emitimos progresso aqui — o tick interno cuida disso.
  }

  /**
   * Loop interno que emite POSITION_UPDATED em intervalo fixo enquanto há
   * snapshot ativo e está tocando. Garante UX fluida mesmo sem ticks do SO.
   * @private
   */
  _startTick() {
    if (this._tickTimer) return;
    const tick = () => {
      try {
        if (this.snapshot && !this.snapshot.paused) {
          this._emitProgressNow();
        }
      } catch (err) {
        this.logger?.warn?.('Erro no tick do core:', err.message);
      } finally {
        this._tickTimer = setTimeout(tick, this._progressIntervalMs);
      }
    };
    this._tickTimer = setTimeout(tick, this._progressIntervalMs);
  }

  _stopTick() {
    if (this._tickTimer) {
      clearTimeout(this._tickTimer);
      this._tickTimer = null;
    }
  }

  _emitProgressNow() {
    const snapshot = this._snapshotWithInterpolatedPosition();
    if (!snapshot) return;
    this.bus.publish(InternalEvents.POSITION_UPDATED, { snapshot });
  }

  _onSessionLost() {
    if (!this.snapshot) return;
    const last = this.snapshot;
    this.snapshot = null;
    this._positionAnchorAt = 0;
    this.bus.publish(InternalEvents.PLAYBACK_STOPPED, { snapshot: last });
    this.bus.publish(InternalEvents.SESSION_LOST, { snapshot: last });
  }
}

module.exports = DragonMediaCore;
