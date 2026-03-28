/**
 * Conteúdo do cosmético Timer (cronômetro simples).
 * @param {HTMLElement} bodyEl - .floating-widget-body
 */
window.AutoTuneWidgets = window.AutoTuneWidgets || {};

window.AutoTuneWidgets.timer = function initTimerWidget(bodyEl) {
  bodyEl.innerHTML = `
    <div class="autotune-timer-display" data-role="display">00:00.0</div>
    <div class="autotune-timer-actions">
      <button type="button" class="autotune-timer-btn" data-action="start">Iniciar</button>
      <button type="button" class="autotune-timer-btn" data-action="pause">Pausar</button>
      <button type="button" class="autotune-timer-btn ghost" data-action="reset">Zerar</button>
    </div>
  `;

  const display = bodyEl.querySelector('[data-role="display"]');
  let startedAt = null;
  let elapsedMs = 0;
  let rafId = null;
  let running = false;

  function format(ms) {
    const total = Math.floor(ms / 100);
    const tenths = total % 10;
    const sec = Math.floor(total / 10) % 60;
    const min = Math.floor(total / 600);
    const m = String(min).padStart(2, "0");
    const s = String(sec).padStart(2, "0");
    return `${m}:${s}.${tenths}`;
  }

  function tick() {
    if (!running) return;
    const now = performance.now();
    const t = elapsedMs + (now - startedAt);
    display.textContent = format(t);
    rafId = requestAnimationFrame(tick);
  }

  bodyEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    if (action === "start") {
      if (running) return;
      running = true;
      startedAt = performance.now();
      rafId = requestAnimationFrame(tick);
    }
    if (action === "pause") {
      if (!running) return;
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      elapsedMs += performance.now() - startedAt;
      display.textContent = format(elapsedMs);
    }
    if (action === "reset") {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      elapsedMs = 0;
      startedAt = null;
      display.textContent = "00:00.0";
    }
  });
};
