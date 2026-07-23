/**
 * Transferência de aba entre janelas OS + feedback na barra destino.
 * Bounds reportados sob demanda (resize/move/tabs/drag) — sem setInterval.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.TransferController) return;

  let hoveringTarget = false;
  let lastTargetWindowId = null;
  let resolveTimer = null;
  let lastGhostEl = null;
  let lastHoverId = null;
  let pendingResolve = false;
  let dragging = false;

  function getTabsScreenBounds() {
    const bar = document.querySelector('.tabs-bar');
    const tabs = document.getElementById('tabs') || document.querySelector('.tabs');
    const el = bar || tabs;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const padX = 16;
    const padY = 20;
    return {
      x: Math.round(window.screenX + r.left - padX),
      y: Math.round(window.screenY + r.top - padY),
      width: Math.round(r.width + padX * 2),
      height: Math.round(Math.max(r.height, 44) + padY * 2),
    };
  }

  function reportBounds() {
    const bounds = getTabsScreenBounds();
    if (!bounds) return;
    NS.WindowBridge?.reportTabsBounds?.(bounds);
  }

  function beginDrag() {
    dragging = true;
    reportBounds();
  }

  function endDrag() {
    dragging = false;
  }

  function setHovering(next, targetWindowId, ghostEl, screenX) {
    hoveringTarget = Boolean(next);
    lastTargetWindowId = next ? targetWindowId : null;
    const el = ghostEl || lastGhostEl;
    if (el) {
      if (hoveringTarget) {
        el.classList.add('janelas-transfer-ghost');
        el.classList.remove('janelas-detach-ghost');
        const shot = el.querySelector('.janelas-detach-ghost__shot');
        if (shot) shot.remove();
      } else {
        el.classList.remove('janelas-transfer-ghost');
      }
    }

    const hoverId = hoveringTarget ? targetWindowId : null;
    if (hoverId !== lastHoverId) {
      lastHoverId = hoverId;
      if (hoverId) {
        NS.WindowBridge?.setDragHover?.({
          targetWindowId: hoverId,
          screenX: screenX || null,
        });
      } else {
        NS.WindowBridge?.clearDragHover?.();
      }
    } else if (hoverId && screenX != null) {
      NS.WindowBridge?.setDragHover?.({
        targetWindowId: hoverId,
        screenX,
      });
    }
  }

  function onDragMove(ctx) {
    if (!dragging) beginDrag();
    lastGhostEl = ctx?.ghostEl || lastGhostEl;
    reportBounds();

    if (resolveTimer) {
      pendingResolve = true;
      return;
    }

    resolveTimer = setTimeout(async () => {
      try {
        const point = await NS.WindowBridge?.getCursorScreenPoint?.();
        const target = await NS.WindowBridge?.resolveDropTarget?.();
        if (target?.zone === 'tabs' && target.windowId) {
          setHovering(
            true,
            target.windowId,
            lastGhostEl,
            point?.x ?? target.screenX
          );
        } else {
          setHovering(false, null, lastGhostEl, null);
        }
      } catch (_) {
        setHovering(false, null, lastGhostEl, null);
      } finally {
        resolveTimer = null;
        if (pendingResolve) {
          pendingResolve = false;
          onDragMove({ ghostEl: lastGhostEl });
        }
      }
    }, 16);
  }

  async function onDragEnd(ctx) {
    const wasHovering = hoveringTarget;
    const targetWindowId = lastTargetWindowId;
    setHovering(false, null, lastGhostEl, null);
    lastGhostEl = null;
    pendingResolve = false;
    if (resolveTimer) {
      clearTimeout(resolveTimer);
      resolveTimer = null;
    }
    NS.WindowBridge?.clearDragHover?.();
    endDrag();

    if (!ctx?.tabId) return false;

    let targetId = wasHovering ? targetWindowId : null;
    try {
      const fresh = await NS.WindowBridge?.resolveDropTarget?.();
      if (fresh?.zone === 'tabs' && fresh.windowId) {
        targetId = fresh.windowId;
      }
    } catch (_) {
      /* ignore */
    }

    if (!targetId) return false;
    return transferTab({ tabId: ctx.tabId, targetWindowId: targetId });
  }

  async function transferTab(ctx) {
    if (!ctx?.tabId || !ctx.targetWindowId) return false;

    const snapshot =
      window.TabsCore?.getTabSnapshot?.(ctx.tabId) ||
      (typeof window.getTabSnapshot === 'function' ? window.getTabSnapshot(ctx.tabId) : null);
    if (!snapshot) return false;
    if (!snapshot.is_home && !snapshot.isHomeTab && !snapshot.url) return false;

    const ok = await NS.WindowBridge?.moveTab?.(ctx.targetWindowId, snapshot);
    if (!ok) return false;

    const tabCount = document.querySelectorAll('#tabs .tab').length;
    if (tabCount <= 1) {
      window.close();
    } else if (typeof window.closeTab === 'function') {
      window.closeTab(ctx.tabId);
    }
    return true;
  }

  function isHoveringTarget() {
    return hoveringTarget;
  }

  function init() {
    reportBounds();
    window.addEventListener('resize', reportBounds);
    window.addEventListener('move', reportBounds);
    document.addEventListener('app:tab-created', reportBounds);
    document.addEventListener('app:tab-closed', reportBounds);
    NS.PerfIdle?.onChange?.((active) => {
      if (active) reportBounds();
    });
  }

  function dispose() {
    endDrag();
    NS.WindowBridge?.clearDragHover?.();
  }

  NS.TransferController = {
    init,
    dispose,
    onDragMove,
    onDragEnd,
    transferTab,
    isHoveringTarget,
    reportBounds,
    beginDrag,
    endDrag,
  };
})();
