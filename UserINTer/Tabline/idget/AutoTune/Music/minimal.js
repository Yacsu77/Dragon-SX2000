/**
 * AutoTune Music — modo minimalista (Beta)
 */
(function () {
  const STORAGE_KEY = "settingsAUTO";
  const DEFAULT_OFFSET_RIGHT = 10;
  const INNER_WIDTH = 168;
  const VOLUME_ZONE_WIDTH = 14;
  const TOTAL_WIDTH = INNER_WIDTH + VOLUME_ZONE_WIDTH;

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function readMusicSettings() {
    try {
      const raw = (window.UserStorage ? window.UserStorage.getItem(STORAGE_KEY) : localStorage.getItem(STORAGE_KEY));
      if (!raw) return {};
      const data = JSON.parse(raw);
      return (data && data.music && typeof data.music === "object") ? data.music : {};
    } catch {
      return {};
    }
  }

  function patchMusicSettings(patch) {
    try {
      const raw = (window.UserStorage ? window.UserStorage.getItem(STORAGE_KEY) : localStorage.getItem(STORAGE_KEY));
      const data = raw ? JSON.parse(raw) : {};
      if (!data.music || typeof data.music !== "object") {
        data.music = { id: "music-minimal", active: false };
      }
      data.music = { ...data.music, ...patch };
      (window.UserStorage ? window.UserStorage.setItem(STORAGE_KEY, JSON.stringify(data)) : localStorage.setItem(STORAGE_KEY, JSON.stringify(data)));
    } catch {
      /* ignore */
    }
  }

  function loadMusicMinimal() {
    return readMusicSettings().minimal === true;
  }

  function loadOffsetX() {
    const val = Number(readMusicSettings().minimalOffsetX);
    return Number.isFinite(val) ? Math.max(0, val) : 0;
  }

  function loadVolumeLevel() {
    const val = Number(readMusicSettings().minimalVolumeLevel);
    return Number.isFinite(val) ? Math.max(0, Math.min(100, val)) : 70;
  }

  function saveMusicMinimal(enabled) {
    patchMusicSettings({ minimal: !!enabled });
  }

  function saveOffsetX(offsetX) {
    patchMusicSettings({ minimalOffsetX: offsetX });
  }

  function saveVolumeLevel(level) {
    patchMusicSettings({ minimalVolumeLevel: level });
  }

  function getTabsBottom() {
    const tabs = document.querySelector(".tabs-bar");
    if (tabs && !tabs.classList.contains("hidden")) {
      return tabs.getBoundingClientRect().bottom;
    }
    const nav = document.querySelector(".nav-bar");
    if (nav) return nav.getBoundingClientRect().bottom;
    return 0;
  }

  function clampOffset(offsetX) {
    const max = Math.max(0, window.innerWidth - TOTAL_WIDTH - DEFAULT_OFFSET_RIGHT);
    return Math.max(0, Math.min(offsetX, max));
  }

  window.AutoTuneMusicMinimal = (function createModule() {
    let barEl = null;
    let refs = null;
    let cleanups = [];
    let volumeCloseTimer = null;
    let offsetX = loadOffsetX();
    let volumeLevel = loadVolumeLevel();
    let moveDragActive = false;
    let moveDragStartX = 0;
    let moveDragStartOffset = 0;
    let volumeDragActive = false;
    let lastVolumePointerY = null;
    let volumeApplying = false;

    function getMusicPosition() {
      const fromBody = document.body?.dataset?.musicPosition;
      if (fromBody === "left" || fromBody === "right" || fromBody === "bottom") return fromBody;
      const fromSettings = window.ChromeLayoutSettings?.read?.()?.musicPosition;
      if (fromSettings === "between") return "right";
      if (fromSettings === "left" || fromSettings === "right" || fromSettings === "bottom") return fromSettings;
      return "right";
    }

    function clearInlineSlots(exceptId) {
      ["navMusicSlotLeft", "navMusicSlotRight"].forEach((id) => {
        if (id === exceptId) return;
        const slot = document.getElementById(id);
        if (!slot) return;
        slot.setAttribute("aria-hidden", "true");
        if (barEl && barEl.parentElement === slot) {
          /* moved elsewhere */
        }
      });
    }

    function mountInline(bar, slotId, position) {
      const slot = document.getElementById(slotId);
      if (!slot) return false;

      clearInlineSlots(slotId);
      bar.classList.add("music-minimal-bar--inline");
      bar.dataset.musicPosition = position;
      bar.style.top = "";
      bar.style.right = "";
      bar.style.bottom = "";
      bar.style.left = "";
      bar.style.width = "";
      bar.style.position = "";
      if (bar.parentElement !== slot) slot.appendChild(bar);

      const move = bar.querySelector(".music-minimal-move");
      if (move) {
        move.hidden = true;
        move.style.display = "none";
      }

      slot.setAttribute("aria-hidden", bar.classList.contains("music-minimal-bar--visible") ? "false" : "true");
      return true;
    }

    function mountBottom(bar) {
      clearInlineSlots(null);
      offsetX = clampOffset(offsetX);
      bar.classList.remove("music-minimal-bar--inline");
      bar.dataset.musicPosition = "bottom";
      bar.style.top = `${getTabsBottom()}px`;
      bar.style.right = `${DEFAULT_OFFSET_RIGHT + offsetX}px`;
      bar.style.bottom = "";
      bar.style.left = "";
      bar.style.width = `${TOTAL_WIDTH}px`;
      bar.style.position = "fixed";

      const move = bar.querySelector(".music-minimal-move");
      if (move) {
        move.hidden = false;
        move.style.display = "";
      }

      if (bar.parentElement !== document.body) {
        document.body.appendChild(bar);
      }
    }

    function positionBar(bar) {
      if (!bar) return;
      const position = getMusicPosition();

      if (position === "left") {
        if (mountInline(bar, "navMusicSlotLeft", "left")) return;
      }
      if (position === "right") {
        if (mountInline(bar, "navMusicSlotRight", "right")) return;
      }

      mountBottom(bar);
    }

    async function sendCommand(action) {
      if (!window.DragonMedia || typeof window.DragonMedia.command !== "function") {
        return { ok: false };
      }
      try {
        return await window.DragonMedia.command(action);
      } catch (err) {
        console.warn("[Music Minimal] comando erro:", action, err);
        return { ok: false };
      }
    }

    function updateVolumeUI() {
      if (!refs || !refs.volumeFill || !refs.volumeThumb) return;
      refs.volumeFill.style.height = `${volumeLevel}%`;
      refs.volumeThumb.style.bottom = `calc(${volumeLevel}% - 4px)`;
    }

    function levelFromPointer(clientY) {
      if (!refs || !refs.volumeSlider) return volumeLevel;
      const rect = refs.volumeSlider.getBoundingClientRect();
      if (rect.height <= 0) return volumeLevel;
      const pct = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      return Math.round(pct * 100);
    }

    async function applyVolumeSteps(diff) {
      if (!diff) return;
      const action = diff > 0 ? "volume_up" : "volume_down";
      const steps = Math.max(1, Math.ceil(Math.abs(diff) / 5));
      for (let i = 0; i < steps; i++) {
        const result = await sendCommand(action);
        if (!result || !result.ok) break;
      }
    }

    async function applyVolumeAtPointer(clientY) {
      const target = levelFromPointer(clientY);
      if (target === volumeLevel) return;
      const diff = target - volumeLevel;
      volumeLevel = target;
      updateVolumeUI();
      await applyVolumeSteps(diff);
    }

    async function applyVolumeDrag(clientY) {
      if (volumeApplying) return;
      if (lastVolumePointerY === null) {
        lastVolumePointerY = clientY;
        return;
      }
      const dy = lastVolumePointerY - clientY;
      if (Math.abs(dy) < 5) return;

      const steps = Math.floor(Math.abs(dy) / 5);
      const action = dy > 0 ? "volume_up" : "volume_down";
      lastVolumePointerY = clientY;
      volumeApplying = true;

      try {
        for (let i = 0; i < steps; i++) {
          const result = await sendCommand(action);
          if (!result || !result.ok) break;
          volumeLevel = Math.max(0, Math.min(100, volumeLevel + (action === "volume_up" ? 5 : -5)));
          updateVolumeUI();
        }
      } finally {
        volumeApplying = false;
      }
    }

    function render(snapshot) {
      if (!refs || !barEl) return;

      const hasMedia = !!(snapshot && snapshot.title);
      const shouldShow = loadMusicMinimal() && hasMedia;
      barEl.classList.toggle("music-minimal-bar--visible", shouldShow);
      barEl.setAttribute("aria-hidden", shouldShow ? "false" : "true");
      ["navMusicSlotLeft", "navMusicSlotRight"].forEach((id) => {
        const slot = document.getElementById(id);
        if (!slot) return;
        const active = barEl.parentElement === slot && shouldShow;
        slot.setAttribute("aria-hidden", active ? "false" : "true");
      });
      positionBar(barEl);

      if (!hasMedia) {
        refs.title.textContent = "Sem mídia";
        refs.time.textContent = "0:00";
        refs.iconPlay.style.display = "";
        refs.iconPause.style.display = "none";
        return;
      }

      refs.title.textContent = snapshot.title;
      refs.time.textContent = fmtTime(snapshot.position);

      if (snapshot.paused) {
        refs.iconPlay.style.display = "";
        refs.iconPause.style.display = "none";
      } else {
        refs.iconPlay.style.display = "none";
        refs.iconPause.style.display = "";
      }
    }

    function refresh() {
      render(window.DragonMedia ? window.DragonMedia.snapshot : null);
    }

    function flashButton(target) {
      if (!target) return;
      target.classList.add("music-minimal-btn--flash");
      setTimeout(() => target.classList.remove("music-minimal-btn--flash"), 180);
    }

    function bindVolumeZone(zoneEl) {
      if (!zoneEl || !refs.volumeSlider) return;

      zoneEl.addEventListener("mouseenter", () => {
        if (volumeCloseTimer) {
          clearTimeout(volumeCloseTimer);
          volumeCloseTimer = null;
        }
        zoneEl.classList.add("music-minimal-volume-zone--open");
      });

      zoneEl.addEventListener("mouseleave", () => {
        volumeCloseTimer = setTimeout(() => {
          zoneEl.classList.remove("music-minimal-volume-zone--open");
        }, 260);
      });

      refs.volumeSlider.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 && event.pointerType === "mouse") return;
        volumeDragActive = true;
        lastVolumePointerY = event.clientY;
        zoneEl.classList.add("music-minimal-volume-zone--open");
        refs.volumeSlider.setPointerCapture(event.pointerId);
        applyVolumeAtPointer(event.clientY);
        event.preventDefault();
      });

      refs.volumeSlider.addEventListener("pointermove", (event) => {
        if (!volumeDragActive) return;
        applyVolumeDrag(event.clientY);
      });

      const endVolumeDrag = (event) => {
        if (!volumeDragActive) return;
        volumeDragActive = false;
        lastVolumePointerY = null;
        if (refs.volumeSlider.hasPointerCapture(event.pointerId)) {
          refs.volumeSlider.releasePointerCapture(event.pointerId);
        }
        saveVolumeLevel(volumeLevel);
      };

      refs.volumeSlider.addEventListener("pointerup", endVolumeDrag);
      refs.volumeSlider.addEventListener("pointercancel", endVolumeDrag);
    }

    function bindMoveZone(moveEl) {
      if (!moveEl) return;

      moveEl.addEventListener("mousedown", (event) => {
        if (event.button !== 0) return;
        if (getMusicPosition() !== "bottom") return;
        moveDragActive = true;
        moveDragStartX = event.clientX;
        moveDragStartOffset = offsetX;
        moveEl.classList.add("music-minimal-move--dragging");
        barEl.classList.add("music-minimal-bar--dragging");
        event.preventDefault();
      });

      document.addEventListener("mousemove", (event) => {
        if (!moveDragActive) return;
        const dx = moveDragStartX - event.clientX;
        offsetX = clampOffset(moveDragStartOffset + dx);
        positionBar(barEl);
      });

      document.addEventListener("mouseup", () => {
        if (!moveDragActive) return;
        moveDragActive = false;
        moveEl.classList.remove("music-minimal-move--dragging");
        barEl.classList.remove("music-minimal-bar--dragging");
        saveOffsetX(offsetX);
      });
    }

    function bindEvents() {
      if (!barEl) return;

      barEl.addEventListener("click", async (event) => {
        const target = event.target.closest("[data-action]");
        if (!target) return;
        const action = target.getAttribute("data-action");
        if (!action) return;

        flashButton(target);

        if (action === "play_pause" && window.DragonMedia && window.DragonMedia.snapshot) {
          const snap = window.DragonMedia.snapshot;
          render({ ...snap, paused: !snap.paused });
        }

        await sendCommand(action);
        if (action === "play_pause") refresh();
      });

      bindVolumeZone(barEl.querySelector(".music-minimal-volume-zone"));
      bindMoveZone(barEl.querySelector(".music-minimal-move"));

      if (window.DragonMedia && typeof window.DragonMedia.on === "function") {
        const events = [
          "media_change", "media_play", "media_pause", "media_progress",
          "media_stop", "hello", "connected", "disconnected",
        ];
        events.forEach((evt) => {
          cleanups.push(window.DragonMedia.on(evt, refresh));
        });
      }

      window.addEventListener("resize", () => {
        offsetX = clampOffset(offsetX);
        positionBar(barEl);
      });
      document.addEventListener("chrome-layout:changed", () => positionBar(barEl));
    }

    function mount(root) {
      if (barEl) return barEl;

      barEl = document.createElement("div");
      barEl.id = "music-minimal-bar";
      barEl.className = "music-minimal-bar";
      barEl.setAttribute("role", "region");
      barEl.setAttribute("aria-label", "Now Playing minimalista");
      barEl.setAttribute("aria-hidden", "true");
      barEl.innerHTML = `
        <div class="music-minimal-move" title="Arrastar para mover" aria-label="Arrastar para mover">
          <span class="music-minimal-move-grip" aria-hidden="true"></span>
        </div>
        <div class="music-minimal-shell">
          <div class="music-minimal-inner">
            <div class="music-minimal-row">
              <span class="music-minimal-title" data-role="title">Sem mídia</span>
              <span class="music-minimal-time" data-role="time">0:00</span>
            </div>
            <div class="music-minimal-controls">
              <button type="button" class="music-minimal-btn" data-action="prev" title="Anterior" aria-label="Faixa anterior">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>
              </button>
              <button type="button" class="music-minimal-btn music-minimal-btn--play" data-action="play_pause" title="Play/Pause" aria-label="Play/Pause">
                <svg data-icon="play" viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                <svg data-icon="pause" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="display:none"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>
              </button>
              <button type="button" class="music-minimal-btn" data-action="next" title="Próxima" aria-label="Próxima faixa">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="music-minimal-volume-zone" aria-label="Volume">
          <span class="music-minimal-volume-dot" aria-hidden="true"></span>
          <div class="music-minimal-volume-rail">
            <div class="music-minimal-volume-slider" data-role="volumeSlider">
              <div class="music-minimal-volume-fill" data-role="volumeFill"></div>
              <div class="music-minimal-volume-thumb" data-role="volumeThumb"></div>
            </div>
          </div>
        </div>
      `;

      refs = {
        title: barEl.querySelector('[data-role="title"]'),
        time: barEl.querySelector('[data-role="time"]'),
        iconPlay: barEl.querySelector('[data-icon="play"]'),
        iconPause: barEl.querySelector('[data-icon="pause"]'),
        volumeSlider: barEl.querySelector('[data-role="volumeSlider"]'),
        volumeFill: barEl.querySelector('[data-role="volumeFill"]'),
        volumeThumb: barEl.querySelector('[data-role="volumeThumb"]'),
      };

      offsetX = loadOffsetX();
      volumeLevel = loadVolumeLevel();
      (root || document.body).appendChild(barEl);
      positionBar(barEl);
      updateVolumeUI();
      bindEvents();
      refresh();
      return barEl;
    }

    function sync() {
      if (!barEl) return;
      offsetX = loadOffsetX();
      volumeLevel = loadVolumeLevel();
      positionBar(barEl);
      updateVolumeUI();
      refresh();
      if (typeof window.syncMusicWidgetPresentation === "function") {
        window.syncMusicWidgetPresentation();
      }
    }

    function destroy() {
      if (volumeCloseTimer) clearTimeout(volumeCloseTimer);
      cleanups.forEach((fn) => fn && fn());
      cleanups = [];
      moveDragActive = false;
      volumeDragActive = false;
      if (barEl) {
        barEl.remove();
        barEl = null;
        refs = null;
      }
    }

    return {
      mount,
      sync,
      destroy,
      reposition: () => positionBar(barEl),
      isEnabled: loadMusicMinimal,
      setEnabled: (enabled) => {
        saveMusicMinimal(!!enabled);
        sync();
      },
    };
  })();
})();
