'use strict';

const http = require('http');
const { WebSocketServer: WSServer } = require('ws');

const { InternalEvents, WsEvents } = require('../events/eventNames');

/**
 * Servidor WebSocket local do Dragon Media SDK.
 *
 * Escuta em 127.0.0.1:8974 (configurável). Sobe um servidor HTTP "simples"
 * apenas para anexar o WebSocket e responder um GET /health para diagnóstico.
 *
 * Eventos enviados aos clientes (conforme spec):
 *   - hello           (handshake inicial com snapshot atual, se houver)
 *   - media_change    (mudança de faixa)
 *   - media_play      (retomada de reprodução)
 *   - media_pause     (pausa de reprodução)
 *   - media_progress  (atualização de posição)
 *   - media_stop      (sessão encerrada)
 */
class WebSocketServer {
  /**
   * @param {object} opts
   * @param {import('../core/DragonMediaCore')} opts.core
   * @param {import('../control/BaseController')} [opts.controller]
   * @param {string} [opts.host='127.0.0.1']
   * @param {number} [opts.port=8974]
   * @param {boolean} [opts.corsEnabled=true]
   * @param {object} [opts.logger]
   */
  constructor(opts) {
    if (!opts?.core) throw new Error('core é obrigatório');
    this.core = opts.core;
    this.controller = opts.controller || null;
    this.host = opts.host || '127.0.0.1';
    this.port = opts.port || 8974;
    this.corsEnabled = opts.corsEnabled !== false;
    this.logger = opts.logger?.child?.('WS') || opts.logger;

    this.httpServer = null;
    this.wss = null;
    this._unsubscribers = [];
  }

  async start() {
    if (this.wss) return;

    this.httpServer = http.createServer((req, res) => this._handleHttp(req, res));
    this.wss = new WSServer({ server: this.httpServer, path: '/' });

    this.wss.on('connection', (socket, req) => this._onConnection(socket, req));
    this.wss.on('error', (err) => this.logger?.error('WSS error:', err.message));

    this._wireCoreEvents();

    await new Promise((resolve, reject) => {
      const onError = (err) => reject(err);
      this.httpServer.once('error', onError);
      this.httpServer.listen(this.port, this.host, () => {
        this.httpServer.removeListener('error', onError);
        resolve();
      });
    });

    this.logger?.info(`WebSocket Server ouvindo em ws://${this.host}:${this.port}`);
  }

  async stop() {
    this._unsubscribers.forEach((u) => u());
    this._unsubscribers = [];

    if (this.wss) {
      for (const client of this.wss.clients) {
        try { client.close(1001, 'server-shutdown'); } catch (_) { /* ignore */ }
      }
      await new Promise((resolve) => this.wss.close(() => resolve()));
      this.wss = null;
    }
    if (this.httpServer) {
      await new Promise((resolve) => this.httpServer.close(() => resolve()));
      this.httpServer = null;
    }
    this.logger?.info('WebSocket Server encerrado');
  }

  _handleHttp(req, res) {
    if (this.corsEnabled) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/health' || req.url === '/') {
      const snapshot = this.core.getSnapshot();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        sdk: 'dragon-media-sdk',
        version: '1.0.0',
        clients: this.wss ? this.wss.clients.size : 0,
        snapshot,
      }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  }

  _onConnection(socket, req) {
    const ip = req.socket.remoteAddress;
    this.logger?.info(`Cliente conectado: ${ip} (total: ${this.wss.clients.size})`);

    // Handshake: envia snapshot atual se já houver mídia ativa
    const snapshot = this.core.getSnapshot();
    this._send(socket, WsEvents.HELLO, {
      sdk: 'dragon-media-sdk',
      version: '1.0.0',
      hasSession: !!snapshot,
      snapshot,
      hasController: !!this.controller,
    });

    if (snapshot) {
      this._send(socket, WsEvents.MEDIA_CHANGE, snapshot);
    }

    socket.on('message', (raw) => this._onClientMessage(socket, raw));

    socket.on('close', () => {
      this.logger?.debug?.(`Cliente desconectado (restantes: ${this.wss.clients.size})`);
    });

    socket.on('error', (err) => {
      this.logger?.warn('Erro no socket cliente:', err.message);
    });
  }

  /**
   * Mensagens aceitas do cliente:
   *
   *   { type: "command", action: "play_pause" | "play" | "pause" | "next" | "prev" | "stop", id?: string }
   *
   * Resposta: `command_result` com `{ ok, action, error?, id? }`.
   */
  async _onClientMessage(socket, raw) {
    let parsed;
    try {
      parsed = JSON.parse(raw.toString());
    } catch (_) {
      return;
    }
    if (!parsed || typeof parsed !== 'object') return;

    if (parsed.type === 'command') {
      const action = parsed.action;
      const id = parsed.id;
      this.logger?.info?.(`◀ recebido comando do cliente: '${action}' (id=${id})`);
      if (!this.controller) {
        this._send(socket, 'command_result', {
          ok: false, error: 'controller_unavailable', action, id,
        });
        return;
      }
      try {
        const result = await this.controller.send(action);
        this._send(socket, 'command_result', { ...result, id });
      } catch (err) {
        this.logger?.warn?.(`erro ao executar '${action}':`, err.message);
        this._send(socket, 'command_result', {
          ok: false, error: err.message, action, id,
        });
      }
    }
  }

  _wireCoreEvents() {
    const sub = (event, handler) => {
      this.core.bus.on(event, handler);
      this._unsubscribers.push(() => this.core.bus.off(event, handler));
    };

    sub(InternalEvents.TRACK_CHANGED, ({ snapshot }) => {
      this._broadcast(WsEvents.MEDIA_CHANGE, snapshot);
    });

    sub(InternalEvents.PLAYBACK_PAUSED, ({ snapshot }) => {
      this._broadcast(WsEvents.MEDIA_PAUSE, {
        paused: true,
        position: snapshot?.position ?? 0,
        timestamp: snapshot?.timestamp ?? Date.now(),
      });
    });

    sub(InternalEvents.PLAYBACK_RESUMED, ({ snapshot }) => {
      this._broadcast(WsEvents.MEDIA_PLAY, {
        paused: false,
        position: snapshot?.position ?? 0,
        timestamp: snapshot?.timestamp ?? Date.now(),
      });
    });

    sub(InternalEvents.POSITION_UPDATED, ({ snapshot }) => {
      this._broadcast(WsEvents.MEDIA_PROGRESS, {
        position: snapshot?.position ?? 0,
        duration: snapshot?.duration ?? 0,
        paused: !!snapshot?.paused,
        timestamp: snapshot?.timestamp ?? Date.now(),
      });
    });

    sub(InternalEvents.PLAYBACK_STOPPED, ({ snapshot }) => {
      this._broadcast(WsEvents.MEDIA_STOP, {
        lastApp: snapshot?.app || '',
        timestamp: Date.now(),
      });
    });

    sub(InternalEvents.ERROR, ({ error }) => {
      this._broadcast(WsEvents.ERROR, { error });
    });
  }

  _broadcast(event, data) {
    if (!this.wss) return;
    const msg = JSON.stringify({ event, data });
    for (const client of this.wss.clients) {
      if (client.readyState === 1 /* OPEN */) {
        try { client.send(msg); } catch (_) { /* ignore */ }
      }
    }
  }

  _send(socket, event, data) {
    try {
      socket.send(JSON.stringify({ event, data }));
    } catch (_) { /* ignore */ }
  }
}

module.exports = WebSocketServer;
