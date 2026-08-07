/**
 * Visibilidade da barra de abas e ponto "+" (nova aba).
 *
 * 6+  → many-tabs  (larguras condensadas; X substitui logo à ESQUERDA no hover)
 * 13+ → dense-tabs (ícone/X centralizados — só quando muito apertado)
 */
(function () {
  const MANY_TABS_THRESHOLD = 6;
  const DENSE_TABS_THRESHOLD = 13;
  const REFERENCE_TAB_COUNT = 5;
  const INACTIVE_MIN_WIDTH = 36;

  let lastSignature = '';

  function resetTabSizing(tabsContainer) {
    if (!tabsContainer) return;
    tabsContainer.classList.remove('many-tabs', 'dense-tabs');
    tabsContainer.style.removeProperty('--many-active-tab-width');
    tabsContainer.style.removeProperty('--many-inactive-tab-width');
    lastSignature = '';
  }

  function computeActiveWidthForManyTabs(containerWidth, tabCount) {
    if (containerWidth <= 0 || tabCount < MANY_TABS_THRESHOLD) return null;

    const referenceWidth = Math.floor(containerWidth / REFERENCE_TAB_COUNT);
    const inactiveCount = Math.max(1, tabCount - 1);
    const maxActive = Math.max(96, containerWidth - inactiveCount * INACTIVE_MIN_WIDTH);

    return Math.max(96, Math.min(referenceWidth, maxActive));
  }

  function ensureLedRing(tab) {
    if (!tab || tab.querySelector('.tab-led-ring')) return;
    const ring = document.createElement('span');
    ring.className = 'tab-led-ring';
    ring.setAttribute('aria-hidden', 'true');
    tab.insertBefore(ring, tab.firstChild);
  }

  function updateLastTabDot() {
    const tabs = document.querySelectorAll('#tabs .tab');
    tabs.forEach((tab) => {
      ensureLedRing(tab);
      if (tab.querySelector('.new-tab-dot')) return;

      const titleSpan = tab.querySelector('.tab-title');
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
    });
  }

  function updateTabsBarVisibility() {
    const tabsBar = document.querySelector('.tabs-bar');
    const tabs = document.querySelectorAll('#tabs .tab');
    const hasGroupsButton = Boolean(document.getElementById('tabGroupsBtn'));

    if (
      !hasGroupsButton &&
      tabs.length === 1 &&
      tabs[0].dataset.id &&
      tabs[0].dataset.id.startsWith('home-tab')
    ) {
      if (tabsBar) tabsBar.classList.add('hidden');
    } else if (tabsBar) {
      tabsBar.classList.remove('hidden');
    }

    const tabsContainer = document.querySelector('.tabs');
    if (!tabsContainer) return;
    if (tabs.length === 0) {
      resetTabSizing(tabsContainer);
      return;
    }

    const containerWidth = tabsContainer.clientWidth;
    const shouldCondense = tabs.length >= MANY_TABS_THRESHOLD;
    const shouldDense = tabs.length >= DENSE_TABS_THRESHOLD;

    if (!shouldCondense) {
      resetTabSizing(tabsContainer);
      tabs.forEach((tab) => ensureLedRing(tab));
      return;
    }

    const activeWidth = computeActiveWidthForManyTabs(containerWidth, tabs.length);
    if (!activeWidth) {
      resetTabSizing(tabsContainer);
      return;
    }

    const inactiveCount = Math.max(1, tabs.length - 1);
    const remaining = Math.max(0, containerWidth - activeWidth);
    const inactiveWidth = Math.max(
      INACTIVE_MIN_WIDTH,
      Math.floor(remaining / inactiveCount)
    );

    const signature = `${tabs.length}|${containerWidth}|${activeWidth}|${inactiveWidth}|${shouldDense ? 1 : 0}`;
    if (signature !== lastSignature) {
      lastSignature = signature;
      tabsContainer.classList.add('many-tabs');
      tabsContainer.classList.toggle('dense-tabs', shouldDense);
      tabsContainer.style.setProperty('--many-active-tab-width', `${activeWidth}px`);
      tabsContainer.style.setProperty('--many-inactive-tab-width', `${inactiveWidth}px`);
    } else {
      if (!tabsContainer.classList.contains('many-tabs')) {
        tabsContainer.classList.add('many-tabs');
      }
      tabsContainer.classList.toggle('dense-tabs', shouldDense);
    }

    tabs.forEach((tab) => ensureLedRing(tab));
  }

  let visibilityRaf = 0;
  function scheduleVisibilityUpdate() {
    if (visibilityRaf) return;
    visibilityRaf = requestAnimationFrame(() => {
      visibilityRaf = 0;
      updateTabsBarVisibility();
    });
  }

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      lastSignature = '';
      updateTabsBarVisibility();
    }, 120);
  });

  window.TabsVisibility = {
    updateLastTabDot,
    updateTabsBarVisibility,
    scheduleVisibilityUpdate,
    computeActiveWidthForManyTabs,
    MANY_TABS_THRESHOLD,
    DENSE_TABS_THRESHOLD,
  };

  window.updateTabsBarVisibility = updateTabsBarVisibility;
})();
