(function () {
  const SETTINGS_KEY = "settingsAUTO";
  const LEGACY_KEY = "autotuneCosmetics";
  const MIN_W = 140;
  const MIN_H = 100;
  const TYPES = ["timer", "share"];
  const TITLES = { timer: "Timer", share: "Share" };

  if (document.body && document.body.dataset) {
    const path = window.location.pathname || "";
    if (path.includes("AutoTune/index.html")) {
      document.body.dataset.widget = "AutoTune";
    }
  }

  function emptyState() {
    return { timer: null, share: null };
  }

  function migrateLegacySettings() {
    if (localStorage.getItem(SETTINGS_KEY)) return;
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length === 0) return;
      const next = emptyState();
      arr.forEach((item) => {
        if (!item || !item.type || !next.hasOwnProperty(item.type)) return;
        if (next[item.type]) return;
        next[item.type] = {
          id: item.id || `${item.type}-migrated`,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          active: true
        };
      });
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignore */
    }
  }

  function loadSettings() {
    migrateLegacySettings();
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return emptyState();
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return emptyState();

      if (data.type && TYPES.includes(data.type) && data.timer === undefined) {
        const next = emptyState();
        next[data.type] = {
          id: data.id || `${data.type}-legacy`,
          x: data.x,
          y: data.y,
          w: data.w,
          h: data.h,
          active: data.active !== false
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
        return next;
      }

      const out = emptyState();
      TYPES.forEach((t) => {
        if (data[t] && typeof data[t] === "object") {
          out[t] = {
            id: data[t].id || `${t}-saved`,
            x: data[t].x,
            y: data[t].y,
            w: data[t].w,
            h: data[t].h,
            active: data[t].active !== false
          };
        }
      });
      return out;
    } catch {
      return emptyState();
    }
  }

  function saveSettings(state) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
  }

  function getContentBounds() {
    const nav = document.querySelector(".nav-bar");
    const tabs = document.querySelector(".tabs-bar");
    let top = 0;
    if (nav) top = Math.max(top, nav.getBoundingClientRect().bottom);
    if (tabs) top = Math.max(top, tabs.getBoundingClientRect().bottom);
    return {
      top,
      left: 0,
      right: window.innerWidth,
      bottom: window.innerHeight
    };
  }

  function clampState(x, y, w, h) {
    const b = getContentBounds();
    const maxW = b.right - b.left;
    const maxH = b.bottom - b.top;
    w = Math.max(MIN_W, Math.min(w, maxW));
    h = Math.max(MIN_H, Math.min(h, maxH));
    x = Math.max(b.left, Math.min(x, b.right - w));
    y = Math.max(b.top, Math.min(y, b.bottom - h));
    return { x, y, w, h };
  }

  function getRect(el) {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  }

  function resolveOverlap(el, root) {
    const others = root.querySelectorAll(".floating-widget");
    if (others.length <= 1) return;
    const self = getRect(el);
    let dx = 0;
    let dy = 0;
    const step = 12;
    for (let iter = 0; iter < 40; iter++) {
      let hit = false;
      others.forEach((other) => {
        if (other === el) return;
        const o = getRect(other);
        const test = {
          left: self.left + dx,
          top: self.top + dy,
          right: self.right + dx,
          bottom: self.bottom + dy
        };
        const overlap = !(
          test.right <= o.left ||
          test.left >= o.right ||
          test.bottom <= o.top ||
          test.top >= o.bottom
        );
        if (overlap) hit = true;
      });
      if (!hit) break;
      dx += step;
      if (dx > 200) {
        dx = 0;
        dy += step;
      }
    }
    let left = parseFloat(el.style.left) || 0;
    let top = parseFloat(el.style.top) || 0;
    left += dx;
    top += dy;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const next = clampState(left, top, w, h);
    el.style.left = `${next.x}px`;
    el.style.top = `${next.y}px`;
  }

  let zStack = 12;

  function bringToFront(el) {
    zStack += 1;
    el.style.zIndex = String(zStack);
  }

  function createWidgetElement(type, id) {
    const wrap = document.createElement("div");
    wrap.className = "floating-widget";
    wrap.dataset.widgetId = id;
    wrap.dataset.widgetType = type;
    const title = TITLES[type] || type;
    wrap.innerHTML = `
      <div class="floating-widget-header">
        <span class="floating-widget-title">${title}</span>
      </div>
      <div class="floating-widget-body"></div>
      <div class="floating-widget-resize" aria-label="Redimensionar"></div>
    `;
    const body = wrap.querySelector(".floating-widget-body");
    const factory = window.AutoTuneWidgets && window.AutoTuneWidgets[type];
    if (typeof factory === "function") {
      factory(body);
    }
    return wrap;
  }

  function applyLayout(el, state) {
    el.style.width = `${state.w}px`;
    el.style.height = `${state.h}px`;
    el.style.left = `${state.x}px`;
    el.style.top = `${state.y}px`;
  }

  function removeWidgetOfType(root, type) {
    const existing = root.querySelector(`.floating-widget[data-widget-type="${type}"]`);
    if (existing) existing.remove();
  }

  function snapshotAll(root) {
    const state = loadSettings();
    root.querySelectorAll(".floating-widget").forEach((node) => {
      const t = node.dataset.widgetType;
      if (!t || !state.hasOwnProperty(t)) return;
      state[t] = {
        id: node.dataset.widgetId,
        x: parseFloat(node.style.left) || 0,
        y: parseFloat(node.style.top) || 0,
        w: node.offsetWidth,
        h: node.offsetHeight,
        active: true
      };
    });
    saveSettings(state);
  }

  function attachDragResize(el, root, onChange) {
    const header = el.querySelector(".floating-widget-header");
    const handle = el.querySelector(".floating-widget-resize");

    let drag = false;
    let resize = false;
    let sx = 0;
    let sy = 0;
    let sl = 0;
    let st = 0;
    let sw = 0;
    let sh = 0;

    function readLayout() {
      return {
        x: parseFloat(el.style.left) || el.offsetLeft,
        y: parseFloat(el.style.top) || el.offsetTop,
        w: el.offsetWidth,
        h: el.offsetHeight
      };
    }

    header.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      drag = true;
      bringToFront(el);
      const r = readLayout();
      sx = e.clientX;
      sy = e.clientY;
      sl = r.x;
      st = r.y;
      e.preventDefault();
    });

    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      resize = true;
      bringToFront(el);
      const r = readLayout();
      sx = e.clientX;
      sy = e.clientY;
      sw = r.w;
      sh = r.h;
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener("mousemove", (e) => {
      if (drag) {
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        const r = readLayout();
        const c = clampState(sl + dx, st + dy, r.w, r.h);
        el.style.left = `${c.x}px`;
        el.style.top = `${c.y}px`;
      }
      if (resize) {
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        const pos = readLayout();
        const c = clampState(pos.x, pos.y, sw + dx, sh + dy);
        el.style.width = `${c.w}px`;
        el.style.height = `${c.h}px`;
      }
    });

    document.addEventListener("mouseup", () => {
      if (drag || resize) {
        resolveOverlap(el, root);
        if (typeof onChange === "function") onChange();
      }
      drag = false;
      resize = false;
    });

    el.addEventListener("mousedown", () => bringToFront(el));
  }

  function spawnWidget(type, root, initial) {
    if (!TYPES.includes(type)) return;
    removeWidgetOfType(root, type);
    const id = initial && initial.id ? initial.id : `${type}-${Date.now()}`;
    const el = createWidgetElement(type, id);
    const b = getContentBounds();
    const defW = type === "timer" ? 200 : 220;
    const defH = type === "timer" ? 130 : 180;
    let x = initial ? initial.x : b.left + 24 + Math.random() * 40;
    let y = initial ? initial.y : b.top + 24 + Math.random() * 40;
    let w = initial ? initial.w : defW;
    let h = initial ? initial.h : defH;
    const c = clampState(x, y, w, h);
    applyLayout(el, c);
    bringToFront(el);
    root.appendChild(el);
    attachDragResize(el, root, () => snapshotAll(root));
    resolveOverlap(el, root);
    snapshotAll(root);
  }

  function restore(root) {
    const settings = loadSettings();
    TYPES.forEach((t) => {
      const s = settings[t];
      if (!s || s.active === false || !window.AutoTuneWidgets || !window.AutoTuneWidgets[t]) return;
      spawnWidget(t, root, {
        id: s.id,
        x: s.x,
        y: s.y,
        w: s.w,
        h: s.h
      });
    });
  }

  function setPanelTypeActive(type, active, root) {
    const settings = loadSettings();
    if (!TYPES.includes(type) || !window.AutoTuneWidgets || !window.AutoTuneWidgets[type]) return;

    if (active) {
      const s = settings[type];
      const initial =
        s && typeof s.x === "number"
          ? { id: s.id, x: s.x, y: s.y, w: s.w, h: s.h }
          : undefined;
      spawnWidget(type, root, initial);
    } else {
      const el = root.querySelector(`.floating-widget[data-widget-type="${type}"]`);
      if (el) {
        settings[type] = {
          id: el.dataset.widgetId,
          x: parseFloat(el.style.left) || 0,
          y: parseFloat(el.style.top) || 0,
          w: el.offsetWidth,
          h: el.offsetHeight,
          active: false
        };
        el.remove();
        saveSettings(settings);
      } else if (settings[type]) {
        settings[type] = { ...settings[type], active: false };
        saveSettings(settings);
      }
    }
    syncPanelToggles();
  }

  function syncPanelToggles() {
    const settings = loadSettings();
    document.querySelectorAll("[data-autotune-panel-toggle]").forEach((input) => {
      const type = input.getAttribute("data-autotune-panel-toggle");
      if (!type || !TYPES.includes(type)) return;
      const s = settings[type];
      const on = !!(s && s.active === true);
      input.checked = on;
      const label = document.querySelector(`[data-autotune-panel-label="${type}"]`);
      if (label) label.textContent = on ? "Ativo" : "Inativo";
    });
  }

  function initPanelToggles(root) {
    document.querySelectorAll("[data-autotune-panel-toggle]").forEach((input) => {
      input.addEventListener("change", () => {
        const type = input.getAttribute("data-autotune-panel-toggle");
        if (!type) return;
        setPanelTypeActive(type, input.checked, root);
      });
    });

    document.addEventListener("click", (e) => {
      if (e.target.closest('a[href="#autotune-widget"]')) {
        requestAnimationFrame(syncPanelToggles);
      }
    });
    window.addEventListener("hashchange", () => {
      if (window.location.hash === "#autotune-widget") syncPanelToggles();
    });
  }

  function syncVisibilityFromHome() {
    const home = document.getElementById("homePage");
    const root = document.getElementById("floating-cosmetics-root");
    if (!root) return;
    if (!home) {
      root.classList.remove("floating-cosmetics--hidden");
      return;
    }
    const onHome = !home.classList.contains("hidden");
    root.classList.toggle("floating-cosmetics--hidden", !onHome);
  }

  window.setAutoTuneHomeVisible = function (visible) {
    const root = document.getElementById("floating-cosmetics-root");
    if (!root) return;
    root.classList.toggle("floating-cosmetics--hidden", !visible);
  };

  function boot() {
    const root = document.getElementById("floating-cosmetics-root");
    if (!root) return;
    restore(root);
    initPanelToggles(root);
    syncPanelToggles();
    syncVisibilityFromHome();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("resize", () => {
    const root = document.getElementById("floating-cosmetics-root");
    if (!root) return;
    root.querySelectorAll(".floating-widget").forEach((el) => {
      const x = parseFloat(el.style.left) || 0;
      const y = parseFloat(el.style.top) || 0;
      const c = clampState(x, y, el.offsetWidth, el.offsetHeight);
      el.style.left = `${c.x}px`;
      el.style.top = `${c.y}px`;
    });
    snapshotAll(root);
  });

  window.AutoTuneEngine = {
    spawnWidget,
    getContentBounds,
    getSettings: loadSettings
  };
})();
