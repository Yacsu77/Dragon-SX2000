/**
 * Janelas — bus de CustomEvents (desacopla módulos).
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.Bus) return;

  NS.Bus = {
    emit(name, detail) {
      document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    },
    on(name, handler) {
      document.addEventListener(name, handler);
      return () => document.removeEventListener(name, handler);
    },
  };
})();
