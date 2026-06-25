/**
 * Animações da tabline lateral: hover pill e tooltip.
 */
(function () {
  function showTooltip(tabsTooltip, tab) {
    if (!tabsTooltip) return;

    const label = tab.getAttribute('aria-label') || tab.title || '';
    const rect = tab.getBoundingClientRect();

    tabsTooltip.textContent = label;
    tabsTooltip.style.opacity = '1';
    tabsTooltip.style.left = `${Math.round(rect.right + 12)}px`;
    tabsTooltip.style.top = `${Math.round(rect.top + rect.height / 2)}px`;
  }

  function hideTooltip(tabsTooltip) {
    if (tabsTooltip) tabsTooltip.style.opacity = '0';
  }

  function updateHover(tabsHover, button) {
    if (!tabsHover) return;

    tabsHover.style.opacity = '1';
    tabsHover.style.setProperty('--hover-y', `${button.offsetTop}px`);
    tabsHover.style.height = `${button.offsetHeight}px`;
  }

  function hideHover(tabsHover) {
    if (tabsHover) tabsHover.style.opacity = '0';
  }

  function init() {
    const idgetTabs = document.querySelectorAll('.side-tabs .tab-item');
    const tabsList = document.querySelector('.side-tabs .tabs-list');
    const tabsHover = document.querySelector('.side-tabs .tabs-hover');
    const tabsTooltip = document.getElementById('tabsTooltip');

    if (!tabsList || !tabsHover || idgetTabs.length === 0) return;

    idgetTabs.forEach((tab) => {
      const onEnter = () => {
        updateHover(tabsHover, tab);
        showTooltip(tabsTooltip, tab);
      };

      tab.addEventListener('mouseenter', onEnter);
      tab.addEventListener('focus', onEnter);
    });

    tabsList.addEventListener('mouseleave', () => {
      hideHover(tabsHover);
      hideTooltip(tabsTooltip);
    });
  }

  window.TablineAnim = { init };
})();
