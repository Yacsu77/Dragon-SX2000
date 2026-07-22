/**
 * Janelas — foco/visibilidade para pausar trabalho idle.
 *
 * - perf-window-idle: janela sem foco (outro app/monitor) — timers pesados
 * - perf-window-hidden: document.hidden (minimizada) — RGB / efeitos caros
 *
 * RGB continua rodando com a janela visível em outro monitor.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.PerfIdle) return;

  const BODY_IDLE = 'perf-window-idle';
  const BODY_HIDDEN = 'perf-window-hidden';
  let windowFocused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
  const listeners = new Set();

  function isActive() {
    return !document.hidden && windowFocused;
  }

  function isVisible() {
    return !document.hidden;
  }

  function syncBodyClass() {
    if (!document.body) return;
    document.body.classList.toggle(BODY_IDLE, !isActive());
    document.body.classList.toggle(BODY_HIDDEN, document.hidden);
  }

  function restartChromeAnimations() {
    const parents = [
      document.querySelector('#browser.browser-container.active'),
      document.querySelector('#homePage:not(.hidden)'),
    ].filter(Boolean);

    parents.forEach((el) => {
      el.classList.remove('janelas-anim-restart');
      void el.offsetWidth;
      el.classList.add('janelas-anim-restart');
      requestAnimationFrame(() => {
        el.classList.remove('janelas-anim-restart');
      });
    });

    if (document.documentElement.getAttribute('data-janelas-borders-rgb') === '1') {
      document.querySelectorAll('#browser webview.janelas-pane-visible').forEach((wv) => {
        const prev = wv.style.animation;
        wv.style.animation = 'none';
        void wv.offsetWidth;
        wv.style.animation = prev || '';
      });
    }
  }

  function notify() {
    const wasHidden = document.body?.classList.contains(BODY_HIDDEN);
    syncBodyClass();
    const active = isActive();
    if (!document.hidden && wasHidden) {
      requestAnimationFrame(() => restartChromeAnimations());
    }
    listeners.forEach((fn) => {
      try {
        fn(active);
      } catch (_) {
        /* ignore */
      }
    });
  }

  window.addEventListener('focus', () => {
    windowFocused = true;
    notify();
  });
  window.addEventListener('blur', () => {
    windowFocused = false;
    notify();
  });
  document.addEventListener('visibilitychange', notify);

  function boot() {
    syncBodyClass();
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);

  NS.PerfIdle = {
    isActive,
    isVisible,
    onChange(fn) {
      if (typeof fn !== 'function') return () => {};
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    syncBodyClass,
    restartChromeAnimations,
  };
})();
