window.AutoTuneWidgets = window.AutoTuneWidgets || {};
window.AutoTuneWidgetMeta = window.AutoTuneWidgetMeta || {};

(function () {
  const Config = window.AutoTuneClockConfig;
  const Render = window.AutoTuneClockRender;
  const STORE_KEY = "autotuneFactorySettings";

  const LOCALE = "pt-BR";
  const WEEKDAYS = ["Domingo", "Segunda-feira", "Terca-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sabado"];

  function readClockConfig() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return Config.DEFAULT_CLOCK;
      const store = JSON.parse(raw);
      const record = store[Config.FACTORY_KEY];
      return Config.readFromRecord(record || {});
    } catch (_err) {
      return Config.DEFAULT_CLOCK;
    }
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatTime(date) {
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  function formatDate(date) {
    return date.toLocaleDateString(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function formatWeekDay(date) {
    return WEEKDAYS[date.getDay()];
  }

  window.AutoTuneWidgetMeta.clock = {
    defaultWidth: 240,
    defaultHeight: 140,
    minWidth: 120,
    minHeight: 80
  };

  window.AutoTuneWidgets.clock = function initClockWidget(bodyEl) {
    bodyEl.classList.add("autotune-clock-body");
    bodyEl.innerHTML = `
      <div class="autotune-clock-root" data-role="root">
        <div class="autotune-clock-bg" data-role="background" aria-hidden="true"></div>
        <div class="autotune-clock-time" data-role="time">00:00:00</div>
        <div class="autotune-clock-date" data-role="date">01/01/2026</div>
        <div class="autotune-clock-weekday" data-role="weekday">Segunda-feira</div>
      </div>
    `;

    const root = bodyEl.querySelector('[data-role="root"]');
    const timeEl = bodyEl.querySelector('[data-role="time"]');
    const dateEl = bodyEl.querySelector('[data-role="date"]');
    const weekEl = bodyEl.querySelector('[data-role="weekday"]');

    function tick() {
      const now = new Date();
      timeEl.textContent = formatTime(now);
      dateEl.textContent = formatDate(now);
      weekEl.textContent = formatWeekDay(now);
    }

    function applyConfig() {
      Render.applyToRoot(root, readClockConfig());
    }

    tick();
    applyConfig();
    const intervalId = setInterval(tick, 1000);

    bodyEl.addEventListener("autotune-clock-config", applyConfig);

    const observer = new MutationObserver(() => applyConfig());
    observer.observe(bodyEl, { attributes: true, attributeFilter: ["data-clock-config"] });

    bodyEl._clockCleanup = () => {
      clearInterval(intervalId);
      observer.disconnect();
    };
  };
})();
