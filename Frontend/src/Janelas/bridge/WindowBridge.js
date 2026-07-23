/**
 * Bridge com main process para multi-janela OS.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.WindowBridge) return;

  function sanitizeSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    return {
      url: snapshot.url || null,
      title: snapshot.title || null,
      favicon_url: snapshot.favicon_url || snapshot.faviconUrl || null,
      is_home: Boolean(snapshot.is_home || snapshot.isHomeTab),
      active: true,
    };
  }

  function currentUserId() {
    return window.UserSession?.getActiveUserId?.() || null;
  }

  async function createWithTab(snapshot) {
    const tab = sanitizeSnapshot(snapshot);
    if (!tab) return false;

    const api = window.DragonJanelas;
    if (api?.createWithTab) {
      const result = await api.createWithTab(tab, currentUserId());
      return Boolean(result?.ok);
    }

    const legacy = window.DragonCursorControl;
    if (legacy?.createWindow && tab.url) {
      const result = await legacy.createWindow(tab.url, currentUserId());
      return result?.ok !== false;
    }

    console.warn('[Janelas] DragonJanelas.createWithTab indisponível');
    return false;
  }

  async function moveTab(targetWindowId, snapshot) {
    const api = window.DragonJanelas;
    if (!api?.moveTab) return false;
    const tab = sanitizeSnapshot(snapshot);
    if (!tab) return false;
    const result = await api.moveTab(targetWindowId, tab);
    return Boolean(result?.ok);
  }

  async function consumePendingTab() {
    const api = window.DragonJanelas;
    if (!api?.consumePendingTab) return null;
    return api.consumePendingTab();
  }

  async function consumePendingBoot() {
    const api = window.DragonJanelas;
    if (!api?.consumePendingBoot) return null;
    return api.consumePendingBoot();
  }

  async function consumePendingUrl() {
    const api = window.DragonCursorControl;
    if (!api?.consumePendingUrl) return null;
    return api.consumePendingUrl();
  }

  function reportTabsBounds(bounds) {
    window.DragonJanelas?.reportTabsBounds?.(bounds);
  }

  async function resolveDropTarget() {
    const api = window.DragonJanelas;
    if (!api?.resolveDropTarget) return null;
    return api.resolveDropTarget();
  }

  async function getCursorScreenPoint() {
    const api = window.DragonJanelas;
    if (!api?.getCursorScreenPoint) return null;
    return api.getCursorScreenPoint();
  }

  function setDragHover(payload) {
    window.DragonJanelas?.setDragHover?.(payload);
  }

  function clearDragHover() {
    window.DragonJanelas?.clearDragHover?.();
  }

  function onReceiveTab(callback) {
    if (!window.DragonJanelas?.onReceiveTab) return () => {};
    return window.DragonJanelas.onReceiveTab(callback);
  }

  function onDropIndicator(callback) {
    if (!window.DragonJanelas?.onDropIndicator) return () => {};
    return window.DragonJanelas.onDropIndicator(callback);
  }

  NS.WindowBridge = {
    createWithTab,
    moveTab,
    consumePendingTab,
    consumePendingBoot,
    consumePendingUrl,
    reportTabsBounds,
    resolveDropTarget,
    getCursorScreenPoint,
    setDragHover,
    clearDragHover,
    onReceiveTab,
    onDropIndicator,
  };
})();
