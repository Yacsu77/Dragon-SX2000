/**
 * Visibilidade da barra de abas e ponto "+" (nova aba).
 */
(function () {
  function updateLastTabDot() {
    document.querySelectorAll('.new-tab-dot').forEach((dot) => dot.remove());

    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab) => {
      const titleSpan = tab.querySelector('.tab-title');

      if (!tab.querySelector('.new-tab-dot')) {
        const dotContainer = document.createElement('div');
        dotContainer.classList.add('new-tab-dot');
        dotContainer.onclick = (e) => {
          e.stopPropagation();
          if (typeof window.createNewTab === 'function') {
            window.createNewTab();
          }
        };

        const dot = document.createElement('span');
        dot.classList.add('dot');
        dotContainer.appendChild(dot);

        const plusIcon = document.createElement('span');
        plusIcon.classList.add('plus-icon');
        plusIcon.textContent = '+';
        dotContainer.appendChild(plusIcon);

        if (titleSpan && titleSpan.nextSibling) {
          tab.insertBefore(dotContainer, titleSpan.nextSibling);
        } else {
          tab.appendChild(dotContainer);
        }
      }
    });
  }

  function updateTabsBarVisibility() {
    const tabsBar = document.querySelector('.tabs-bar');
    const tabs = document.querySelectorAll('.tab');

    if (tabs.length === 1 && tabs[0].dataset.id && tabs[0].dataset.id.startsWith('home-tab')) {
      if (tabsBar) tabsBar.classList.add('hidden');
    } else if (tabsBar) {
      tabsBar.classList.remove('hidden');
    }

    const tabsContainer = document.querySelector('.tabs');
    if (!tabsContainer || tabs.length === 0) return;

    tabsContainer.offsetHeight;

    const activeTab = tabsContainer.querySelector('.tab.active');
    if (activeTab) {
      const containerWidth = tabsContainer.offsetWidth;
      const activeTabWidth = activeTab.offsetWidth;
      const activeTabPercentage = containerWidth > 0 ? (activeTabWidth / containerWidth) * 100 : 0;

      if (activeTabPercentage < 15 && containerWidth > 0) {
        tabsContainer.classList.add('many-tabs');
        const minWidthPixels = containerWidth * 0.15;
        activeTab.style.minWidth = `${minWidthPixels}px`;
        activeTab.style.flexShrink = '0';
        activeTab.style.flexGrow = '0';

        tabsContainer.querySelectorAll('.tab:not(.active)').forEach((tab) => {
          tab.style.minWidth = '';
          tab.style.maxWidth = '';
          tab.style.width = '';
          tab.style.flexGrow = '';
          tab.style.flexShrink = '';
        });
      } else {
        tabsContainer.classList.remove('many-tabs');
        activeTab.style.minWidth = '';
        activeTab.style.flexShrink = '';
        activeTab.style.flexGrow = '';

        tabsContainer.querySelectorAll('.tab:not(.active)').forEach((tab) => {
          tab.style.minWidth = '';
          tab.style.maxWidth = '';
          tab.style.width = '';
          tab.style.flexGrow = '';
          tab.style.flexShrink = '';
        });
      }
    } else {
      const containerWidth = tabsContainer.offsetWidth;
      if (containerWidth > 0) {
        const estimatedTabWidth = containerWidth / tabs.length;
        const estimatedPercentage = (estimatedTabWidth / containerWidth) * 100;
        tabsContainer.classList.toggle('many-tabs', estimatedPercentage < 15);
      }
    }
  }

  function scheduleVisibilityUpdate() {
    requestAnimationFrame(() => {
      setTimeout(() => updateTabsBarVisibility(), 0);
    });
  }

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => updateTabsBarVisibility(), 150);
  });

  window.TabsVisibility = {
    updateLastTabDot,
    updateTabsBarVisibility,
    scheduleVisibilityUpdate,
  };

  window.updateTabsBarVisibility = updateTabsBarVisibility;
})();
