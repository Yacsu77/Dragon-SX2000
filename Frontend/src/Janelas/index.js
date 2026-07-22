/**
 * Janelas — bootstrap e API pública.
 * Docs: Version/Docs/Frontend/Janelas.MD
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});

  function flashReceivedTab(tabId) {
    if (!tabId) return;
    const tab = document.querySelector(`#tabs .tab[data-id="${tabId}"]`);
    if (!tab) return;
    tab.classList.remove('janelas-tab-received');
    void tab.offsetWidth;
    tab.classList.add('janelas-tab-received');
    setTimeout(() => tab.classList.remove('janelas-tab-received'), 1600);

    let toast = document.getElementById('janelas-transfer-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'janelas-transfer-toast';
      toast.className = 'janelas-transfer-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = 'Aba recebida';
    toast.hidden = false;
    toast.classList.add('janelas-transfer-toast--show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.classList.remove('janelas-transfer-toast--show');
      toast.hidden = true;
    }, 1800);
  }

  function applyReceivedTab(snapshot) {
    if (!snapshot) return;
    let id = null;
    if (typeof window.createTabFromSnapshot === 'function') {
      id = window.createTabFromSnapshot(snapshot, true);
    } else if (snapshot.is_home || snapshot.isHomeTab) {
      id = window.createHomeTab?.(true);
    } else if (snapshot.url) {
      id = window.createTab?.(snapshot.url, snapshot.title || null, null, true);
    }
    if (id) {
      requestAnimationFrame(() => flashReceivedTab(id));
    }
  }

  function init() {
    NS.Store?.reload?.();
    NS.LayoutRegistry?.apply?.();
    NS.SplitHost?.init?.();
    NS.SplitDivider?.init?.();
    NS.TabPreview?.init?.();
    NS.TransferController?.init?.();
    NS.DropIndicator?.init?.();
    NS.AnimationHook?.init?.();
    NS.RgbClock?.init?.();

    NS.Bus?.on(NS.Types?.EVENTS?.SETTINGS_CHANGED, () => {
      NS.LayoutRegistry?.apply?.();
      NS.RgbClock?.sync?.();
    });

    NS.WindowBridge?.onReceiveTab?.((snapshot) => {
      applyReceivedTab(snapshot);
    });
  }

  /**
   * Aplica aba/URL pendente de nova janela (detach ou abrir link).
   * @returns {Promise<boolean>}
   */
  async function applyPendingTab() {
    try {
      const snapshot = await NS.WindowBridge?.consumePendingTab?.();
      if (snapshot) {
        if (typeof window.createTabFromSnapshot === 'function') {
          return Boolean(window.createTabFromSnapshot(snapshot, true));
        }
        if (snapshot.is_home || snapshot.isHomeTab) {
          window.createHomeTab?.(true);
          return true;
        }
        if (snapshot.url) {
          window.createTab?.(snapshot.url, snapshot.title || null, null, true);
          return true;
        }
      }

      const url = await NS.WindowBridge?.consumePendingUrl?.();
      if (url && typeof window.createTab === 'function') {
        window.createTab(url);
        return true;
      }
    } catch (err) {
      console.warn('[Janelas] falha ao aplicar conteúdo pendente', err);
    }
    return false;
  }

  /**
   * Herda usuário da janela origem (sem UserGate).
   * @returns {Promise<{ inherited: boolean, cleanSession: boolean }>}
   */
  async function inheritBootSession() {
    try {
      const boot = await NS.WindowBridge?.consumePendingBoot?.();
      if (!boot?.userId) {
        return { inherited: false, cleanSession: Boolean(boot?.cleanSession) };
      }

      const resolved = await window.UserSession.resolveForBoot();
      const user = (resolved.users || []).find((u) => u.id === boot.userId);
      if (!user) {
        return { inherited: false, cleanSession: Boolean(boot.cleanSession) };
      }

      await window.UserSession.setActiveUser(user, { reason: 'window-inherit' });
      return { inherited: true, cleanSession: Boolean(boot.cleanSession) };
    } catch (err) {
      console.warn('[Janelas] falha ao herdar sessão', err);
      return { inherited: false, cleanSession: false };
    }
  }

  window.Janelas = {
    init,
    applyPendingTab,
    inheritBootSession,
    flashReceivedTab,
    getSettings: () => NS.Store?.getSettings?.() || NS.createDefaults?.(),
    updateSettings: (patch) => NS.Store?.setSettings?.(patch),
    getSplitState: () => NS.Store?.getRuntime?.(),
    splitTab: (tabId, side) => NS.SplitHost?.openSplit?.(tabId, side),
    closeSplit: () => NS.SplitHost?.closeSplit?.(),
    focusPane: (side) => NS.SplitHost?.focusPane?.(side),
    showTabPreview: (tabId, anchor) => NS.TabPreview?.show?.(tabId, anchor),
    hideTabPreview: () => NS.TabPreview?.hide?.(),
    NS,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
