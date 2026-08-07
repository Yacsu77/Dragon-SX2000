/**
 * Drop de abas nos painéis do split (swap) + drag a partir do chrome invertido.
 * Inclui float da aba deslocada no hover e jelly-return na barra.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.SplitDropController) return;

  const DRAG_THRESHOLD = 5;

  /** @type {null | object} */
  let paneSession = null;
  let paneListenersBound = false;
  let highlightSide = null;
  /** @type {HTMLElement|null} */
  let displaceFloat = null;
  let displaceSide = null;

  function getState() {
    return NS.SplitHost?.getState?.() || { mode: 'single' };
  }

  function clearHighlight() {
    document.querySelectorAll('.janelas-pane-slot.is-drop-target').forEach((el) => {
      el.classList.remove('is-drop-target');
    });
    highlightSide = null;
  }

  function clearDisplaceFloat() {
    if (displaceFloat) {
      displaceFloat.remove();
      displaceFloat = null;
    }
    displaceSide = null;
    document.querySelectorAll('.janelas-pane-tab.is-displaced').forEach((el) => {
      el.classList.remove('is-displaced');
    });
  }

  function ensureDisplaceFloat(side) {
    const btn = document.querySelector(`.janelas-pane-tab[data-side="${side}"]`);
    if (!btn || btn.hidden) {
      clearDisplaceFloat();
      return null;
    }

    if (displaceSide !== side) {
      clearDisplaceFloat();
      displaceSide = side;
      const rect = btn.getBoundingClientRect();
      displaceFloat = document.createElement('div');
      displaceFloat.className = 'janelas-pane-displace-float';
      displaceFloat.innerHTML = btn.innerHTML;
      displaceFloat.style.width = `${Math.max(rect.width, 88)}px`;
      displaceFloat.style.height = `${rect.height}px`;
      displaceFloat.style.left = `${rect.left}px`;
      displaceFloat.style.top = `${rect.top}px`;
      document.body.appendChild(displaceFloat);
      btn.classList.add('is-displaced');
    } else if (btn && !btn.classList.contains('is-displaced')) {
      btn.classList.add('is-displaced');
    }
    return displaceFloat;
  }

  function positionDisplaceFloat(clientX, clientY) {
    if (!displaceFloat) return;
    const w = displaceFloat.offsetWidth || 120;
    const h = displaceFloat.offsetHeight || 30;
    // Flutua acima do cursor, levemente à frente — “sai” do painel até o drop
    const x = clientX - w / 2;
    const y = Math.min(clientY - h - 14, clientY - 40);
    displaceFloat.style.left = `${Math.round(x)}px`;
    displaceFloat.style.top = `${Math.round(Math.max(8, y))}px`;
  }

  function setHighlight(side, clientX, clientY) {
    if (highlightSide !== side) {
      clearHighlight();
      if (side) {
        const slot = document.querySelector(`.janelas-pane-slot[data-side="${side}"]`);
        if (slot) slot.classList.add('is-drop-target');
      }
      highlightSide = side || null;
    }

    if (side && clientX != null && clientY != null) {
      ensureDisplaceFloat(side);
      positionDisplaceFloat(clientX, clientY);
    } else {
      clearDisplaceFloat();
    }
  }

  /**
   * Hit-test por webview com order CSS (fonte de verdade visual) + slots.
   * @returns {'left'|'right'|null}
   */
  function hitTestSide(clientX, clientY) {
    const state = getState();
    if (state.mode !== 'split' || clientX == null || clientY == null) return null;

    const leftWv = document.querySelector('#browser webview.janelas-pane-left');
    const rightWv = document.querySelector('#browser webview.janelas-pane-right');

    const hitWv = (wv, side) => {
      if (!wv) return false;
      const r = wv.getBoundingClientRect();
      return (
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom
      );
    };

    if (hitWv(leftWv, 'left')) return 'left';
    if (hitWv(rightWv, 'right')) return 'right';

    const slots = document.querySelectorAll('.janelas-pane-slot');
    for (const slot of slots) {
      const rect = slot.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return slot.dataset.side === 'right' ? 'right' : 'left';
      }
    }

    const browser = document.getElementById('browser');
    if (!browser) return null;
    const rect = browser.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }

    // Fallback: metade geométrica do #browser (já com margin da sidebar)
    if (leftWv && rightWv) {
      const lr = leftWv.getBoundingClientRect();
      const rr = rightWv.getBoundingClientRect();
      const mid = (lr.right + rr.left) / 2;
      return clientX < mid ? 'left' : 'right';
    }

    const mid = rect.left + rect.width / 2;
    return clientX < mid ? 'left' : 'right';
  }

  function isOverTabsBar(clientX, clientY) {
    const bar =
      document.querySelector('.tabs-bar') || document.getElementById('tabs');
    if (!bar) return false;
    const rect = bar.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  function onDragMove({ clientX, clientY }) {
    const state = getState();
    if (state.mode !== 'split') {
      clearHighlight();
      clearDisplaceFloat();
      return null;
    }
    const side = hitTestSide(clientX, clientY);
    setHighlight(side, clientX, clientY);
    return side;
  }

  /**
   * Drop de aba da barra (ou de outro painel) sobre um slot.
   * @returns {boolean} handled
   */
  function onDragEnd({ tabId, clientX, clientY, fromPaneSide }) {
    const side = hitTestSide(clientX, clientY);
    const overBar = isOverTabsBar(clientX, clientY);
    clearHighlight();
    clearDisplaceFloat();

    const state = getState();
    if (state.mode !== 'split' || !tabId) return false;

    if (fromPaneSide && overBar) {
      return Boolean(NS.SplitHost?.releasePaneTabToBar?.(fromPaneSide));
    }

    if (!side) return false;

    if (fromPaneSide === side) {
      NS.SplitHost?.focusPane?.(side);
      return true;
    }

    return Boolean(NS.SplitHost?.swapPaneWithTab?.(side, tabId));
  }

  function playJellyReturn(tabId) {
    if (!tabId) return;
    requestAnimationFrame(() => {
      const tab = document.querySelector(`#tabs .tab[data-id="${tabId}"]`);
      if (!tab || tab.classList.contains('janelas-tab-in-pane')) return;
      tab.classList.remove('janelas-tab-jelly-return');
      void tab.offsetWidth;
      tab.classList.add('janelas-tab-jelly-return');
      const done = () => tab.classList.remove('janelas-tab-jelly-return');
      tab.addEventListener('animationend', done, { once: true });
      setTimeout(done, 700);
    });
  }

  function ensurePaneListeners() {
    if (paneListenersBound) return;
    paneListenersBound = true;
    document.addEventListener('pointermove', onPanePointerMove, { passive: true });
    document.addEventListener('pointerup', onPanePointerUp);
    document.addEventListener('pointercancel', onPanePointerUp);
  }

  function positionGhost(s, clientX, clientY) {
    if (!s.ghost) return;
    s.ghost.style.left = `${clientX - s.offsetX}px`;
    s.ghost.style.top = `${clientY - s.offsetY}px`;
  }

  function beginPaneDrag(e, side) {
    const state = getState();
    if (state.mode !== 'split') return;
    const tabId = side === 'right' ? state.rightTabId : state.leftTabId;
    if (!tabId) return;

    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();

    paneSession = {
      side,
      tabId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      offsetX: rect.width / 2,
      offsetY: rect.height / 2,
      width: rect.width,
      height: rect.height,
      hasStarted: false,
      ghost: null,
      pointerId: e.pointerId,
    };

    ensurePaneListeners();
    e.preventDefault();
    e.stopPropagation();
  }

  function onPanePointerMove(e) {
    const s = paneSession;
    if (!s) return;
    s.lastX = e.clientX;
    s.lastY = e.clientY;

    if (!s.hasStarted) {
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
      s.hasStarted = true;

      const ghost = document.createElement('div');
      ghost.className = 'janelas-pane-tab-ghost';
      const src = document.querySelector(
        `.janelas-pane-tab[data-side="${s.side}"]`
      );
      if (src) {
        ghost.innerHTML = src.innerHTML;
        src.classList.add('is-displaced');
      }
      ghost.style.width = `${s.width}px`;
      ghost.style.height = `${s.height}px`;
      document.body.appendChild(ghost);
      s.ghost = ghost;
      positionGhost(s, e.clientX, e.clientY);
      document.body.classList.add('janelas-pane-dragging');
    }

    positionGhost(s, e.clientX, e.clientY);
    onDragMove({ clientX: e.clientX, clientY: e.clientY });
  }

  function onPanePointerUp() {
    const s = paneSession;
    if (!s) return;
    paneSession = null;

    if (s.ghost) {
      s.ghost.remove();
      s.ghost = null;
    }
    document.body.classList.remove('janelas-pane-dragging');
    document.querySelectorAll('.janelas-pane-tab.is-displaced').forEach((el) => {
      el.classList.remove('is-displaced');
    });

    if (!s.hasStarted) {
      clearHighlight();
      clearDisplaceFloat();
      return;
    }

    onDragEnd({
      tabId: s.tabId,
      clientX: s.lastX,
      clientY: s.lastY,
      fromPaneSide: s.side,
    });
  }

  function endDrag() {
    clearHighlight();
    clearDisplaceFloat();
  }

  NS.SplitDropController = {
    hitTestSide,
    onDragMove,
    onDragEnd,
    beginPaneDrag,
    endDrag,
    clearHighlight,
    clearDisplaceFloat,
    isOverTabsBar,
    playJellyReturn,
  };
})();
