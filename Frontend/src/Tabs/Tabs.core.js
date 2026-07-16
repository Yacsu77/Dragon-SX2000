/**
 * Lógica principal das abas: criar, fechar, ativar, home tab, webview.
 */
(function () {
  const state = window.TabsState;

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

  // Criação centralizada do <webview> (DRY). Partition por usuário
  // (`persist:dragon-{userId}`) isola cookies/cache entre perfis.
  function buildWebview(url, tabId) {
    const webview = document.createElement('webview');
    webview.setAttribute('allowpopups', '');
    const partition =
      (window.UserSession && typeof window.UserSession.getPartition === 'function'
        ? window.UserSession.getPartition()
        : null) || 'persist:dragon-pending';
    webview.setAttribute('partition', partition);
    webview.dataset.id = tabId;
    webview.src = url;
    return webview;
  }

  function finishActivateBrowserTab(targetTab, targetWebview, tabId) {
    document.querySelectorAll('webview').forEach((view) => view.classList.remove('active'));

    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.remove('active', 'adjacent-to-active');
    });

    targetTab.classList.add('active');
    targetWebview.classList.add('active');

    if (window.TabsAnim) window.TabsAnim.setAdjacentToActive(targetTab);

    emitTabChanged(tabId, false);
    window.showBrowser();

    if (typeof window.updateAddressBar === 'function') window.updateAddressBar();
    if (typeof window.updateNavigationButtons === 'function') window.updateNavigationButtons();
  }

  function finishActivateHomeTab(tab, tabId) {
    document.querySelectorAll('webview').forEach((view) => view.classList.remove('active'));
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active', 'adjacent-to-active'));

    tab.classList.add('active');

    if (window.TabsAnim) window.TabsAnim.setAdjacentToActive(tab);

    emitTabChanged(tabId, true);
    window.showHome();

    if (window.TabsVisibility) window.TabsVisibility.scheduleVisibilityUpdate();
    if (typeof window.updateNavigationButtons === 'function') window.updateNavigationButtons();
  }

  // Reafirma o botão de aba ativo ao fim da animação cosmética. A webview já
  // foi ativada de forma instantânea, então isto só ajusta a barra de abas.
  function restoreActiveTabButton(targetTab) {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.remove('active', 'adjacent-to-active');
    });
    targetTab.classList.add('active');
    if (window.TabsAnim) window.TabsAnim.setAdjacentToActive(targetTab);
  }

  function attachWebviewListeners(webview, tabId, titleSpan) {
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

  function createTabAfter(referenceTabId, url, title = null, icon = null, activate = true) {
    state.tabCount += 1;
    const tabId = `tab-${state.tabCount}`;
    const displayTitle = title || (url.includes('google.com/search') ? 'Busca' : 'Nova Aba');

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

    tabButton.onclick = () => activateTab(tabId);

    if (window.TabsReorder) window.TabsReorder.setupTabDragAndDrop(tabButton);
    if (window.CursorMouseEventService) window.CursorMouseEventService.attachTabEvents(tabButton);

    const webview = buildWebview(url, tabId);
    // Precisa estar no DOM antes de listeners/activate chamarem APIs do guest.
    insertTabElements(tabButton, webview, referenceTabId);
    attachWebviewListeners(webview, tabId, titleSpan);
    afterTabLayoutUpdate();

    emitTabCreated(tabId, false);
    if (activate) activateTab(tabId);
    return tabId;
  }

  function createTab(url, title = null, icon = null, activate = true) {
    state.tabCount += 1;
    const tabId = `tab-${state.tabCount}`;
    const displayTitle = title || (url.includes('google.com/search') ? 'Busca' : 'Nova Aba');

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

    tabButton.onclick = () => activateTab(tabId);

    if (window.TabsReorder) window.TabsReorder.setupTabDragAndDrop(tabButton);
    if (window.CursorMouseEventService) window.CursorMouseEventService.attachTabEvents(tabButton);

    const webview = buildWebview(url, tabId);
    insertTabElements(tabButton, webview, null);
    attachWebviewListeners(webview, tabId, titleSpan);
    afterTabLayoutUpdate();
    emitTabCreated(tabId, false);
    if (activate !== false) activateTab(tabId);
    return tabId;
  }

  function activateTab(tabId) {
    if (tabId && tabId.startsWith('home-tab')) {
      activateHomeTab(tabId);
      return;
    }

    const tabs = Array.from(document.querySelectorAll('.tab'));
    const targetIndex = tabs.findIndex((tab) => tab.dataset.id === tabId);
    if (targetIndex === -1) return;

    const targetTab = tabs[targetIndex];
    const targetWebview = document.querySelector(`webview[data-id="${tabId}"]`);
    if (!targetTab || !targetWebview) return;

    // Troca de conteúdo IMEDIATA: alterna a webview visível agora, sem esperar
    // a animação da barra de abas. Antes, a webview alvo só era ativada no
    // onComplete (~250–400ms depois), deixando a área de conteúdo vazia nesse
    // intervalo — o que causava o "flash" do fundo e a lentidão percebida.
    finishActivateBrowserTab(targetTab, targetWebview, tabId);

    restoreActiveTabButton(targetTab);
  }

  function closeTab(tabId) {
    const tab = document.querySelector(`.tab[data-id="${tabId}"]`);
    const webview = document.querySelector(`webview[data-id="${tabId}"]`);

    if (tab) tab.remove();
    if (webview) webview.remove();

    emitTabClosed(tabId);

    if (window.TabsVisibility) {
      window.TabsVisibility.updateLastTabDot();
      window.TabsVisibility.scheduleVisibilityUpdate();
    }

    if (state.currentActiveTab === tabId) {
      const remainingTabs = document.querySelectorAll('.tab');
      if (remainingTabs.length > 0) {
        activateTab(remainingTabs[0].dataset.id);
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

    tabButton.onclick = () => activateHomeTab(tabId);

    if (window.TabsReorder) window.TabsReorder.setupTabDragAndDrop(tabButton);
    if (window.CursorMouseEventService) window.CursorMouseEventService.attachTabEvents(tabButton);

    document.getElementById('tabs').appendChild(tabButton);
    afterTabLayoutUpdate();

    emitTabCreated(tabId, true);
    if (activate !== false) activateHomeTab(tabId);
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

    const id = referenceTabId
      ? createTabAfter(referenceTabId, url, snapshot.title || null, null, activate)
      : createTab(url, snapshot.title || null, null, activate);

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
    tab.onclick = () => activateTab(newTabId);

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
