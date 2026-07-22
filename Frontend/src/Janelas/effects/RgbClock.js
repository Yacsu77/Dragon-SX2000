/**
 * Relógio do RGB da moldura.
 * Chromium/Electron pausam CSS animation + rAF em janela sem foco (outro monitor).
 * Usamos setInterval no renderer + backgroundThrottling:false no BrowserWindow.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.RgbClock) return;

  const PERIOD_MS = 2800;
  const TICK_MS = 33;
  let angle = 0;
  let timer = null;
  let lastTs = 0;

  function rgbEnabled() {
    return document.documentElement.getAttribute('data-janelas-borders-rgb') === '1';
  }

  function applyAngle() {
    document.documentElement.style.setProperty('--janelas-rgb-angle', `${angle.toFixed(2)}deg`);
  }

  function tick() {
    if (!rgbEnabled() || document.hidden) {
      stop();
      return;
    }
    const now = performance.now();
    if (!lastTs) lastTs = now;
    const dt = Math.min(100, now - lastTs);
    lastTs = now;
    angle = (angle + (360 * dt) / PERIOD_MS) % 360;
    applyAngle();
  }

  function start() {
    if (timer || !rgbEnabled() || document.hidden) return;
    lastTs = 0;
    applyAngle();
    timer = setInterval(tick, TICK_MS);
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    lastTs = 0;
  }

  function sync() {
    if (rgbEnabled() && !document.hidden) start();
    else stop();
  }

  function init() {
    sync();
    document.addEventListener('visibilitychange', sync);

    const root = document.documentElement;
    const obs = new MutationObserver(() => sync());
    obs.observe(root, { attributes: true, attributeFilter: ['data-janelas-borders-rgb'] });

    // LayoutRegistry pode setar o attr antes deste init
    setTimeout(sync, 0);
  }

  NS.RgbClock = { init, sync, start, stop };
})();
