/**
 * Visibilidade da barra de abas e ponto "+" (nova aba).
 * Com 7+ abas, a ativa mantém a largura equivalente a 1/5 do container
 * e as demais dividem o espaço restante para preencher a barra.
 */
(function () {
  const MANY_TABS_THRESHOLD = 7;
  const REFERENCE_TAB_COUNT = 5;
  const INACTIVE_MIN_WIDTH = 36;

  function resetTabSizing(tabsContainer) {
    if (!tabsContainer) return;
    tabsContainer.classList.remove('many-tabs');
    tabsContainer.style.removeProperty('--many-active-tab-width');
    tabsContainer.style.removeProperty('--many-inactive-tab-width');
    tabsContainer.querySelectorAll('.tab').forEach((tab) => {
      tab.style.minWidth = '';
      tab.style.maxWidth = '';
      tab.style.width = '';
      tab.style.flexGrow = '';
      tab.style.flexShrink = '';
      tab.style.flexBasis = '';
    });
  }

  /**
   * Largura que cada aba teria com 5 abas ocupando o container.
   * Usada como alvo da aba selecionada quando há 7+.
   */
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
    document.querySelectorAll('.new-tab-dot').forEach((dot) => dot.remove());

    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab) => {
      ensureLedRing(tab);
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
    const hasGroupsButton = Boolean(document.getElementById('tabGroupsBtn'));

    if (!hasGroupsButton && tabs.length === 1 && tabs[0].dataset.id && tabs[0].dataset.id.startsWith('home-tab')) {
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

    tabsContainer.offsetHeight;

    const containerWidth = tabsContainer.clientWidth;
    const shouldCondense = tabs.length >= MANY_TABS_THRESHOLD;

    if (!shouldCondense) {
      resetTabSizing(tabsContainer);
      return;
    }

    const activeWidth = computeActiveWidthForManyTabs(containerWidth, tabs.length);
    if (!activeWidth) {
      resetTabSizing(tabsContainer);
      return;
    }

    const inactiveCount = Math.max(1, tabs.length - 1);
    const remaining = Math.max(0, containerWidth - activeWidth);
    // Divide o espaço restante igualmente — sem teto artificial, para preencher a barra.
    const inactiveWidth = Math.max(INACTIVE_MIN_WIDTH, Math.floor(remaining / inactiveCount));
    const leftover = Math.max(0, remaining - inactiveWidth * inactiveCount);

    tabsContainer.classList.add('many-tabs');
    tabsContainer.style.setProperty('--many-active-tab-width', `${activeWidth}px`);
    tabsContainer.style.setProperty('--many-inactive-tab-width', `${inactiveWidth}px`);

    let inactiveIndex = 0;
    tabsContainer.querySelectorAll('.tab').forEach((tab) => {
      ensureLedRing(tab);
      if (tab.classList.contains('active')) {
        tab.style.minWidth = `${activeWidth}px`;
        tab.style.maxWidth = `${activeWidth}px`;
        tab.style.width = `${activeWidth}px`;
        tab.style.flexBasis = `${activeWidth}px`;
        tab.style.flexGrow = '0';
        tab.style.flexShrink = '0';
      } else {
        // Distribui 1px extra nos primeiros itens para fechar o espaço restante.
        const width = inactiveWidth + (inactiveIndex < leftover ? 1 : 0);
        inactiveIndex += 1;
        tab.style.minWidth = `${width}px`;
        tab.style.maxWidth = `${width}px`;
        tab.style.width = `${width}px`;
        tab.style.flexBasis = `${width}px`;
        tab.style.flexGrow = '0';
        tab.style.flexShrink = '0';
      }
    });
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
    computeActiveWidthForManyTabs,
  };

  window.updateTabsBarVisibility = updateTabsBarVisibility;
})();
