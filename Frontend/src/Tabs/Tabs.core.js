/**
 * Lógica principal das abas: criar, fechar, ativar, home tab, webview.
 */
(function () {
  const state = window.TabsState;
  /** Ordem MRU de abas ativadas (mais recente no fim). */
  const activationHistory = [];

  function rememberActivation(tabId) {
    if (!tabId) return;
    const idx = activationHistory.lastIndexOf(tabId);
    if (idx >= 0) activationHistory.splice(idx, 1);
    activationHistory.push(tabId);
    if (activationHistory.length > 48) {
      activationHistory.splice(0, activationHistory.length - 48);
    }
  }

  function forgetTab(tabId) {
    if (!tabId) return;
    for (let i = activationHistory.length - 1; i >= 0; i -= 1) {
      if (activationHistory[i] === tabId) activationHistory.splice(i, 1);
    }
  }

  /** Última aba visitada que ainda existe (exclui a fechada). */
  function pickTabAfterClose(closedId) {
    forgetTab(closedId);
    for (let i = activationHistory.length - 1; i >= 0; i -= 1) {
      const id = activationHistory[i];
      if (document.querySelector(`#tabs .tab[data-id="${id}"]`)) return id;
    }
    const remaining = document.querySelectorAll('#tabs .tab');
    return remaining.length ? remaining[0].dataset.id : null;
  }

  function emitTabCreated(tabId, isHomeTab) {
    document.dispatchEvent(new CustomEvent('app:tab-created', {
      detail: { tabId, isHomeTab },
    }));
  }

  function emitTabClosed(tabId) {
    document.dispatchEvent(new CustomEvent('app:tab-closed', {
      detail: { tabId },
    }));
  }

  function emitTabChanged(tabId, isHomeTab) {
    state.currentActiveTab = tabId;
    window.currentActiveTab = tabId;
    rememberActivation(tabId);
    document.dispatchEvent(new CustomEvent('app:tab-changed', {
      detail: { tabId, isHomeTab },
    }));
  }

  function afterTabLayoutUpdate() {
    setTimeout(() => {
      if (window.TabsVisibility) {
        window.TabsVisibility.updateLastTabDot();
        window.TabsVisibility.scheduleVisibilityUpdate();
      }
    }, 0);
  }

  function setDefaultTabIcon(iconSpan) {
    iconSpan.textContent = '';
    let img = iconSpan.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      iconSpan.appendChild(img);
    }
    img.src = state.DEFAULT_TAB_ICON;
  }

  function hostnameIcon(url) {
    try {
      const hostname = new URL(url).hostname;
      if (hostname.includes('youtube')) return '▶';
      if (hostname.includes('github')) return '🐙';
      if (hostname.includes('whatsapp')) return '💬';
      if (hostname.includes('google')) return 'G';
      return '🌐';
    } catch {
      return '🌐';
    }
  }

  const GOOGLE_SCROLLBAR_CSS = `
    html, body {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    html::-webkit-scrollbar,
    body::-webkit-scrollbar,
    *::-webkit-scrollbar {
      width: 0 !important;
      height: 0 !important;
      display: none !important;
    }
  `;

  function isGoogleUrl(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname === 'google.com' || hostname === 'www.google.com' ||
        hostname.endsWith('.google.com');
    } catch (_) {
      return false;
    }
  }

  async function syncGoogleScrollbar(webview) {
    if (!webview || typeof webview.getURL !== 'function') return;

    let url = '';
    try {
      url = webview.getURL();
    } catch (_) {
      return;
    }

    if (!isGoogleUrl(url)) {
      const previousKey = webview.__googleScrollbarCssKey;
      webview.__googleScrollbarCssKey = null;
      if (previousKey && typeof webview.removeInsertedCSS === 'function') {
        try {
          await webview.removeInsertedCSS(previousKey);
        } catch (_) {
          /* guest navegou antes da remoção */
        }
      }
      return;
    }

    if (webview.__googleScrollbarCssKey || typeof webview.insertCSS !== 'function') return;
    try {
      webview.__googleScrollbarCssKey = await webview.insertCSS(GOOGLE_SCROLLBAR_CSS);
    } catch (_) {
      /* webview ainda não está pronto */
    }
  }

  // Criação centralizada do <webview> (DRY). Partition por usuário
  // (`persist:dragon-{userId}`) isola cookies/cache entre perfis.
  function buildWebview(url, tabId, opts) {
    const webview = document.createElement('webview');
    webview.setAttribute('allowpopups', '');
    const partition =
      (window.UserSession && typeof window.UserSession.getPartition === 'function'
        ? window.UserSession.getPartition()
        : null) || 'persist:dragon-pending';
    webview.setAttribute('partition', partition);
    webview.dataset.id = tabId;
    if (opts?.deferLoad && url) {
      webview.dataset.pendingSrc = url;
      webview.src = 'about:blank';
    } else {
      webview.src = url;
    }
    return webview;
  }

  // Refs da aba/webview ativa — evita querySelectorAll em toda troca.
  let activeTabEl = null;
  let activeWebviewEl = null;

  function clearAdjacentAround(tab) {
    if (!tab) return;
    const prev = tab.previousElementSibling;
    const next = tab.nextElementSibling;
    if (prev && prev.classList?.contains('tab')) prev.classList.remove('adjacent-to-active');
    if (next && next.classList?.contains('tab')) next.classList.remove('adjacent-to-active');
  }

  function isSplitMode() {
    return document.documentElement.dataset.janelasMode === 'split';
  }

  function finishActivateBrowserTab(targetTab, targetWebview, tabId) {
    const surfaceMs = 320;
    const split = isSplitMode();

    document.body.classList.add('janelas-content-switching');
    window.clearTimeout(finishActivateBrowserTab._chromeTimer);
    finishActivateBrowserTab._chromeTimer = window.setTimeout(() => {
      document.body.classList.remove('janelas-content-switching');
    }, surfaceMs + 60);

    if (activeTabEl && activeTabEl !== targetTab && activeTabEl.isConnected) {
      activeTabEl.classList.remove('active', 'adjacent-to-active');
      clearAdjacentAround(activeTabEl);
    } else if (!activeTabEl) {
      document.querySelectorAll('#tabs .tab.active, #tabs .tab.adjacent-to-active').forEach((tab) => {
        if (tab !== targetTab) tab.classList.remove('active', 'adjacent-to-active');
      });
    }

    targetTab.classList.add('active');
    activeTabEl = targetTab;
    if (window.TabsAnim) window.TabsAnim.setAdjacentToActive(targetTab);

    const prevWebview = activeWebviewEl;

    // Nova tela já opaca por baixo; a anterior some por cima (crossfade sem piscar)
    targetWebview.classList.remove('is-leaving', 'is-entering');
    targetWebview.classList.add('active');
    activeWebviewEl = targetWebview;

    if (split) {
      if (prevWebview && prevWebview !== targetWebview && prevWebview.isConnected) {
        prevWebview.classList.remove('active', 'is-leaving', 'is-entering');
      }
    } else if (prevWebview && prevWebview !== targetWebview && prevWebview.isConnected) {
      // Força opacity 1 → depois is-leaving (senão o browser pula o transition)
      prevWebview.classList.remove('is-leaving');
      prevWebview.classList.add('active');
      void prevWebview.offsetWidth;
      prevWebview.classList.add('is-leaving');
      window.setTimeout(() => {
        if (!prevWebview.isConnected) return;
        prevWebview.classList.remove('active', 'is-leaving');
      }, surfaceMs + 40);
    } else if (!prevWebview) {
      document.querySelectorAll('#browser webview.active').forEach((view) => {
        if (view !== targetWebview) {
          view.classList.remove('active', 'is-leaving', 'is-entering');
        }
      });
    }

    window.showBrowser();
    window.TabWarmth?.markActive?.(tabId);
    emitTabChanged(tabId, false);

    requestAnimationFrame(() => {
      if (typeof window.updateAddressBar === 'function') window.updateAddressBar();
      if (typeof window.updateNavigationButtons === 'function') window.updateNavigationButtons();
      if (window.TabsVisibility) window.TabsVisibility.scheduleVisibilityUpdate();
      requestAnimationFrame(() => {
        window.TabWarmth?.hydrateWebview?.(targetWebview);
      });
    });

    setTimeout(() => window.TabWarmth?.maybeDiscardCold?.(), surfaceMs + 120);
  }

  function finishActivateHomeTab(tab, tabId) {
    const prevWebview = activeWebviewEl;
    const surfaceMs = window.AppShell?.SURFACE_MS || 280;
    const split = isSplitMode();

    if (prevWebview && prevWebview.isConnected) {
      if (split) {
        prevWebview.classList.remove('active', 'is-leaving', 'is-entering');
      } else {
        prevWebview.classList.add('is-leaving');
        window.setTimeout(() => {
          if (!prevWebview.isConnected) return;
          prevWebview.classList.remove('active', 'is-leaving');
        }, surfaceMs + 40);
      }
    } else {
      document.querySelectorAll('#browser webview.active').forEach((view) => {
        view.classList.remove('active', 'is-leaving', 'is-entering');
      });
    }
    activeWebviewEl = null;

    if (activeTabEl && activeTabEl !== tab && activeTabEl.isConnected) {
      activeTabEl.classList.remove('active', 'adjacent-to-active');
      clearAdjacentAround(activeTabEl);
    } else if (!activeTabEl) {
      document.querySelectorAll('#tabs .tab.active, #tabs .tab.adjacent-to-active').forEach((t) => {
        if (t !== tab) t.classList.remove('active', 'adjacent-to-active');
      });
    }

    tab.classList.add('active');
    activeTabEl = tab;

    if (window.TabsAnim) window.TabsAnim.setAdjacentToActive(tab);

    emitTabChanged(tabId, true);
    window.showHome();

    if (window.TabsVisibility) window.TabsVisibility.scheduleVisibilityUpdate();
    if (typeof window.updateNavigationButtons === 'function') window.updateNavigationButtons();
  }

  // Reafirma o botão de aba ativo (ex.: fim de animação cosmética).
  function restoreActiveTabButton(targetTab) {
    if (activeTabEl && activeTabEl !== targetTab && activeTabEl.isConnected) {
      activeTabEl.classList.remove('active', 'adjacent-to-active');
      clearAdjacentAround(activeTabEl);
    }
    targetTab.classList.add('active');
    activeTabEl = targetTab;
    if (window.TabsAnim) window.TabsAnim.setAdjacentToActive(targetTab);
  }

  function attachWebviewListeners(webview, tabId, titleSpan) {
    webview.addEventListener('dom-ready', () => {
      syncGoogleScrollbar(webview);
    });

    webview.addEventListener('did-navigate', () => {
      syncGoogleScrollbar(webview);
    });

    webview.addEventListener('did-navigate-in-page', () => {
      syncGoogleScrollbar(webview);
    });

    webview.addEventListener('page-title-updated', (e) => {
      if (e.title && titleSpan) {
        titleSpan.textContent = e.title.length > 25 ? `${e.title.substring(0, 25)}...` : e.title;
      }
    });

    webview.addEventListener('page-favicon-updated', (e) => {
      if (e.favicons && e.favicons.length > 0) {
        updateTabIcon(tabId, e.favicons[0]);
      }
    });

    webview.addEventListener('did-finish-load', () => {
      try {
        const currentUrl = webview.getURL();
        if (currentUrl && currentUrl !== 'about:blank' && !currentUrl.includes('google.com/search')) {
          const urlObj = new URL(currentUrl);
          updateTabIcon(tabId, `${urlObj.protocol}//${urlObj.host}/favicon.ico`);
        }
      } catch (e) {
        // Ignorar
      }
    });

    if (typeof window.setupWebviewNavigation === 'function') {
      window.setupWebviewNavigation(webview);
    }

    if (typeof window.trackWebviewHistory === 'function') {
      window.trackWebviewHistory(webview);
    }

    if (window.CursorMouseEventService) {
      window.CursorMouseEventService.attachWebviewEvents(webview);
    }

    if (window.PasswordWebviewAdapter && typeof window.PasswordWebviewAdapter.attach === 'function') {
      window.PasswordWebviewAdapter.attach(webview, tabId);
    }
  }

  function insertTabElements(tabButton, webview, referenceTabId) {
    const tabsContainer = document.getElementById('tabs');
    const browserContainer = document.getElementById('browser');

    if (referenceTabId) {
      const refTab = document.querySelector(`.tab[data-id="${referenceTabId}"]`);
      const refWebview = document.querySelector(`webview[data-id="${referenceTabId}"]`);

      if (refTab && refTab.parentNode === tabsContainer) {
        tabsContainer.insertBefore(tabButton, refTab.nextSibling);
      } else {
        tabsContainer.appendChild(tabButton);
      }

      if (refWebview && browserContainer) {
        browserContainer.insertBefore(webview, refWebview.nextSibling);
      } else if (browserContainer) {
        browserContainer.appendChild(webview);
      }
    } else {
      tabsContainer.appendChild(tabButton);
      browserContainer.appendChild(webview);
    }
  }

  function createTabAfter(referenceTabId, url, title = null, icon = null, activate = true, opts = null) {
    state.tabCount += 1;
    const tabId = `tab-${state.tabCount}`;
    const displayTitle = title || (url.includes('google.com/search') ? 'Busca' : 'Nova Aba');
    const deferLoad = Boolean(opts?.deferLoad) && !activate;

    const tabButton = document.createElement('div');
    tabButton.classList.add('tab');
    tabButton.dataset.id = tabId;

    const closeBtn = document.createElement('span');
    closeBtn.classList.add('tab-close');
    closeBtn.innerHTML = '×';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeTab(tabId);
    };
    tabButton.appendChild(closeBtn);

    const iconSpan = document.createElement('span');
    iconSpan.classList.add('tab-icon');
    iconSpan.textContent = icon || hostnameIcon(url);
    tabButton.appendChild(iconSpan);

    const titleSpan = document.createElement('span');
    titleSpan.classList.add('tab-title');
    titleSpan.textContent = displayTitle;
    tabButton.appendChild(titleSpan);

    tabButton.onclick = () => (window.activateTab || activateTab)(tabId);

    if (window.TabsReorder) window.TabsReorder.setupTabDragAndDrop(tabButton);
    if (window.CursorMouseEventService) window.CursorMouseEventService.attachTabEvents(tabButton);

    const webview = buildWebview(url, tabId, { deferLoad });
    // Precisa estar no DOM antes de listeners/activate chamarem APIs do guest.
    insertTabElements(tabButton, webview, referenceTabId);
    attachWebviewListeners(webview, tabId, titleSpan);
    afterTabLayoutUpdate();

    emitTabCreated(tabId, false);
    if (activate) (window.activateTab || activateTab)(tabId);
    return tabId;
  }

  function createTab(url, title = null, icon = null, activate = true, opts = null) {
    state.tabCount += 1;
    const tabId = `tab-${state.tabCount}`;
    const displayTitle = title || (url.includes('google.com/search') ? 'Busca' : 'Nova Aba');
    const deferLoad = Boolean(opts?.deferLoad) && !activate;

    const tabButton = document.createElement('div');
    tabButton.classList.add('tab');
    tabButton.dataset.id = tabId;

    const closeBtn = document.createElement('span');
    closeBtn.classList.add('tab-close');
    closeBtn.innerHTML = '×';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeTab(tabId);
    };
    tabButton.appendChild(closeBtn);

    const iconSpan = document.createElement('span');
    iconSpan.classList.add('tab-icon');
    iconSpan.textContent = icon || hostnameIcon(url);
    tabButton.appendChild(iconSpan);

    const titleSpan = document.createElement('span');
    titleSpan.classList.add('tab-title');
    titleSpan.textContent = displayTitle;
    tabButton.appendChild(titleSpan);

    tabButton.onclick = () => (window.activateTab || activateTab)(tabId);

    if (window.TabsReorder) window.TabsReorder.setupTabDragAndDrop(tabButton);
    if (window.CursorMouseEventService) window.CursorMouseEventService.attachTabEvents(tabButton);

    const webview = buildWebview(url, tabId, { deferLoad });
    insertTabElements(tabButton, webview, null);
    attachWebviewListeners(webview, tabId, titleSpan);
    afterTabLayoutUpdate();
    emitTabCreated(tabId, false);
    if (activate !== false) (window.activateTab || activateTab)(tabId);
    return tabId;
  }

  function activateTab(tabId) {
    if (tabId && tabId.startsWith('home-tab')) {
      activateHomeTab(tabId);
      return;
    }

    // Lookup direto por id (sem varrer todas as abas).
    const targetTab = document.querySelector(`#tabs .tab[data-id="${tabId}"]`);
    const targetWebview = document.querySelector(`#browser webview[data-id="${tabId}"]`);
    if (!targetTab || !targetWebview) return;

    finishActivateBrowserTab(targetTab, targetWebview, tabId);
  }

  function closeTab(tabId) {
    const tab = document.querySelector(`.tab[data-id="${tabId}"]`);
    const webview = document.querySelector(`webview[data-id="${tabId}"]`);

    if (activeTabEl && activeTabEl.dataset.id === tabId) activeTabEl = null;
    if (activeWebviewEl && activeWebviewEl.dataset.id === tabId) activeWebviewEl = null;

    if (tab) tab.remove();
    if (webview) webview.remove();

    emitTabClosed(tabId);
    forgetTab(tabId);

    if (window.TabsVisibility) {
      window.TabsVisibility.updateLastTabDot();
      window.TabsVisibility.scheduleVisibilityUpdate();
    }

    if (state.currentActiveTab === tabId) {
      const nextId = pickTabAfterClose(tabId);
      if (nextId) {
        (window.activateTab || activateTab)(nextId);
      } else {
        state.currentActiveTab = null;
        window.currentActiveTab = null;
        window.showHome();
        if (window.NavSearch) window.NavSearch.clearAddressBar();
      }
    }
  }

  function createHomeTab(activate = true) {
    state.tabCount += 1;
    const tabId = `home-tab-${state.tabCount}`;

    const tabButton = document.createElement('div');
    tabButton.classList.add('tab');
    tabButton.dataset.id = tabId;

    const closeBtn = document.createElement('span');
    closeBtn.classList.add('tab-close');
    closeBtn.innerHTML = '×';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeTab(tabId);
    };
    tabButton.appendChild(closeBtn);

    const iconSpan = document.createElement('span');
    iconSpan.classList.add('tab-icon');
    setDefaultTabIcon(iconSpan);
    tabButton.appendChild(iconSpan);

    const titleSpan = document.createElement('span');
    titleSpan.classList.add('tab-title');
    titleSpan.textContent = 'New Tab';
    tabButton.appendChild(titleSpan);

    tabButton.onclick = () => (window.activateHomeTab || activateHomeTab)(tabId);

    if (window.TabsReorder) window.TabsReorder.setupTabDragAndDrop(tabButton);
    if (window.CursorMouseEventService) window.CursorMouseEventService.attachTabEvents(tabButton);

    document.getElementById('tabs').appendChild(tabButton);
    afterTabLayoutUpdate();

    emitTabCreated(tabId, true);
    if (activate !== false) (window.activateHomeTab || activateHomeTab)(tabId);
    return tabId;
  }

  function activateHomeTab(tabId) {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const targetIndex = tabs.findIndex((tab) => tab.dataset.id === tabId);
    if (targetIndex === -1) return;

    const tab = tabs[targetIndex];
    if (!tab) return;

    finishActivateHomeTab(tab, tabId);
    restoreActiveTabButton(tab);
  }

  function updateTabIcon(tabId, faviconUrl) {
    const tab = document.querySelector(`.tab[data-id="${tabId}"]`);
    if (!tab) return;

    const iconSpan = tab.querySelector('.tab-icon');
    if (!iconSpan) return;

    let faviconImg = iconSpan.querySelector('img');
    if (!faviconImg) {
      faviconImg = document.createElement('img');
      faviconImg.style.width = '14px';
      faviconImg.style.height = '14px';
      faviconImg.style.objectFit = 'contain';
      faviconImg.style.borderRadius = '2px';
      faviconImg.onerror = () => {
        if (faviconImg.parentNode) faviconImg.remove();
      };
      iconSpan.textContent = '';
      iconSpan.appendChild(faviconImg);
    }

    faviconImg.src = faviconUrl;
  }

  function getTabUrl(tabId) {
    const webview = document.querySelector(`webview[data-id="${tabId}"]`);
    if (!webview) return null;
    try {
      return (typeof webview.getURL === 'function' && webview.getURL()) || webview.src || null;
    } catch {
      return webview.src || null;
    }
  }

  function getTabSnapshot(tabId, position = 0) {
    const tab = document.querySelector(`.tab[data-id="${tabId}"]`);
    if (!tab) return null;

    const isHomeTab = tabId.startsWith('home-tab');
    const titleEl = tab.querySelector('.tab-title');
    const faviconImg = tab.querySelector('.tab-icon img');
    const url = isHomeTab ? null : getTabUrl(tabId);
    if (!isHomeTab && (!url || url === 'about:blank')) return null;

    return {
      runtime_tab_id: tabId,
      is_home: isHomeTab,
      url,
      title: titleEl ? titleEl.textContent.trim() : null,
      favicon_url: faviconImg?.src || null,
      active: tab.classList.contains('active'),
      position,
    };
  }

  function getOpenTabSnapshots() {
    return Array.from(document.querySelectorAll('#tabs .tab'))
      .map((tab, index) => getTabSnapshot(tab.dataset.id || '', index))
      .filter(Boolean);
  }

  function createTabFromSnapshot(snapshot, activate = false, referenceTabId = null) {
    if (!snapshot) return null;
    if (snapshot.is_home || snapshot.isHomeTab) {
      return createHomeTab(activate);
    }

    const url = snapshot.url;
    if (!url) return null;

    const deferOpts = activate ? null : { deferLoad: true };
    const id = referenceTabId
      ? createTabAfter(referenceTabId, url, snapshot.title || null, null, activate, deferOpts)
      : createTab(url, snapshot.title || null, null, activate, deferOpts);

    if (id && snapshot.favicon_url) {
      updateTabIcon(id, snapshot.favicon_url);
    }
    return id;
  }

  function clearTabsForGroupSwitch(showHome = false) {
    document.querySelectorAll('#tabs .tab').forEach((tab) => tab.remove());
    document.querySelectorAll('#browser webview').forEach((view) => view.remove());
    state.currentActiveTab = null;
    window.currentActiveTab = null;
    activeTabEl = null;
    activeWebviewEl = null;

    if (showHome) {
      window.showHome();
    }

    document.dispatchEvent(new CustomEvent('app:tabs-cleared'));
    afterTabLayoutUpdate();
  }

  function convertHomeTabToNormalTab(tabId, url, title = null) {
    const tab = document.querySelector(`.tab[data-id="${tabId}"]`);
    if (!tab) return;

    state.tabCount += 1;
    const newTabId = `tab-${state.tabCount}`;
    tab.dataset.id = newTabId;
    tab.onclick = () => (window.activateTab || activateTab)(newTabId);

    const titleSpan = tab.querySelector('.tab-title');
    if (titleSpan) titleSpan.textContent = title || 'Nova Aba';

    const iconSpan = tab.querySelector('.tab-icon');
    if (iconSpan) iconSpan.textContent = hostnameIcon(url);

    const webview = buildWebview(url, newTabId);
    webview.classList.add('active');
    document.getElementById('browser').appendChild(webview);
    attachWebviewListeners(webview, newTabId, titleSpan);

    emitTabCreated(newTabId, false);
    emitTabChanged(newTabId, false);
    window.showBrowser();

    if (window.TabsVisibility) window.TabsVisibility.updateTabsBarVisibility();
    if (typeof window.updateAddressBar === 'function') window.updateAddressBar();
    if (typeof window.updateNavigationButtons === 'function') window.updateNavigationButtons();
  }

  function createNewTab() {
    createHomeTab();
  }

  window.TabsCore = {
    createTab,
    createTabAfter,
    activateTab,
    closeTab,
    createNewTab,
    createHomeTab,
    activateHomeTab,
    updateTabIcon,
    convertHomeTabToNormalTab,
    getTabSnapshot,
    getOpenTabSnapshots,
    createTabFromSnapshot,
    clearTabsForGroupSwitch,
  };

  window.createTab = createTab;
  window.createTabAfter = createTabAfter;
  window.activateTab = activateTab;
  window.closeTab = closeTab;
  window.createNewTab = createNewTab;
  window.createHomeTab = createHomeTab;
  window.activateHomeTab = activateHomeTab;
  window.updateTabIcon = updateTabIcon;
  window.convertHomeTabToNormalTab = convertHomeTabToNormalTab;
  window.getOpenTabSnapshots = getOpenTabSnapshots;
  window.createTabFromSnapshot = createTabFromSnapshot;
  window.clearTabsForGroupSwitch = clearTabsForGroupSwitch;
})();
