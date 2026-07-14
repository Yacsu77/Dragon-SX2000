/**
 * PerfSettings — preferências de desempenho persistidas em localStorage.
 *
 * Responsabilidade única: guardar o estado das opções de desempenho, aplicá-las
 * ao DOM (classe no <body>) e notificar quem estiver observando. Não desenha UI.
 *
 * Opções:
 *   renderAllTabs (bool) — manter todas as abas renderizadas em segundo plano
 *     (troca instantânea, porém mais uso de CPU/GPU e RAM).
 *   restoreSessionTabs (bool) — guardar abas abertas e restaurar no próximo boot
 *     (mais CPU/RAM na abertura se houver muitas abas).
 *
 * API:
 *   PerfSettings.init()
 *   PerfSettings.isRenderAllTabs() → boolean
 *   PerfSettings.setRenderAllTabs(bool)
 *   PerfSettings.isRestoreSessionTabs() → boolean
 *   PerfSettings.setRestoreSessionTabs(bool)
 *   PerfSettings.onChange(fn) → unsubscribe
 */
(function () {
  const STORAGE_KEY = 'dragonsx.settings.perf';
  const BODY_CLASS = 'perf-render-all';

  const state = {
    renderAllTabs: false,
    restoreSessionTabs: false,
  };
  const listeners = new Set();

  function load() {
    try {
      const raw = (window.UserStorage ? window.UserStorage.getItem(STORAGE_KEY) : localStorage.getItem(STORAGE_KEY));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        state.renderAllTabs = !!parsed.renderAllTabs;
        state.restoreSessionTabs = !!parsed.restoreSessionTabs;
      }
    } catch (_) { /* ignore */ }
  }

  function save() {
    try {
      (window.UserStorage ? window.UserStorage.setItem(STORAGE_KEY, JSON.stringify(state)) : localStorage.setItem(STORAGE_KEY, JSON.stringify(state)));
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

  function isRestoreSessionTabs() {
    return state.restoreSessionTabs;
  }

  function setRestoreSessionTabs(value) {
    const next = !!value;
    if (next === state.restoreSessionTabs) return;
    state.restoreSessionTabs = next;
    save();
    emit();
    if (next && window.SessionTabs && typeof window.SessionTabs.saveNow === 'function') {
      window.SessionTabs.saveNow();
    }
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

  window.PerfSettings = {
    init,
    isRenderAllTabs,
    setRenderAllTabs,
    isRestoreSessionTabs,
    setRestoreSessionTabs,
    onChange,
  };

  document.addEventListener('user:changed', () => {
    load();
    apply();
    emit();
  });
})();
