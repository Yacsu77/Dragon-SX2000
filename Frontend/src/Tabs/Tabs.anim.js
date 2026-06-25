/**
 * Animações de transição e efeitos visuais das abas.
 */
(function () {
  function clearTabInlineStyles(tab) {
    tab.style.transform = '';
    tab.style.opacity = '';
    tab.style.backdropFilter = '';
    tab.style.webkitBackdropFilter = '';
    tab.style.transition = '';
  }

  function setAdjacentToActive(targetTab) {
    const prevTab = targetTab.previousElementSibling;
    const nextTab = targetTab.nextElementSibling;
    if (prevTab && prevTab.classList.contains('tab')) {
      prevTab.classList.add('adjacent-to-active');
    }
    if (nextTab && nextTab.classList.contains('tab')) {
      nextTab.classList.add('adjacent-to-active');
    }
  }

  function applyFrameEffects(tabs, currentIndex, clampedIndex, easedProgress, steps) {
    tabs.forEach((tab, tabIndex) => {
      const distanceFromActive = Math.abs(tabIndex - clampedIndex);
      const maxDistance = Math.max(steps, 1);
      const influence = Math.max(0, 1 - (distanceFromActive / (maxDistance + 1)) * 0.6);
      const translateX = (tabIndex - currentIndex) * easedProgress * 3;
      const scale = 0.95 + influence * 0.05;

      tab.style.transform = `translateX(${translateX}px) scale(${scale})`;
      tab.style.transition = 'none';
      tab.style.opacity = 0.6 + influence * 0.4;

      const blurAmount = Math.min(distanceFromActive * 3, 12);
      const saturation = 180 + influence * 40;
      const brightness = 105 + influence * 10;
      const blur = Math.max(15, 15 + blurAmount);
      tab.style.backdropFilter = `blur(${blur}px) saturate(${saturation}%) brightness(${brightness}%)`;
      tab.style.webkitBackdropFilter = `blur(${blur}px) saturate(${saturation}%) brightness(${brightness}%)`;
    });
  }

  /**
   * Anima transição entre abas — implementação única para browser e home.
   * @param {{ currentIndex: number, targetIndex: number, tabs: HTMLElement[], onComplete: Function }} options
   */
  function animateTabTransition({ currentIndex, targetIndex, tabs, onComplete }) {
    const direction = targetIndex > currentIndex ? 1 : -1;
    const steps = Math.abs(targetIndex - currentIndex);
    const totalDuration = Math.min(400, 200 + steps * 50);
    const startTime = Date.now();

    const tabsBar = document.querySelector('.tabs-bar');
    if (tabsBar) tabsBar.classList.add('transitioning-container');

    tabs.forEach((tab) => tab.classList.remove('active', 'adjacent-to-active'));

    let lastClampedIndex = currentIndex;

    function animateStep() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      if (progress < 1) {
        const exactIndex = currentIndex + direction * steps * easedProgress;
        const clampedIndex = Math.max(0, Math.min(Math.round(exactIndex), tabs.length - 1));

        if (clampedIndex !== lastClampedIndex) {
          tabs.forEach((tab) => tab.classList.remove('active'));
          if (clampedIndex >= 0 && clampedIndex < tabs.length) {
            tabs[clampedIndex].classList.add('active');
          }
          lastClampedIndex = clampedIndex;
        }

        applyFrameEffects(tabs, currentIndex, clampedIndex, easedProgress, steps);
        requestAnimationFrame(animateStep);
      } else {
        tabs.forEach((tab) => {
          clearTabInlineStyles(tab);
          tab.classList.remove('active', 'adjacent-to-active');
        });

        if (tabsBar) tabsBar.classList.remove('transitioning-container');
        if (typeof onComplete === 'function') onComplete();
      }
    }

    animateStep();
  }

  function applyDragEffects(tabsContainer, draggedTab, tabCenterX) {
    const allTabs = Array.from(tabsContainer.children).filter(
      (child) => child.classList.contains('tab') && child !== draggedTab
    );

    allTabs.forEach((tab) => {
      const rect = tab.getBoundingClientRect();
      const tabMidX = rect.left + rect.width / 2;
      const distance = Math.abs(tabCenterX - tabMidX);
      const maxDistance = tabsContainer.offsetWidth;
      const influence = Math.max(0, 1 - (distance / maxDistance) * 2);

      const scale = 0.96 + influence * 0.02;
      const translateX = (tabCenterX - tabMidX) * influence * 0.15;
      const blur = influence * 6;
      const saturation = 180 + influence * 30;
      const brightness = 105 + influence * 8;

      tab.style.transform = `translateX(${translateX}px) scale(${scale})`;
      tab.style.backdropFilter = `blur(${blur}px) saturate(${saturation}%) brightness(${brightness}%)`;
      tab.style.webkitBackdropFilter = `blur(${blur}px) saturate(${saturation}%) brightness(${brightness}%)`;
      tab.style.opacity = 0.75 + influence * 0.25;
      tab.classList.add('drag-affected');
    });
  }

  function clearDragEffects(tabsContainer) {
    tabsContainer.classList.remove('dragging-tabs');
    tabsContainer.querySelectorAll('.tab').forEach((tab) => {
      clearTabInlineStyles(tab);
      tab.classList.remove('drag-affected');
    });
  }

  window.TabsAnim = {
    animateTabTransition,
    clearTabInlineStyles,
    setAdjacentToActive,
    applyDragEffects,
    clearDragEffects,
  };
})();
