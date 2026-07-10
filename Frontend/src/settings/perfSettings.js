/**
 * PerfSettings — preferências de desempenho persistidas em localStorage.
 *
 * Responsabilidade única: guardar o estado das opções de desempenho, aplicá-las
 * ao DOM (classe no <body>) e notificar quem estiver observando. Não desenha UI.
 *
 * Opções:
 *   renderAllTabs (bool) — manter todas as abas renderizadas em segundo plano
 *     (troca instantânea, porém mais uso de CPU/GPU e RAM).
 *
 * API:
 *   PerfSettings.init()
 *   PerfSettings.isRenderAllTabs() → boolean
 *   PerfSettings.setRenderAllTabs(bool)
 *   PerfSettings.onChange(fn) → unsubscribe
 */
(function () {
  const STORAGE_KEY = 'dragonsx.settings.perf';
  const BODY_CLASS = 'perf-render-all';

  const state = { renderAllTabs: false };
  const listeners = new Set();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        state.renderAllTabs = !!parsed.renderAllTabs;
      }
    } catch (_) { /* ignore */ }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) { /* ignore */ }
  }

  function apply() {
    if (!document.body) return;
    document.body.classList.toggle(BODY_CLASS, state.renderAllTabs);
  }

  function emit() {
    const snapshot = { ...state };
    listeners.forEach((fn) => {
      try { fn(snapshot); } catch (_) { /* ignore */ }
    });
  }

  function isRenderAllTabs() {
    return state.renderAllTabs;
  }

  function setRenderAllTabs(value) {
    const next = !!value;
    if (next === state.renderAllTabs) return;
    state.renderAllTabs = next;
    save();
    apply();
    emit();
  }

  function onChange(fn) {
    if (typeof fn !== 'function') return () => {};
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function init() {
    load();
    apply();
  }

  window.PerfSettings = { init, isRenderAllTabs, setRenderAllTabs, onChange };
})();
