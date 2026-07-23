/**
 * Zonas de drag: faixa de abas (local) vs modo janela.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.DetachThreshold) return;

  const PAD_X = 24;
  const PAD_Y = 18;

  function getLocalTabsRect() {
    const bar = document.querySelector('.tabs-bar');
    const tabs =
      document.getElementById('tabs') || document.querySelector('.tabs');
    if (bar && tabs) {
      const a = bar.getBoundingClientRect();
      const b = tabs.getBoundingClientRect();
      const left = Math.min(a.left, b.left);
      const top = Math.min(a.top, b.top);
      const right = Math.max(a.right, b.right);
      const bottom = Math.max(a.bottom, b.bottom);
      return {
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
        x: left,
        y: top,
      };
    }
    const el = bar || tabs;
    return el ? el.getBoundingClientRect() : null;
  }

  /**
   * Dentro da faixa de abas da janela atual → só reordenar (modo aba).
   */
  function isInLocalTabsZone(clientX, clientY) {
    const r = getLocalTabsRect();
    if (!r || clientX == null || clientY == null) return false;
    return (
      clientX >= r.left - PAD_X &&
      clientX <= r.right + PAD_X &&
      clientY >= r.top - PAD_Y &&
      clientY <= r.bottom + PAD_Y
    );
  }

  function isOutsideViewport(clientX, clientY) {
    if (clientX == null || clientY == null) return false;
    return (
      clientX < 0 ||
      clientY < 0 ||
      clientX > window.innerWidth ||
      clientY > window.innerHeight
    );
  }

  /**
   * @deprecated use isWindowMode
   */
  function isArmed(clientY, tabsBarRect) {
    if (!tabsBarRect) {
      const r = getLocalTabsRect();
      if (!r) return false;
      return clientY > r.bottom + PAD_Y;
    }
    return clientY > tabsBarRect.bottom + PAD_Y;
  }

  function isWindowMode(clientX, clientY, hoveringTransfer) {
    if (hoveringTransfer) return false;
    return !isInLocalTabsZone(clientX, clientY);
  }

  NS.DetachThreshold = {
    isArmed,
    isInLocalTabsZone,
    isWindowMode,
    isOutsideViewport,
    getLocalTabsRect,
  };
})();
