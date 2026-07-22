/**
 * Host de split in-window (feature 4).
 * Dois painéis no mesmo #browser; clique em aba troca só o painel focado.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.SplitHost) return;

  const { Types, Bus, Store } = NS;
  let hookedActivate = false;

  function getState() {
    return Store?.getRuntime?.() || { mode: 'single' };
  }

  function getWebview(tabId) {
    if (!tabId) return null;
    return document.querySelector(`#browser webview[data-id="${tabId}"]`);
  }

  function clearPaneClasses() {
    document.querySelectorAll('#browser webview').forEach((wv) => {
      wv.classList.remove(
        'janelas-pane-visible',
        'janelas-pane-focus',
        'janelas-pane-left',
        'janelas-pane-right',
        'is-leaving',
        'is-entering'
      );
      // Garante que nenhum blur residual do crossfade de abas fique no painel
      wv.style.removeProperty('filter');
      wv.style.removeProperty('opacity');
    });
  }

  function paintPanes() {
    const state = getState();
    const browser = document.getElementById('browser');
    if (!browser) return;

    if (state.mode !== 'split') {
      clearPaneClasses();
      document.querySelectorAll(
        '#tabs .tab.janelas-tab-in-split, #tabs .tab.janelas-tab-pane-left, #tabs .tab.janelas-tab-pane-right, #tabs .tab.janelas-tab-pane-focus'
      ).forEach((tab) => {
        tab.classList.remove(
          'janelas-tab-pane-left',
          'janelas-tab-pane-right',
          'janelas-tab-pane-focus',
          'janelas-tab-in-split'
        );
      });
      return;
    }

    clearPaneClasses();
    const left = getWebview(state.leftTabId);
    const right = getWebview(state.rightTabId);

    if (left) {
      left.classList.add('janelas-pane-visible', 'janelas-pane-left');
      if (state.focusPane === 'left') left.classList.add('janelas-pane-focus');
    }
    if (right) {
      right.classList.add('janelas-pane-visible', 'janelas-pane-right');
      if (state.focusPane === 'right') right.classList.add('janelas-pane-focus');
    }

    document.querySelectorAll('#browser webview.active').forEach((wv) => wv.classList.remove('active'));
    const focusWv = state.focusPane === 'right' ? right : left;
    if (focusWv) focusWv.classList.add('active');

    const leftTab = document.querySelector(`#tabs .tab[data-id="${state.leftTabId}"]`);
    const rightTab = document.querySelector(`#tabs .tab[data-id="${state.rightTabId}"]`);

    document.querySelectorAll('#tabs .tab.active, #tabs .tab.adjacent-to-active').forEach((tab) => {
      tab.classList.remove('active', 'adjacent-to-active');
    });
    document.querySelectorAll(
      '#tabs .tab.janelas-tab-in-split, #tabs .tab.janelas-tab-pane-left, #tabs .tab.janelas-tab-pane-right, #tabs .tab.janelas-tab-pane-focus'
    ).forEach((tab) => {
      tab.classList.remove(
        'janelas-tab-pane-left',
        'janelas-tab-pane-right',
        'janelas-tab-pane-focus',
        'janelas-tab-in-split'
      );
    });

    if (leftTab) {
      leftTab.classList.add('janelas-tab-in-split', 'janelas-tab-pane-left');
      if (state.focusPane === 'left') leftTab.classList.add('janelas-tab-pane-focus', 'active');
    }
    if (rightTab) {
      rightTab.classList.add('janelas-tab-in-split', 'janelas-tab-pane-right');
      if (state.focusPane === 'right') rightTab.classList.add('janelas-tab-pane-focus', 'active');
    }

    const focusTabId = state.focusPane === 'right' ? state.rightTabId : state.leftTabId;
    const focusTab = document.querySelector(`#tabs .tab[data-id="${focusTabId}"]`);
    if (focusTab && window.TabsAnim) window.TabsAnim.setAdjacentToActive(focusTab);

    if (window.TabsState) window.TabsState.currentActiveTab = focusTabId;
    window.currentActiveTab = focusTabId;

    window.showBrowser?.();
    if (typeof window.updateAddressBar === 'function') window.updateAddressBar();
    if (typeof window.updateNavigationButtons === 'function') window.updateNavigationButtons();
  }

  /**
   * @param {string} tabId
   * @param {'left'|'right'} side
   */
  function openSplit(tabId, side) {
    if (!tabId || (side !== 'left' && side !== 'right')) return getState();

    const activeId = window.TabsState?.currentActiveTab || window.currentActiveTab;
    let otherId = activeId && activeId !== tabId ? activeId : null;

    if (!otherId) {
      const tabs = Array.from(document.querySelectorAll('#tabs .tab'))
        .map((t) => t.dataset.id)
        .filter((id) => id && id !== tabId);
      otherId = tabs[0] || tabId;
    }

    const leftTabId = side === 'left' ? tabId : otherId;
    const rightTabId = side === 'right' ? tabId : otherId;

    const next = Store.setRuntime({
      mode: 'split',
      focusPane: side,
      leftTabId,
      rightTabId,
    });
    document.documentElement.dataset.janelasMode = 'split';
    Bus?.emit(Types?.EVENTS?.SPLIT_OPENED, next);
    NS.LayoutRegistry?.apply?.();
    paintPanes();
    NS.SplitDivider?.sync?.();
    return next;
  }

  function closeSplit() {
    const prev = getState();
    const keepId = prev.leftTabId || prev.rightTabId;
    Store.resetRuntime();
    document.documentElement.dataset.janelasMode = 'single';
    clearPaneClasses();
    document.querySelectorAll('#tabs .tab').forEach((tab) => {
      tab.classList.remove(
        'janelas-tab-pane-left',
        'janelas-tab-pane-right',
        'janelas-tab-pane-focus',
        'janelas-tab-in-split'
      );
    });
    Bus?.emit(Types?.EVENTS?.SPLIT_CLOSED, { leftTabId: keepId });
    NS.LayoutRegistry?.apply?.();
    NS.SplitDivider?.sync?.();

    if (keepId && typeof window.activateTab === 'function') {
      const orig = window.activateTab.__janelasSplitOriginal || window.activateTab;
      orig.call(window, keepId);
    }
    return Store.getRuntime();
  }

  /**
   * @param {'left'|'right'} side
   */
  function focusPane(side) {
    if (side !== 'left' && side !== 'right') return getState();
    const next = Store.setRuntime({ focusPane: side });
    Bus?.emit(Types?.EVENTS?.PANE_FOCUSED, next);
    paintPanes();
    return next;
  }

  function assignTabToFocusPane(tabId) {
    const state = getState();
    if (state.mode !== 'split' || !tabId) return false;

    if (tabId.startsWith('home-tab')) {
      // Home não entra no split — fecha split e ativa home
      closeSplit();
      const orig = window.activateTab.__janelasSplitOriginal || window.activateTab;
      orig.call(window, tabId);
      return true;
    }

    const patch =
      state.focusPane === 'right'
        ? { rightTabId: tabId }
        : { leftTabId: tabId };
    Store.setRuntime(patch);
    paintPanes();
    document.dispatchEvent(
      new CustomEvent('app:tab-changed', { detail: { tabId, isHomeTab: false } })
    );
    return true;
  }

  function handleTabActivate(tabId) {
    return assignTabToFocusPane(tabId);
  }

  function hookActivateTab() {
    if (hookedActivate) return;
    const orig = window.activateTab;
    if (typeof orig !== 'function') return;

    function wrapped(tabId) {
      const state = getState();
      if (state.mode === 'split') {
        return assignTabToFocusPane(tabId);
      }
      return orig.call(this, tabId);
    }

    wrapped.__janelasSplitOriginal = orig;
    wrapped.__janelasSplitHooked = true;
    window.activateTab = wrapped;
    if (window.TabsCore) window.TabsCore.activateTab = wrapped;
    hookedActivate = true;
  }

  function onPaneClick(e) {
    const state = getState();
    if (state.mode !== 'split') return;
    const wv = e.target?.closest?.('webview');
    if (!wv || !wv.classList.contains('janelas-pane-visible')) return;
    if (wv.classList.contains('janelas-pane-left')) focusPane('left');
    else if (wv.classList.contains('janelas-pane-right')) focusPane('right');
  }

  function init() {
    document.documentElement.dataset.janelasMode = getState().mode || 'single';
    hookActivateTab();
    const browser = document.getElementById('browser');
    if (browser) {
      browser.addEventListener('mousedown', onPaneClick, true);
    }
    document.addEventListener('app:tab-closed', (e) => {
      const state = getState();
      if (state.mode !== 'split') return;
      const closedId = e.detail?.tabId;
      if (!closedId) return;
      if (closedId !== state.leftTabId && closedId !== state.rightTabId) return;
      // Se fechou um dos painéis, encerra o split
      closeSplit();
    });
  }

  NS.SplitHost = {
    init,
    getState,
    openSplit,
    closeSplit,
    focusPane,
    handleTabActivate,
    assignTabToFocusPane,
    paintPanes,
  };
})();
