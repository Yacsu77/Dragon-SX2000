'use strict';

const { isDragGhost } = require('../contracts/IDragGhost');

/**
 * DragGhost — BrowserWindow transparente que segue o cursor no drag de abas.
 *
 * Não faz: resolve de drop, IPC de move-tab, create da janela principal.
 *
 * @implements {import('../contracts/IDragGhost').IDragGhost}
 */
class DragGhost {
  /**
   * @param {{
   *   BrowserWindow: typeof import('electron').BrowserWindow,
   *   screen: Electron.Screen,
   * }} deps
   */
  constructor({ BrowserWindow, screen }) {
    this._BrowserWindow = BrowserWindow;
    this._screen = screen;
    /** @type {Electron.BrowserWindow|null} */
    this._win = null;
    this._followTimer = null;
    this._meta = { offsetX: 40, offsetY: 14, mode: 'tab' };
  }

  isGhostWindow(win) {
    return Boolean(this._win && win === this._win);
  }

  _escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _buildHtml(payload) {
    const title = this._escapeHtml(payload.title || 'Aba');
    const favicon = payload.favicon ? String(payload.favicon) : '';
    const thumb = payload.thumbnail ? String(payload.thumbnail) : '';
    const mode = payload.mode || 'tab';
    const faviconHtml = favicon
      ? `<img class="icon" src="${this._escapeHtml(favicon)}" alt="" />`
      : `<span class="icon-fallback">•</span>`;
    const bodyHtml =
      mode === 'detach' && thumb
        ? `<div class="shot"><img src="${this._escapeHtml(thumb)}" alt="" /></div>`
        : mode === 'detach'
          ? `<div class="shot hint">Nova janela</div>`
          : `<div class="row">${faviconHtml}<span class="title">${title}</span></div>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<style>
  html,body{margin:0;padding:0;background:transparent;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
  .ghost{box-sizing:border-box;width:100%;height:100%;border-radius:12px;background:linear-gradient(to bottom,rgba(100,100,100,.95),rgba(80,80,80,.92));
    box-shadow:0 10px 28px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.2);color:#fff;display:flex;align-items:stretch;overflow:hidden;}
  .ghost.transfer{box-shadow:0 10px 28px rgba(0,0,0,.45),0 0 0 2px rgba(120,180,255,.9);}
  .ghost.detach{flex-direction:column;}
  .row{display:flex;align-items:center;gap:8px;padding:6px 10px 6px 12px;width:100%;}
  .icon{width:14px;height:14px;object-fit:contain;flex:0 0 auto;}
  .icon-fallback{width:14px;text-align:center;opacity:.7;}
  .title{flex:1;min-width:0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .shot{flex:1;background:#0e0e12;display:flex;align-items:center;justify-content:center;}
  .shot img{width:100%;height:100%;object-fit:cover;object-position:top center;}
  .hint{font-size:11px;color:rgba(255,255,255,.55);}
</style></head><body>
<div class="ghost ${this._escapeHtml(mode)}" id="g">${bodyHtml}</div>
<script>
  window.__setMode = function(mode){
    var el = document.getElementById('g');
    if(!el) return;
    el.className = 'ghost ' + (mode || 'tab');
  };
</script>
</body></html>`;
  }

  _stopFollow() {
    if (this._followTimer) {
      clearInterval(this._followTimer);
      this._followTimer = null;
    }
  }

  end() {
    this._stopFollow();
    if (this._win && !this._win.isDestroyed()) {
      try {
        this._win.close();
      } catch (_) {
        /* ignore */
      }
    }
    this._win = null;
  }

  _ensureWindow() {
    if (this._win && !this._win.isDestroyed()) return this._win;
    this._win = new this._BrowserWindow({
      width: 180,
      height: 36,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      focusable: false,
      show: false,
      hasShadow: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    try {
      this._win.setIgnoreMouseEvents(true, { forward: true });
    } catch (_) {
      this._win.setIgnoreMouseEvents(true);
    }
    this._win.on('closed', () => {
      this._win = null;
      this._stopFollow();
    });
    return this._win;
  }

  _followCursor() {
    this._stopFollow();
    this._followTimer = setInterval(() => {
      if (!this._win || this._win.isDestroyed()) {
        this._stopFollow();
        return;
      }
      const point = this._screen.getCursorScreenPoint();
      const x = Math.round(point.x - (this._meta.offsetX || 40));
      const y = Math.round(point.y - (this._meta.offsetY || 14));
      try {
        this._win.setPosition(x, y, false);
      } catch (_) {
        /* ignore */
      }
    }, 16);
  }

  start(payload = {}) {
    const win = this._ensureWindow();
    const mode = payload.mode || 'tab';
    const width =
      mode === 'detach' ? 168 : Math.max(80, Number(payload.width) || 160);
    const height =
      mode === 'detach' ? 128 : Math.max(28, Number(payload.height) || 32);
    this._meta = {
      offsetX: Number(payload.offsetX) || Math.round(width / 2),
      offsetY: Number(payload.offsetY) || Math.round(height / 2),
      mode,
    };

    const html = this._buildHtml({
      title: payload.title,
      favicon: payload.favicon,
      thumbnail: payload.thumbnail,
      mode,
    });

    win.setSize(Math.round(width), Math.round(height), false);
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const point = this._screen.getCursorScreenPoint();
    win.setPosition(
      Math.round(point.x - this._meta.offsetX),
      Math.round(point.y - this._meta.offsetY),
      false
    );
    if (!win.isVisible()) win.showInactive();
    this._followCursor();
  }

  update(payload = {}) {
    if (!this._win || this._win.isDestroyed()) return;
    const mode = payload.mode || 'tab';
    const prevMode = this._meta.mode;
    this._meta.mode = mode;
    const width =
      mode === 'detach'
        ? 168
        : Math.max(80, Number(payload.width) || this._win.getSize()[0]);
    const height =
      mode === 'detach'
        ? 128
        : Math.max(28, Number(payload.height) || this._win.getSize()[1]);
    try {
      this._win.setSize(Math.round(width), Math.round(height), false);
      // Só reconstrói HTML quando o modo muda (evita ghost “sumindo” a cada frame)
      if (mode !== prevMode) {
        const html = this._buildHtml({
          title: payload.title,
          favicon: payload.favicon,
          thumbnail: payload.thumbnail,
          mode,
        });
        this._win.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
        );
      } else {
        this._win.webContents
          .executeJavaScript(
            `window.__setMode && window.__setMode(${JSON.stringify(mode)})`,
            true
          )
          .catch(() => {});
      }
    } catch (_) {
      /* ignore */
    }
  }
}

function createDragGhost(deps) {
  const ghost = new DragGhost(deps);
  if (!isDragGhost(ghost)) {
    throw new Error('DragGhost não satisfaz IDragGhost');
  }
  return ghost;
}

module.exports = { DragGhost, createDragGhost };
