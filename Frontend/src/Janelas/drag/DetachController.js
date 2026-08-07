/**
 * Detach / modo janela quando o drag sai da faixa de abas.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.DetachController) return;

  const { Types, Bus, DetachThreshold } = NS;
  let armed = false;
  let lastGhostEl = null;

  function setArmed(next, detail) {
    if (armed === next) return;
    armed = next;
    Bus?.emit(
      next ? Types?.EVENTS?.DETACH_ARMED : Types?.EVENTS?.DETACH_DISARMED,
      detail || {}
    );
  }

  function paintDetachGhost(ghostEl, tabId) {
    if (!ghostEl) return;
    ghostEl.classList.add('janelas-detach-ghost');

    let shot = ghostEl.querySelector('.janelas-detach-ghost__shot');
    if (!shot) {
      shot = document.createElement('div');
      shot.className = 'janelas-detach-ghost__shot';
      ghostEl.appendChild(shot);
    }

    const cached = NS.ThumbnailCache?.getCached?.(tabId);
    if (cached) {
      if (!shot.querySelector('img')) {
        shot.innerHTML = '';
        const img = document.createElement('img');
        img.src = cached;
        img.alt = '';
        img.draggable = false;
        shot.appendChild(img);
      }
    } else if (!shot.dataset.loading) {
      shot.dataset.loading = '1';
      shot.innerHTML = '<span class="janelas-detach-ghost__hint">Nova janela</span>';
    }
  }

  function clearDetachGhost(ghostEl) {
    const el = ghostEl || lastGhostEl;
    if (!el) return;
    el.classList.remove('janelas-detach-ghost');
    const shot = el.querySelector('.janelas-detach-ghost__shot');
    if (shot) shot.remove();
  }

  /**
   * @param {{ clientX: number, clientY: number, tabId: string, ghostEl?: HTMLElement, hoveringTransfer?: boolean }} ctx
   */
  function onDragMove(ctx) {
    if (!ctx || !DetachThreshold) return;
    lastGhostEl = ctx.ghostEl || lastGhostEl;

    const hoveringTransfer = Boolean(
      ctx.hoveringTransfer || NS.TransferController?.isHoveringTarget?.()
    );

    // Em split, sobre um painel: não armar detach (o drop vai para o swap)
    const overSplitPane =
      NS.SplitHost?.getState?.()?.mode === 'split' &&
      Boolean(NS.SplitDropController?.hitTestSide?.(ctx.clientX, ctx.clientY));

    const next =
      !overSplitPane &&
      DetachThreshold.isWindowMode(ctx.clientX, ctx.clientY, hoveringTransfer);

    if (next && ctx.ghostEl) {
      paintDetachGhost(ctx.ghostEl, ctx.tabId);
    } else if (ctx.ghostEl) {
      clearDetachGhost(ctx.ghostEl);
    }

    setArmed(Boolean(next), { tabId: ctx.tabId });
  }

  /**
   * @param {{ tabId: string }} ctx
   * @returns {Promise<boolean>}
   */
  async function onDragEnd(ctx) {
    const wasArmed = armed;
    const ghostEl = lastGhostEl;
    setArmed(false, { tabId: ctx?.tabId });
    clearDetachGhost(ghostEl);
    lastGhostEl = null;

    if (!wasArmed || !ctx?.tabId) return false;

    const snapshot =
      window.TabsCore?.getTabSnapshot?.(ctx.tabId) ||
      (typeof window.getTabSnapshot === 'function' ? window.getTabSnapshot(ctx.tabId) : null);

    if (!snapshot) return false;
    if (!snapshot.is_home && !snapshot.isHomeTab && !snapshot.url) return false;

    const bridge = NS.WindowBridge;
    if (!bridge?.createWithTab) {
      console.warn('[Janelas] WindowBridge.createWithTab indisponível');
      return false;
    }

    const ok = await bridge.createWithTab(snapshot);
    if (!ok) return false;

    const tabCount = document.querySelectorAll('#tabs .tab').length;
    if (tabCount <= 1) {
      window.close();
    } else if (typeof window.closeTab === 'function') {
      window.closeTab(ctx.tabId);
    }
    return true;
  }

  function isArmed() {
    return armed;
  }

  function reset() {
    setArmed(false, {});
    clearDetachGhost(lastGhostEl);
    lastGhostEl = null;
  }

  NS.DetachController = { onDragMove, onDragEnd, isArmed, reset };
})();
