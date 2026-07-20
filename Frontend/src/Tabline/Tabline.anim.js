/**
 * Tooltip da sidebar dock.
 */
(function () {
  let hideTimer = null;

  function tooltipEl() {
    return document.getElementById('sideTooltip');
  }

  function showTooltip(anchor, text) {
    const tip = tooltipEl();
    if (!tip || !anchor || !text) return;

    const rect = anchor.getBoundingClientRect();
    tip.textContent = text;
    tip.classList.add('is-visible');
    tip.style.left = `${Math.round(rect.right + 12)}px`;
    tip.style.top = `${Math.round(rect.top + rect.height / 2)}px`;
  }

  function hideTooltip() {
    const tip = tooltipEl();
    if (tip) tip.classList.remove('is-visible');
  }

  function flashTooltip(anchor, text, ms = 1600) {
    clearTimeout(hideTimer);
    showTooltip(anchor, text);
    hideTimer = setTimeout(hideTooltip, ms);
  }

  function bindItem(el) {
    el.addEventListener('mouseenter', () => {
      const label = el.getAttribute('aria-label') || el.title || '';
      if (label) showTooltip(el, label);
    });
    el.addEventListener('focus', () => {
      const label = el.getAttribute('aria-label') || el.title || '';
      if (label) showTooltip(el, label);
    });
    el.addEventListener('mouseleave', hideTooltip);
    el.addEventListener('blur', hideTooltip);
  }

  function init() {
    const dock = document.getElementById('sideDock');
    if (!dock) return;

    dock.querySelectorAll('.side-item, .widgets-orb, .side-sync, .side-profile').forEach(bindItem);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches?.('.side-item')) bindItem(node);
          node.querySelectorAll?.('.side-item').forEach(bindItem);
        });
      });
    });

    observer.observe(dock, { childList: true, subtree: true });
  }

  window.TablineAnim = { init, showTooltip, hideTooltip, flashTooltip };
})();
