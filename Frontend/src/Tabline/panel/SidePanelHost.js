/**
 * Side Panel Host — overlay minimalista (sem chrome), 1 por vez.
 * keepAlive opcional via PerfSettings. Animação leve em transform/opacity.
 */
(function () {
  const DEFAULT_RATIO = 0.42;
  const MIN_WIDTH = 280;
  const MAX_RATIO = 0.72;
  const INSET = 8;
  const ANIM_MS = 160;

  let rootEl = null;
  let backdropEl = null;
  let panelEl = null;
  let bodyEl = null;
  let isOpen = false;
  let panelWidth = 0;
  let activeId = null;
  let closeTimer = null;

  /** @type {Map<string, HTMLElement>} */
  const pool = new Map();

  function dockWidth() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-dock-width');
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 52;
  }

  function dockTop() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-dock-top');
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 84;
  }

  function clampWidth(width) {
    const max = Math.floor(window.innerWidth * MAX_RATIO);
    return Math.max(MIN_WIDTH, Math.min(max, Math.round(width)));
  }

  function keepAlive() {
    return !!(window.PerfSettings && typeof window.PerfSettings.isKeepSidebarPanels === 'function'
      && window.PerfSettings.isKeepSidebarPanels());
  }

  function partition() {
    return (
      (window.UserSession && typeof window.UserSession.getPartition === 'function'
        ? window.UserSession.getPartition()
        : null) || 'persist:dragon-pending'
    );
  }

  function placePanel() {
    const top = dockTop() + INSET;
    const left = dockWidth() + INSET;
    panelEl.style.left = `${left}px`;
    panelEl.style.top = `${top}px`;
    panelEl.style.width = `${panelWidth}px`;
    panelEl.style.height = `calc(100vh - ${top + INSET}px)`;
    panelEl.style.right = 'auto';
    panelEl.style.bottom = 'auto';
  }

  function ensureDom() {
    if (rootEl) return;

    rootEl = document.getElementById('sidePanelRoot');
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.id = 'sidePanelRoot';
      document.body.appendChild(rootEl);
    }

    rootEl.innerHTML = `
      <div class="side-panel-backdrop" data-role="backdrop" hidden></div>
      <div class="side-panel" data-role="panel" hidden>
        <div class="side-panel__divider" data-role="divider" title="Redimensionar"></div>
        <div class="side-panel__body" data-role="body"></div>
      </div>
    `;

    backdropEl = rootEl.querySelector('[data-role="backdrop"]');
    panelEl = rootEl.querySelector('[data-role="panel"]');
    bodyEl = rootEl.querySelector('[data-role="body"]');
    const divider = rootEl.querySelector('[data-role="divider"]');

    backdropEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      close();
    });

    divider.addEventListener('pointerdown', onResizeStart);

    document.addEventListener('keydown', (event) => {
      if (isOpen && event.key === 'Escape') close();
    });

    document.addEventListener('user:changed', () => {
      destroyPool();
      if (isOpen) close({ immediate: true });
    });

    if (window.PerfSettings?.onChange) {
      window.PerfSettings.onChange((snap) => {
        if (!snap?.keepSidebarPanels) pruneInactive();
      });
    }
  }

  function createWebview(url) {
    const view = document.createElement('webview');
    view.className = 'side-panel__webview';
    view.setAttribute('allowpopups', '');
    view.setAttribute('partition', partition());
    view.dataset.requestedUrl = url;
    view.src = url;
    return view;
  }

  function hideAllViews() {
    pool.forEach((view) => {
      view.classList.remove('is-active');
      // visibility em vez de display:none — evita unload em alguns webviews
      view.style.visibility = 'hidden';
      view.style.pointerEvents = 'none';
      view.setAttribute('aria-hidden', 'true');
    });
  }

  function destroyPool() {
    pool.forEach((view) => {
      try { view.remove(); } catch (_) { /* ignore */ }
    });
    pool.clear();
  }

  function pruneInactive() {
    if (keepAlive()) return;
    pool.forEach((view, id) => {
      if (id === activeId && isOpen) return;
      try { view.remove(); } catch (_) { /* ignore */ }
      pool.delete(id);
    });
  }

  function showView(itemId, url) {
    hideAllViews();
    let view = pool.get(itemId);

    if (!view) {
      view = createWebview(url);
      bodyEl.appendChild(view);
      pool.set(itemId, view);
    } else if (view.dataset.requestedUrl !== url) {
      // Só navega se o atalho mudou de URL (Customise) — não recarrega sessão ativa
      view.dataset.requestedUrl = url;
      view.src = url;
    }

    view.style.visibility = 'visible';
    view.style.pointerEvents = 'auto';
    view.style.display = 'flex';
    view.removeAttribute('aria-hidden');
    view.classList.add('is-active');
    activeId = itemId;
    return view;
  }

  function onResizeStart(event) {
    if (!isOpen) return;
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startW = panelWidth;
    const target = event.currentTarget;

    function onMove(e) {
      panelWidth = clampWidth(startW + (e.clientX - startX));
      panelEl.style.width = `${panelWidth}px`;
    }

    function onUp(e) {
      try { target.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
    }

    target.setPointerCapture(event.pointerId);
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  }

  function open({ url, title, itemId }) {
    if (!url) return;
    ensureDom();
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    if (!panelWidth) {
      panelWidth = clampWidth(window.innerWidth * DEFAULT_RATIO);
    }

    const id = itemId || url;
    placePanel();
    showView(id, url);

    panelEl.hidden = false;
    backdropEl.hidden = false;
    rootEl.classList.add('is-open');
    panelEl.dataset.itemId = id;
    panelEl.dataset.title = title || '';

    // Force reflow then animate in (GPU-friendly)
    panelEl.classList.remove('is-open');
    backdropEl.classList.remove('is-open');
    void panelEl.offsetWidth;
    requestAnimationFrame(() => {
      panelEl.classList.add('is-open');
      backdropEl.classList.add('is-open');
    });

    isOpen = true;
    document.body.classList.add('has-side-panel-overlay');

    if (!keepAlive()) pruneInactive();

    document.dispatchEvent(
      new CustomEvent('side-panel:opened', { detail: { url, title, itemId: id } })
    );
  }

  function close(opts = {}) {
    if (!panelEl || !isOpen) return;
    isOpen = false;

    panelEl.classList.remove('is-open');
    backdropEl.classList.remove('is-open');
    document.body.classList.remove('has-side-panel-overlay');

    const finish = () => {
      panelEl.hidden = true;
      backdropEl.hidden = true;
      rootEl.classList.remove('is-open');
      if (!keepAlive()) {
        hideAllViews();
        pruneInactive();
        activeId = null;
      } else {
        hideAllViews();
      }
      document.dispatchEvent(new CustomEvent('side-panel:closed'));
    };

    if (opts.immediate) {
      finish();
      return;
    }

    closeTimer = setTimeout(finish, ANIM_MS);
  }

  function toggle(opts) {
    if (isOpen && panelEl?.dataset.itemId && opts?.itemId && panelEl.dataset.itemId === opts.itemId) {
      close();
      return;
    }
    open(opts);
  }

  window.SidePanelHost = {
    open,
    close,
    toggle,
    isOpen: () => isOpen,
  };
})();
