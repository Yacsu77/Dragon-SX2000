window.AutoTuneWidgets = window.AutoTuneWidgets || {};

(function () {
  const POMODORO_KEY = "autotunePomodoroSettings";
  const DEFAULTS = { workMinutes: 25, breakMinutes: 5 };

  function clampMinutes(value) {
    return Math.max(1, Math.min(180, Number(value) || 1));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(POMODORO_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return {
        workMinutes: clampMinutes(parsed.workMinutes),
        breakMinutes: clampMinutes(parsed.breakMinutes)
      };
    } catch (_err) {
      return { ...DEFAULTS };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(
      POMODORO_KEY,
      JSON.stringify({
        workMinutes: clampMinutes(settings.workMinutes),
        breakMinutes: clampMinutes(settings.breakMinutes)
      })
    );
  }

  function formatClock(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  window.AutoTunePomodoroStore = {
    load: loadSettings,
    save: saveSettings
  };

  window.AutoTuneWidgets.timer = function initTimerWidget(bodyEl) {
    const settings = loadSettings();
    let workMinutes = settings.workMinutes;
    let breakMinutes = settings.breakMinutes;
    let phase = "work";
    let cycle = 1;
    let running = false;
    let remainingMs = workMinutes * 60 * 1000;
    let rafId = null;
    let lastTs = 0;

    bodyEl.innerHTML = `
      <div class="autotune-pomodoro-top">
        <span class="autotune-pomodoro-phase" data-role="phase">Foco</span>
        <span class="autotune-pomodoro-cycle" data-role="cycle">Ciclo 1</span>
      </div>
      <div class="autotune-timer-display" data-role="display">25:00</div>
      <div class="autotune-timer-actions">
        <button type="button" class="autotune-timer-btn" data-action="start">Iniciar</button>
        <button type="button" class="autotune-timer-btn" data-action="pause">Pausar</button>
        <button type="button" class="autotune-timer-btn ghost" data-action="reset">Resetar</button>
        <button type="button" class="autotune-timer-btn ghost" data-action="config">Config</button>
      </div>
      <div class="autotune-pomodoro-config" data-role="configPanel" hidden>
        <label>
          Foco (min)
          <input type="number" min="1" max="180" step="1" data-role="workInput" value="${workMinutes}" />
        </label>
        <label>
          Pausa (min)
          <input type="number" min="1" max="180" step="1" data-role="breakInput" value="${breakMinutes}" />
        </label>
        <button type="button" class="autotune-timer-btn" data-action="save-config">Salvar</button>
      </div>
    `;

    const display = bodyEl.querySelector('[data-role="display"]');
    const phaseEl = bodyEl.querySelector('[data-role="phase"]');
    const cycleEl = bodyEl.querySelector('[data-role="cycle"]');
    const configPanel = bodyEl.querySelector('[data-role="configPanel"]');
    const workInput = bodyEl.querySelector('[data-role="workInput"]');
    const breakInput = bodyEl.querySelector('[data-role="breakInput"]');

    function updateUi() {
      display.textContent = formatClock(remainingMs);
      phaseEl.textContent = phase === "work" ? "Foco" : "Pausa";
      cycleEl.textContent = `Ciclo ${cycle}`;
    }

    function setPhase(next) {
      phase = next;
      if (phase === "work") {
        cycle += 1;
      }
      remainingMs = (phase === "work" ? workMinutes : breakMinutes) * 60 * 1000;
      updateUi();
    }

    function tick(ts) {
      if (!running) return;
      if (!lastTs) lastTs = ts;
      const delta = ts - lastTs;
      lastTs = ts;
      remainingMs -= delta;
      if (remainingMs <= 0) {
        setPhase(phase === "work" ? "break" : "work");
      }
      updateUi();
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
    }

    function reset() {
      pause();
      phase = "work";
      cycle = 1;
      remainingMs = workMinutes * 60 * 1000;
      updateUi();
    }

    bodyEl.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      if (action === "start") start();
      if (action === "pause") pause();
      if (action === "reset") reset();
      if (action === "config") {
        configPanel.hidden = !configPanel.hidden;
      }
      if (action === "save-config") {
        const nextWork = clampMinutes(workInput.value);
        const nextBreak = clampMinutes(breakInput.value);
        workMinutes = nextWork;
        breakMinutes = nextBreak;
        saveSettings({ workMinutes, breakMinutes });
        reset();
        configPanel.hidden = true;
      }
    });

    updateUi();
  };
})();
