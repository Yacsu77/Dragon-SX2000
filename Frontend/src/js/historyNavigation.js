/**
 * Adaptador para abrir URLs a partir do histórico usando o sistema de abas.
 */
(function () {
  function openUrlFromHistory(url) {
    if (!url) return;

    if (typeof window.setHistoryTransitionType === 'function') {
      window.setHistoryTransitionType('link');
    }

    if (typeof window.createTab === 'function') {
      window.createTab(url);
      return;
    }

    console.warn('[History] createTab indisponível — fallback para window.open');
    window.open(url, '_blank');
  }

  window.openUrlFromHistory = openUrlFromHistory;
})();
