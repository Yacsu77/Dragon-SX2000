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
    tab.classList.add('active');

    if (window.TabsAnim) window.TabsAnim.setAdjacentToActive(tab);

    emitTabChanged(tabId, true);
    window.showHome();

    if (window.TabsVisibility) window.TabsVisibility.scheduleVisibilityUpdate();
    if (typeof window.updateNavigationButtons === 'function') window.updateNavigationButtons();
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
  }

  function createTab(url, title = null, icon = null) {
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

    document.getElementById('tabs').appendChild(tabButton);
    afterTabLayoutUpdate();

    const webview = document.createElement('webview');
    webview.src = url;
    webview.dataset.id = tabId;
    attachWebviewListeners(webview, tabId, titleSpan);

    document.getElementById('browser').appendChild(webview);
    emitTabCreated(tabId, false);
    activateTab(tabId);
    return tabId;
  }

  function activateTab(tabId) {
    if (tabId && tabId.startsWith('home-tab')) {
      activateHomeTab(tabId);
      return;
    }

    const tabs = Array.from(document.querySelectorAll('.tab'));
    const currentIndex = tabs.findIndex((tab) => tab.classList.contains('active'));
    const targetIndex = tabs.findIndex((tab) => tab.dataset.id === tabId);
    if (targetIndex === -1) return;

    const targetTab = tabs[targetIndex];
    const targetWebview = document.querySelector(`webview[data-id="${tabId}"]`);
    if (!targetTab || !targetWebview) return;

    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.remove('active', 'adjacent-to-active');
    });
    document.querySelectorAll('webview').forEach((view) => view.classList.remove('active'));

    if (currentIndex === -1 || currentIndex === targetIndex) {
      finishActivateBrowserTab(targetTab, targetWebview, tabId);
      return;
    }

    if (window.TabsAnim) {
      window.TabsAnim.animateTabTransition({
        currentIndex,
        targetIndex,
        tabs,
        onComplete: () => finishActivateBrowserTab(targetTab, targetWebview, tabId),
      });
    } else {
      finishActivateBrowserTab(targetTab, targetWebview, tabId);
    }
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

  function createHomeTab() {
    state.tabCount += 1;
    const tabId = `home-tab-${state.tabCount}`;

    const tabButton = document.createElement('div');
    tabButton.classList.add('tab');
    tabButton.dataset.id = tabId;

    const iconSpan = document.createElement('span');
    iconSpan.classList.add('tab-icon');
    setDefaultTabIcon(iconSpan);
    tabButton.appendChild(iconSpan);

    const titleSpan = document.createElement('span');
    titleSpan.classList.add('tab-title');
    titleSpan.textContent = 'New Tab';
    tabButton.appendChild(titleSpan);

    const closeBtn = document.createElement('span');
    closeBtn.classList.add('tab-close');
    closeBtn.innerHTML = '×';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeTab(tabId);
    };
    tabButton.appendChild(closeBtn);

    tabButton.onclick = () => activateHomeTab(tabId);

    if (window.TabsReorder) window.TabsReorder.setupTabDragAndDrop(tabButton);

    document.getElementById('tabs').appendChild(tabButton);
    afterTabLayoutUpdate();

    emitTabCreated(tabId, true);
    activateHomeTab(tabId);
    return tabId;
  }

  function activateHomeTab(tabId) {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const currentIndex = tabs.findIndex((tab) => tab.classList.contains('active'));
    const targetIndex = tabs.findIndex((tab) => tab.dataset.id === tabId);
    if (targetIndex === -1) return;

    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.remove('active', 'adjacent-to-active');
    });
    document.querySelectorAll('webview').forEach((view) => view.classList.remove('active'));

    const tab = tabs[targetIndex];
    if (!tab) return;

    if (currentIndex !== -1 && currentIndex !== targetIndex && window.TabsAnim) {
      window.TabsAnim.animateTabTransition({
        currentIndex,
        targetIndex,
        tabs,
        onComplete: () => finishActivateHomeTab(tab, tabId),
      });
    } else {
      finishActivateHomeTab(tab, tabId);
    }
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

    const webview = document.createElement('webview');
    webview.src = url;
    webview.dataset.id = newTabId;
    webview.classList.add('active');
    attachWebviewListeners(webview, newTabId, titleSpan);

    document.getElementById('browser').appendChild(webview);

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
    activateTab,
    closeTab,
    createNewTab,
    createHomeTab,
    activateHomeTab,
    updateTabIcon,
    convertHomeTabToNormalTab,
  };

  window.createTab = createTab;
  window.activateTab = activateTab;
  window.closeTab = closeTab;
  window.createNewTab = createNewTab;
  window.createHomeTab = createHomeTab;
  window.activateHomeTab = activateHomeTab;
  window.updateTabIcon = updateTabIcon;
  window.convertHomeTabToNormalTab = convertHomeTabToNormalTab;
})();
