/**
 * Dragon Media Bridge
 *
 * Cliente WebSocket que conecta ao Dragon Media SDK rodando localmente
 * (`ws://127.0.0.1:8974`) e republica os eventos de mídia para o resto da
 * aplicação por meio de:
 *
 *   - `window.DragonMedia.snapshot`           snapshot atual (ou null)
 *   - `window.DragonMedia.connected`          status da conexão
 *   - `window.DragonMedia.on(event, fn)`      assinar eventos
 *   - `window.DragonMedia.off(event, fn)`     desinscrever
 *   - `document` recebe `dragon-media:<evento>` (CustomEvent) com `detail`
 *
 * Eventos repassados (mesmos do SDK):
 *   hello | media_change | media_play | media_pause | media_progress |
 *   media_stop | error | connected | disconnected
 *
 * Reconexão automática com backoff exponencial limitado.
 */
(function () {
  const SDK_URL = "ws://127.0.0.1:8974";
  const RECONNECT_MIN_MS = 800;
  const RECONNECT_MAX_MS = 8000;

  const listeners = new Map();
  let socket = null;
  let reconnectDelay = RECONNECT_MIN_MS;
  let reconnectTimer = null;
  let manualClose = false;
  let commandSeq = 0;
  const pendingCommands = new Map();

  const state = {
    snapshot: null,
    connected: false,
    hasController: false,
    lastEvent: null,
  };

  function emit(event, detail) {
    state.lastEvent = { event, detail, at: Date.now() };
    const set = listeners.get(event);
    if (set) {
      set.forEach((fn) => {
        try { fn(detail); } catch (err) { console.error("[DragonMedia] listener:", err); }
      });
    }
    try {
      document.dispatchEvent(new CustomEvent(`dragon-media:${event}`, { detail }));
    } catch (_) { /* ignore */ }
  }

  function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => off(event, fn);
  }

  function off(event, fn) {
    const set = listeners.get(event);
    if (set) set.delete(fn);
  }

  function applyMessage(event, data) {
    switch (event) {
      case "hello":
        if (data && data.snapshot) state.snapshot = data.snapshot;
        if (data && typeof data.hasController === "boolean") {
          state.hasController = data.hasController;
        }
        break;
      case "command_result":
        if (data && data.id && pendingCommands.has(data.id)) {
          const resolver = pendingCommands.get(data.id);
          pendingCommands.delete(data.id);
          resolver(data);
        }
        return;
      case "media_change":
        state.snapshot = data || null;
        break;
      case "media_play":
        if (state.snapshot) {
          state.snapshot = {
            ...state.snapshot,
            paused: false,
            position: typeof data?.position === "number" ? data.position : state.snapshot.position,
          };
        }
        break;
      case "media_pause":
        if (state.snapshot) {
          state.snapshot = {
            ...state.snapshot,
            paused: true,
            position: typeof data?.position === "number" ? data.position : state.snapshot.position,
          };
        }
        break;
      case "media_progress":
        if (state.snapshot) {
          state.snapshot = {
            ...state.snapshot,
            position: typeof data?.position === "number" ? data.position : state.snapshot.position,
            duration: typeof data?.duration === "number" && data.duration > 0
              ? data.duration
              : state.snapshot.duration,
            paused: typeof data?.paused === "boolean" ? data.paused : state.snapshot.paused,
          };
        }
        break;
      case "media_stop":
        state.snapshot = null;
        break;
      default:
        break;
    }
  }

  function scheduleReconnect() {
    if (manualClose) return;
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelay);
    reconnectDelay = Math.min(RECONNECT_MAX_MS, reconnectDelay * 2);
  }

  function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    try {
      socket = new WebSocket(SDK_URL);
    } catch (err) {
      scheduleReconnect();
      return;
    }

    socket.addEventListener("open", () => {
      state.connected = true;
      reconnectDelay = RECONNECT_MIN_MS;
      emit("connected", { url: SDK_URL });
    });

    socket.addEventListener("close", () => {
      state.connected = false;
      emit("disconnected", null);
      scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      try { socket.close(); } catch (_) { /* ignore */ }
    });

    socket.addEventListener("message", (msg) => {
      let parsed;
      try {
        parsed = JSON.parse(msg.data);
      } catch (_) {
        return;
      }
      if (!parsed || typeof parsed !== "object") return;
      const { event, data } = parsed;
      if (!event) return;
      applyMessage(event, data);
      emit(event, data);
    });
  }

  function disconnect() {
    manualClose = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      try { socket.close(); } catch (_) { /* ignore */ }
      socket = null;
    }
    state.connected = false;
  }

  /**
   * Envia um comando de mídia ao SDK (play/pause/next/prev/stop).
   * Resolve com `{ ok, action, error? }` quando o servidor responder.
   * Timeout de 2s caso o SDK não responda.
   */
  function command(action) {
    return new Promise((resolve) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        resolve({ ok: false, error: "disconnected", action });
        return;
      }
      const id = `cmd-${Date.now()}-${++commandSeq}`;
      pendingCommands.set(id, resolve);
      setTimeout(() => {
        if (pendingCommands.has(id)) {
          pendingCommands.delete(id);
          resolve({ ok: false, error: "timeout", action });
        }
      }, 2000);
      try {
        socket.send(JSON.stringify({ type: "command", action, id }));
      } catch (err) {
        pendingCommands.delete(id);
        resolve({ ok: false, error: err.message, action });
      }
    });
  }

  function start() {
    manualClose = false;
    connect();
  }

  window.DragonMedia = {
    get snapshot() { return state.snapshot; },
    get connected() { return state.connected; },
    get hasController() { return state.hasController; },
    on,
    off,
    start,
    disconnect,
    command,
    url: SDK_URL,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
