/**
 * Host de split in-window.
 * Dois painéis no mesmo #browser; abas de painel ficam no chrome invertido.
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
      wv.style.removeProperty('filter');
      wv.style.removeProperty('opacity');
    });
  }

  function clearTabPaneMarkers() {
    document.querySelectorAll('#tabs .tab').forEach((tab) => {
      tab.classList.remove(
        'janelas-tab-pane-left',
        'janelas-tab-pane-right',
        'janelas-tab-pane-focus',
        'janelas-tab-in-split',
        'janelas-tab-in-pane'
      );
    });
  }

  function syncAddressBar(focusTabId) {
    if (window.TabsState) window.TabsState.currentActiveTab = focusTabId;
    window.currentActiveTab = focusTabId;
    window.showBrowser?.();
    if (typeof window.updateAddressBar === 'function') window.updateAddressBar();
    if (typeof window.updateNavigationButtons === 'function') {
      window.updateNavigationButtons();
    }
  }

  function paintPanes() {
    const state = getState();
    const browser = document.getElementById('browser');
    if (!browser) return;

    if (state.mode !== 'split') {
      clearPaneClasses();
      clearTabPaneMarkers();
      NS.SplitPaneChrome?.unmount?.();
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

    document.querySelectorAll('#browser webview.active').forEach((wv) => {
      wv.classList.remove('active');
    });
    const focusWv = state.focusPane === 'right' ? right : left;
    if (focusWv) focusWv.classList.add('active');

    clearTabPaneMarkers();

    const leftTab = document.querySelector(`#tabs .tab[data-id="${state.leftTabId}"]`);
    const rightTab = document.querySelector(`#tabs .tab[data-id="${state.rightTabId}"]`);

    // Remover "active" visual da barra — foco visual fica no chrome invertido
    document.querySelectorAll('#tabs .tab.active, #tabs .tab.adjacent-to-active').forEach((tab) => {
      tab.classList.remove('active', 'adjacent-to-active');
    });

    if (leftTab) {
      leftTab.classList.add(
        'janelas-tab-in-split',
        'janelas-tab-in-pane',
        'janelas-tab-pane-left'
      );
      if (state.focusPane === 'left') leftTab.classList.add('janelas-tab-pane-focus');
    }
    if (rightTab) {
      rightTab.classList.add(
        'janelas-tab-in-split',
        'janelas-tab-in-pane',
        'janelas-tab-pane-right'
      );
      if (state.focusPane === 'right') rightTab.classList.add('janelas-tab-pane-focus');
    }

    const focusTabId =
      state.focusPane === 'right' ? state.rightTabId : state.leftTabId;
    syncAddressBar(focusTabId);

    NS.SplitPaneChrome?.mount?.();
    NS.SplitPaneChrome?.sync?.();
    window.TabsVisibility?.scheduleVisibilityUpdate?.();
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

  /**
   * @param {{ keepId?: string|null, skipActivate?: boolean }} [options]
   */
  function closeSplit(options) {
    const prev = getState();
    const keepId =
      (options && options.keepId) || prev.leftTabId || prev.rightTabId || null;
    const skipActivate = Boolean(options && options.skipActivate);
    Store.resetRuntime();
    document.documentElement.dataset.janelasMode = 'single';
    clearPaneClasses();
    clearTabPaneMarkers();
    NS.SplitPaneChrome?.unmount?.();
    Bus?.emit(Types?.EVENTS?.SPLIT_CLOSED, { leftTabId: keepId });
    NS.LayoutRegistry?.apply?.();
    NS.SplitDivider?.sync?.();
    window.TabsVisibility?.scheduleVisibilityUpdate?.();

    if (!skipActivate && keepId && typeof window.activateTab === 'function') {
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

  function emitTabChanged(tabId) {
    document.dispatchEvent(
      new CustomEvent('app:tab-changed', { detail: { tabId, isHomeTab: false } })
    );
  }

  /**
   * Coloca `tabId` no painel `side` (swap se já estiver no outro; se vinha da barra, a antiga sobe).
   * @param {string} tabId
   * @param {'left'|'right'} side
   */
  function assignTabToSide(tabId, side) {
    const state = getState();
    if (state.mode !== 'split' || !tabId || (side !== 'left' && side !== 'right')) {
      return false;
    }

    if (tabId.startsWith('home-tab')) {
      closeSplit({ keepId: tabId });
      return true;
    }

    const leftId = state.leftTabId;
    const rightId = state.rightTabId;

    if (side === 'left' && tabId === leftId) {
      focusPane('left');
      return true;
    }
    if (side === 'right' && tabId === rightId) {
      focusPane('right');
      return true;
    }

    // Swap interno entre painéis
    if (
      (side === 'left' && tabId === rightId) ||
      (side === 'right' && tabId === leftId)
    ) {
      Store.setRuntime({
        leftTabId: rightId,
        rightTabId: leftId,
        focusPane: side,
      });
      paintPanes();
      emitTabChanged(tabId);
      return true;
    }

    // Aba da barra substitui o painel — a que saiu volta à barra
    const displacedId = side === 'right' ? rightId : leftId;
    const patch =
      side === 'right'
        ? { rightTabId: tabId, focusPane: side }
        : { leftTabId: tabId, focusPane: side };
    Store.setRuntime(patch);
    paintPanes();
    emitTabChanged(tabId);
    if (displacedId && displacedId !== tabId) {
      NS.SplitDropController?.playJellyReturn?.(displacedId);
    }
    return true;
  }

  function swapPaneWithTab(side, tabId) {
    return assignTabToSide(tabId, side);
  }

  /**
   * Soltar aba de painel na barra superior → fecha o split e foca essa aba.
   * @param {'left'|'right'} side
   */
  function releasePaneTabToBar(side) {
    const state = getState();
    if (state.mode !== 'split') return false;
    const keepId = side === 'right' ? state.rightTabId : state.leftTabId;
    closeSplit({ keepId });
    return true;
  }

  function assignTabToFocusPane(tabId) {
    const state = getState();
    if (state.mode !== 'split' || !tabId) return false;
    const side = state.focusPane === 'right' ? 'right' : 'left';
    return assignTabToSide(tabId, side);
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
      if (state.mode !== 'split') {
        return orig.call(this, tabId);
      }

      // Home encerra o split e abre New Tab normalmente
      if (tabId && String(tabId).startsWith('home-tab')) {
        closeSplit({ keepId: tabId, skipActivate: true });
        const home = window.activateHomeTab;
        const origHome = home?.__janelasSplitOriginal || home;
        if (typeof origHome === 'function') return origHome.call(window, tabId);
        return orig.call(this, tabId);
      }

      // Clique na aba de um painel (se acessível) só foca o painel
      if (tabId === state.leftTabId) {
        focusPane('left');
        return;
      }
      if (tabId === state.rightTabId) {
        focusPane('right');
        return;
      }

      // Clique em aba da barra NÃO substitui o painel — restaura a view do split
      window.showBrowser?.();
      paintPanes();
    }

    wrapped.__janelasSplitOriginal = orig;
    wrapped.__janelasSplitHooked = true;
    window.activateTab = wrapped;
    if (window.TabsCore) window.TabsCore.activateTab = wrapped;

    const origHome = window.activateHomeTab;
    if (typeof origHome === 'function' && !origHome.__janelasSplitHooked) {
      function wrappedHome(tabId) {
        const state = getState();
        if (state.mode === 'split') {
          // New Tab enquanto em split: sai do split e abre home (evita ficar preso)
          closeSplit({ keepId: tabId, skipActivate: true });
          return origHome.call(this, tabId);
        }
        return origHome.call(this, tabId);
      }
      wrappedHome.__janelasSplitOriginal = origHome;
      wrappedHome.__janelasSplitHooked = true;
      window.activateHomeTab = wrappedHome;
      if (window.TabsCore) window.TabsCore.activateHomeTab = wrappedHome;
    }

    hookedActivate = true;
  }

  function onPaneClick(e) {
    const state = getState();
    if (state.mode !== 'split') return;
    if (e.target?.closest?.('.janelas-pane-tab')) return;
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
    assignTabToSide,
    swapPaneWithTab,
    releasePaneTabToBar,
    paintPanes,
  };
})();
