(function () {
  const SETTINGS_KEY = "settingsAUTO";
  const LEGACY_KEY = "autotuneCosmetics";
  const MIN_W = 140;
  const MIN_H = 100;
  const TYPES = ["timer", "share", "tasklist"];
  const TITLES = { timer: "Timer", share: "Share", tasklist: "Tasklist" };
  const FUSION_TYPE = "focusflow";
  const FUSION_RATIO_TRIGGER = 0.35;

  if (document.body && document.body.dataset) {
    const path = window.location.pathname || "";
    if (path.includes("AutoTune/index.html")) {
      document.body.dataset.widget = "AutoTune";
    }
  }

  function emptyState() {
    return { timer: null, share: null, tasklist: null };
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

  function overlapRatio(a, b) {
    const r1 = getRect(a);
    const r2 = getRect(b);
    const ix = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
    const iy = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
    const inter = ix * iy;
    if (inter <= 0) return 0;
    const aArea = Math.max(1, (r1.right - r1.left) * (r1.bottom - r1.top));
    const bArea = Math.max(1, (r2.right - r2.left) * (r2.bottom - r2.top));
    return inter / Math.min(aArea, bArea);
  }

  function unionRect(a, b) {
    const r1 = getRect(a);
    const r2 = getRect(b);
    return {
      left: Math.min(r1.left, r2.left),
      top: Math.min(r1.top, r2.top),
      right: Math.max(r1.right, r2.right),
      bottom: Math.max(r1.bottom, r2.bottom)
    };
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
    wrap.dataset.factoryKey = `autotune-widget-${type}`;
    wrap.innerHTML = `
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

  function removeFusion(root) {
    const fusion = root.querySelector(`.floating-widget[data-widget-type="${FUSION_TYPE}"]`);
    if (fusion) fusion.remove();
  }

  function fusionExists(root) {
    return !!root.querySelector(`.floating-widget[data-widget-type="${FUSION_TYPE}"]`);
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

  function attachDragResize(el, root, onInteractionEnd) {
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

    el.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("button, a, input, select, textarea, .floating-widget-resize")) return;
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
        let handled = false;
        if (typeof onInteractionEnd === "function") {
          handled = onInteractionEnd(el) === true;
        }
        if (!handled) {
          resolveOverlap(el, root);
          if (typeof onInteractionEnd === "function") {
            onInteractionEnd(el);
          }
        }
      }
      drag = false;
      resize = false;
    });

    el.addEventListener("mousedown", () => bringToFront(el));
  }

  function initFusionBody(bodyEl, onFinish) {
    const pomodoroStore = window.AutoTunePomodoroStore && typeof window.AutoTunePomodoroStore.load === "function"
      ? window.AutoTunePomodoroStore
      : { load: () => ({ workMinutes: 25, breakMinutes: 5 }) };
    const taskStore = window.AutoTuneTasklistStore && typeof window.AutoTuneTasklistStore.load === "function"
      ? window.AutoTuneTasklistStore
      : null;
    const formatDuration = taskStore && typeof taskStore.formatDuration === "function"
      ? taskStore.formatDuration
      : (ms) => `${Math.floor((ms || 0) / 1000)}s`;

    const settings = pomodoroStore.load();
    let workMinutes = Math.max(1, Number(settings.workMinutes) || 25);
    let breakMinutes = Math.max(1, Number(settings.breakMinutes) || 5);
    let phase = "work";
    let running = false;
    let remainingMs = workMinutes * 60 * 1000;
    let rafId = null;
    let lastTs = 0;
    let selectedTaskId = null;
    let draftText = "";
    let pendingTaskDeltaMs = 0;

    bodyEl.innerHTML = `
      <div class="autotune-fusion-wrap">
        <div class="autotune-fusion-timer">
          <div class="autotune-fusion-phase" data-role="phase">Foco</div>
          <div class="autotune-fusion-display" data-role="display">25:00</div>
          <div class="autotune-fusion-actions">
            <button type="button" class="autotune-timer-btn" data-action="start">Iniciar</button>
            <button type="button" class="autotune-timer-btn" data-action="pause">Pausar</button>
            <button type="button" class="autotune-timer-btn ghost" data-action="reset">Resetar</button>
          </div>
        </div>
        <div class="autotune-fusion-tasks">
          <div class="autotune-fusion-input-row">
            <input type="text" data-role="taskInput" placeholder="Adicionar tarefa..." />
            <button type="button" class="autotune-tasklist-add-btn" data-action="add">+</button>
          </div>
          <ul class="autotune-fusion-task-list" data-role="taskList"></ul>
          <button type="button" class="autotune-fusion-finish" data-action="finish">Finalizar</button>
        </div>
      </div>
    `;

    const displayEl = bodyEl.querySelector('[data-role="display"]');
    const phaseEl = bodyEl.querySelector('[data-role="phase"]');
    const inputEl = bodyEl.querySelector('[data-role="taskInput"]');
    const listEl = bodyEl.querySelector('[data-role="taskList"]');

    function loadTasks() {
      if (!taskStore) return { tasks: [], activeTaskId: null };
      return taskStore.load();
    }

    function saveTasks(state) {
      if (taskStore) {
        taskStore.save(state);
      }
    }

    function renderTasks() {
      const state = loadTasks();
      if (!selectedTaskId && state.activeTaskId) {
        selectedTaskId = state.activeTaskId;
      }
      if (!selectedTaskId && state.tasks[0]) {
        selectedTaskId = state.tasks[0].id;
      }
      if (state.tasks.length === 0) {
        listEl.innerHTML = `<li class="autotune-tasklist-empty">Crie uma tarefa para rastrear o tempo.</li>`;
        return;
      }
      listEl.innerHTML = state.tasks
        .map((task) => {
          const active = selectedTaskId === task.id ? " is-active" : "";
          const done = task.done ? " is-done" : "";
          return `
            <li class="autotune-tasklist-item${active}${done}" data-task-id="${task.id}">
              <button type="button" class="autotune-tasklist-text" data-action="select" data-task-id="${task.id}">${task.text}</button>
              <span class="autotune-tasklist-time">${formatDuration(task.totalMs || 0)}</span>
            </li>
          `;
        })
        .join("");
    }

    function updateTimerUi() {
      const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      displayEl.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
      phaseEl.textContent = phase === "work" ? "Foco" : "Pausa";
    }

    function switchPhase(nextPhase) {
      phase = nextPhase;
      remainingMs = (phase === "work" ? workMinutes : breakMinutes) * 60 * 1000;
      updateTimerUi();
    }

    function flushTaskDelta() {
      if (pendingTaskDeltaMs <= 0 || !selectedTaskId || phase !== "work") return;
      const state = loadTasks();
      const task = state.tasks.find((item) => item.id === selectedTaskId);
      if (!task) return;
      task.totalMs = Math.max(0, Number(task.totalMs || 0) + pendingTaskDeltaMs);
      state.activeTaskId = selectedTaskId;
      saveTasks(state);
      pendingTaskDeltaMs = 0;
      renderTasks();
    }

    function tick(ts) {
      if (!running) return;
      if (!lastTs) lastTs = ts;
      const delta = ts - lastTs;
      lastTs = ts;
      remainingMs -= delta;
      if (selectedTaskId && phase === "work" && delta > 0) {
        pendingTaskDeltaMs += delta;
        if (pendingTaskDeltaMs >= 1000) {
          flushTaskDelta();
        }
      }
      if (remainingMs <= 0) {
        flushTaskDelta();
        switchPhase(phase === "work" ? "break" : "work");
      }
      updateTimerUi();
      rafId = requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(tick);
    }

    function pause() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      flushTaskDelta();
    }

    function reset() {
      pause();
      phase = "work";
      remainingMs = workMinutes * 60 * 1000;
      updateTimerUi();
    }

    function addTaskFromInput() {
      const nextText = String(inputEl.value || "").trim();
      if (!nextText) return;
      if (taskStore && typeof taskStore.addTask === "function") {
        taskStore.addTask(nextText);
      }
      inputEl.value = "";
      renderTasks();
    }

    bodyEl.addEventListener("click", (event) => {
      const actionEl = event.target.closest("[data-action]");
      if (!actionEl) return;
      const action = actionEl.getAttribute("data-action");
      const taskId = actionEl.getAttribute("data-task-id");
      if (action === "start") start();
      if (action === "pause") pause();
      if (action === "reset") reset();
      if (action === "add") addTaskFromInput();
      if (action === "select" && taskId) {
        selectedTaskId = taskId;
        const state = loadTasks();
        state.activeTaskId = selectedTaskId;
        saveTasks(state);
        renderTasks();
      }
      if (action === "finish") {
        pause();
        flushTaskDelta();
        if (typeof onFinish === "function") onFinish();
      }
    });

    inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addTaskFromInput();
      }
    });

    inputEl.addEventListener("input", () => {
      draftText = inputEl.value;
    });

    renderTasks();
    updateTimerUi();
    if (draftText) {
      inputEl.value = draftText;
    }
  }

  function splitFusion(root, fusionEl) {
    if (!fusionEl) return;
    const rect = getRect(fusionEl);
    fusionEl.remove();
    const halfW = Math.max(190, Math.floor((rect.right - rect.left - 12) / 2));
    const height = Math.max(180, rect.bottom - rect.top);
    const timerLayout = clampState(rect.left, rect.top, halfW, height);
    const taskLayout = clampState(rect.left + halfW + 12, rect.top, halfW, height);
    spawnWidget("timer", root, { x: timerLayout.x, y: timerLayout.y, w: timerLayout.w, h: timerLayout.h });
    spawnWidget("tasklist", root, { x: taskLayout.x, y: taskLayout.y, w: taskLayout.w, h: taskLayout.h });
  }

  function fuseTimerAndTasklist(root, timerEl, tasklistEl) {
    if (!timerEl || !tasklistEl || fusionExists(root)) return false;
    const u = unionRect(timerEl, tasklistEl);
    const w = Math.max(380, u.right - u.left);
    const h = Math.max(240, u.bottom - u.top);
    const clamped = clampState(u.left, u.top, w, h);

    timerEl.remove();
    tasklistEl.remove();

    const fusionEl = document.createElement("div");
    fusionEl.className = "floating-widget floating-widget--fusion";
    fusionEl.dataset.widgetId = `${FUSION_TYPE}-${Date.now()}`;
    fusionEl.dataset.widgetType = FUSION_TYPE;
    fusionEl.innerHTML = `
      <div class="floating-widget-body"></div>
      <div class="floating-widget-resize" aria-label="Redimensionar"></div>
    `;
    applyLayout(fusionEl, clamped);
    root.appendChild(fusionEl);
    bringToFront(fusionEl);

    const body = fusionEl.querySelector(".floating-widget-body");
    initFusionBody(body, () => {
      splitFusion(root, fusionEl);
      snapshotAll(root);
      syncPanelToggles();
    });

    attachDragResize(fusionEl, root, () => {
      snapshotAll(root);
      return false;
    });
    snapshotAll(root);
    syncPanelToggles();
    return true;
  }

  function maybeFuseByOverlap(root, movedEl) {
    if (!movedEl) return false;
    const movedType = movedEl.dataset.widgetType;
    if (movedType !== "timer" && movedType !== "tasklist") return false;
    const timerEl = root.querySelector('.floating-widget[data-widget-type="timer"]');
    const tasklistEl = root.querySelector('.floating-widget[data-widget-type="tasklist"]');
    if (!timerEl || !tasklistEl) return false;
    if (overlapRatio(timerEl, tasklistEl) < FUSION_RATIO_TRIGGER) return false;
    return fuseTimerAndTasklist(root, timerEl, tasklistEl);
  }

  function spawnWidget(type, root, initial) {
    if (!TYPES.includes(type)) return;
    if (type === "timer" || type === "tasklist") {
      removeFusion(root);
    }
    removeWidgetOfType(root, type);
    const id = initial && initial.id ? initial.id : `${type}-${Date.now()}`;
    const el = createWidgetElement(type, id);
    const b = getContentBounds();
    const defW = type === "timer" ? 230 : type === "tasklist" ? 260 : 220;
    const defH = type === "timer" ? 180 : type === "tasklist" ? 260 : 180;
    let x = initial ? initial.x : b.left + 24 + Math.random() * 40;
    let y = initial ? initial.y : b.top + 24 + Math.random() * 40;
    let w = initial ? initial.w : defW;
    let h = initial ? initial.h : defH;
    const c = clampState(x, y, w, h);
    applyLayout(el, c);
    bringToFront(el);
    root.appendChild(el);
    if (window.AutoTuneFactory && typeof window.AutoTuneFactory.applyPersistedToElement === "function") {
      window.AutoTuneFactory.applyPersistedToElement(el);
    }
    attachDragResize(el, root, (node) => {
      const fused = maybeFuseByOverlap(root, node);
      snapshotAll(root);
      syncPanelToggles();
      return fused;
    });
    if (!(type === "timer" || type === "tasklist")) {
      resolveOverlap(el, root);
    }
    snapshotAll(root);
    syncPanelToggles();
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

    if (!active && (type === "timer" || type === "tasklist")) {
      const fusion = root.querySelector(`.floating-widget[data-widget-type="${FUSION_TYPE}"]`);
      if (fusion) {
        splitFusion(root, fusion);
      }
    }

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
    removeFusion(root);
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
    getSettings: loadSettings,
    splitFusion: () => {
      const root = document.getElementById("floating-cosmetics-root");
      if (!root) return;
      const fusion = root.querySelector(`.floating-widget[data-widget-type="${FUSION_TYPE}"]`);
      if (fusion) {
        splitFusion(root, fusion);
        snapshotAll(root);
      }
    }
  };
})();
