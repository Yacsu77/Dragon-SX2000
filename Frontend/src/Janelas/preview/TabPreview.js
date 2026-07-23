/**
 * Mini visualizador de aba — hover ≥ PREVIEW_HOVER_MS.
 * Regras: não mostra aba ativa; RMB / leave / drag cancelam.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.TabPreview) return;

  const { Types, Bus } = NS;
  let hoverTimer = null;
  let visibleForTabId = null;
  let pendingTabId = null;
  let overlayEl = null;
  let showToken = 0;
  let initialized = false;

  function ensureOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement('div');
    overlayEl.className = 'janelas-tab-preview';
    overlayEl.setAttribute('aria-hidden', 'true');
    overlayEl.hidden = true;
    document.body.appendChild(overlayEl);
    return overlayEl;
  }

  function tabSelector(tabId) {
    const safe =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(tabId)
        : String(tabId).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `#tabs .tab[data-id="${safe}"]`;
  }

  function isActiveTab(tabId) {
    if (!tabId) return true;
    const activeId = window.TabsState?.currentActiveTab || window.currentActiveTab;
    if (tabId === activeId) return true;
    const tab = document.querySelector(tabSelector(tabId));
    return Boolean(tab?.classList.contains('active'));
  }

  function isDraggingTabs() {
    return Boolean(
      document.querySelector('#tabs.dragging-tabs, #tabs .tab.dragging')
    );
  }

  function clearHoverTimer() {
    if (!hoverTimer) return;
    clearTimeout(hoverTimer);
    hoverTimer = null;
    pendingTabId = null;
  }

  function hide() {
    clearHoverTimer();
    showToken += 1;
    if (!visibleForTabId && (!overlayEl || overlayEl.hidden)) return;
    visibleForTabId = null;
    const el = ensureOverlay();
    el.hidden = true;
    el.classList.remove('janelas-tab-preview--ready');
    el.innerHTML = '';
    Bus?.emit(Types?.EVENTS?.PREVIEW_HIDE);
  }

  function readTabMeta(tabId) {
    const tab = document.querySelector(tabSelector(tabId));
    const title =
      tab?.querySelector('.tab-title')?.textContent?.trim() ||
      (String(tabId).startsWith('home-tab') ? 'Início' : 'Aba');
    const faviconImg = tab?.querySelector('.tab-icon img');
    const faviconText = tab?.querySelector('.tab-icon')?.textContent?.trim() || '';
    return {
      title,
      faviconSrc: faviconImg?.src || null,
      faviconText,
      isHome: String(tabId).startsWith('home-tab'),
    };
  }

  function positionUnderTab(tabId) {
    const el = ensureOverlay();
    const tab = document.querySelector(tabSelector(tabId));
    const previewW = el.offsetWidth || 240;
    const previewH = el.offsetHeight || 160;
    const margin = 8;

    if (!tab) {
      el.style.left = `${margin}px`;
      el.style.top = `${margin}px`;
      return;
    }

    const rect = tab.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - previewW / 2;
    let top = rect.bottom + margin;

    left = Math.max(margin, Math.min(left, window.innerWidth - previewW - margin));
    if (top + previewH > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - previewH - margin);
    }

    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }

  function renderShell(tabId, meta) {
    const el = ensureOverlay();
    el.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'janelas-tab-preview__header';

    const icon = document.createElement('span');
    icon.className = 'janelas-tab-preview__icon';
    if (meta.faviconSrc) {
      const img = document.createElement('img');
      img.src = meta.faviconSrc;
      img.alt = '';
      img.draggable = false;
      img.onerror = () => {
        img.remove();
        icon.textContent = meta.isHome ? '⌂' : meta.faviconText || '•';
      };
      icon.appendChild(img);
    } else {
      icon.textContent = meta.isHome ? '⌂' : meta.faviconText || '•';
    }

    const title = document.createElement('span');
    title.className = 'janelas-tab-preview__title';
    title.textContent = meta.title;

    header.append(icon, title);

    const body = document.createElement('div');
    body.className = 'janelas-tab-preview__body';

    if (meta.isHome) {
      body.classList.add('janelas-tab-preview__body--home');
      const homeLabel = document.createElement('div');
      homeLabel.className = 'janelas-tab-preview__home-label';
      homeLabel.textContent = 'Página inicial';
      body.appendChild(homeLabel);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'janelas-tab-preview__placeholder';
      placeholder.textContent = 'Carregando…';
      body.appendChild(placeholder);
    }

    el.append(header, body);
    return body;
  }

  function paintImage(body, dataUrl) {
    if (!body || !dataUrl) return false;
    body.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'janelas-tab-preview__shot';
    img.src = dataUrl;
    img.alt = '';
    img.draggable = false;
    body.appendChild(img);
    return true;
  }

  /**
   * @param {string} tabId
   * @param {{ x?: number, y?: number }} [anchor] — reservado; posição usa a aba
   */
  async function show(tabId) {
    if (!tabId || isActiveTab(tabId) || isDraggingTabs()) return;

    const token = ++showToken;
    const meta = readTabMeta(tabId);
    const el = ensureOverlay();
    const body = renderShell(tabId, meta);

    el.hidden = false;
    el.classList.remove('janelas-tab-preview--ready');
    visibleForTabId = tabId;
    positionUnderTab(tabId);
    Bus?.emit(Types?.EVENTS?.PREVIEW_SHOW, { tabId });

    if (meta.isHome) {
      el.classList.add('janelas-tab-preview--ready');
      positionUnderTab(tabId);
      return;
    }

    const cache = NS.ThumbnailCache;
    let dataUrl = cache?.getCached?.(tabId) || null;

    if (!dataUrl && cache?.capture) {
      dataUrl = await cache.capture(tabId, { force: false });
    }

    if (token !== showToken || visibleForTabId !== tabId) return;

    if (dataUrl && paintImage(body, dataUrl)) {
      el.classList.add('janelas-tab-preview--ready');
    } else {
      const placeholder = body.querySelector('.janelas-tab-preview__placeholder');
      if (placeholder) placeholder.textContent = 'Sem pré-visualização';
    }
    positionUnderTab(tabId);
  }

  function scheduleShow(tabId) {
    clearHoverTimer();
    if (!tabId || isActiveTab(tabId) || isDraggingTabs()) return;

    pendingTabId = tabId;
    const delay = Types?.PREVIEW_HOVER_MS ?? 500;
    hoverTimer = setTimeout(() => {
      hoverTimer = null;
      const id = pendingTabId;
      pendingTabId = null;
      if (id) show(id);
    }, delay);
  }

  function bindTab(tabEl) {
    if (!tabEl || tabEl.dataset.janelasPreviewBound === '1') return;
    tabEl.dataset.janelasPreviewBound = '1';

    tabEl.addEventListener('mouseenter', () => {
      const id = tabEl.dataset.id;
      if (!id || isActiveTab(id)) {
        hide();
        return;
      }
      scheduleShow(id);
    });

    tabEl.addEventListener('mouseleave', () => hide());

    tabEl.addEventListener('mousedown', () => {
      // Clique, drag ou RMB: cancela o timer / fecha o preview.
      hide();
    });

    tabEl.addEventListener('contextmenu', () => hide());
  }

  function bindAll() {
    document.querySelectorAll('#tabs .tab').forEach(bindTab);
  }

  function onGlobalPointerMove() {
    if (isDraggingTabs()) hide();
  }

  function init() {
    if (initialized) return;
    initialized = true;

    NS.ThumbnailCache?.init?.();
    bindAll();

    const tabsRoot = document.getElementById('tabs');
    if (tabsRoot) {
      new MutationObserver(() => bindAll()).observe(tabsRoot, { childList: true });
    }

    document.addEventListener('app:tab-created', () => bindAll());
    document.addEventListener('app:tabs-cleared', () => hide());
    document.addEventListener('app:tab-changed', () => {
      if (visibleForTabId && isActiveTab(visibleForTabId)) hide();
    });
    document.addEventListener('app:tab-closed', (e) => {
      if (e.detail?.tabId && e.detail.tabId === visibleForTabId) hide();
    });

    document.addEventListener('mousemove', onGlobalPointerMove, true);
    window.addEventListener('blur', () => hide());
    window.addEventListener('resize', () => {
      if (visibleForTabId) positionUnderTab(visibleForTabId);
    });
  }

  NS.TabPreview = { init, show, hide, bindTab, bindAll };
})();
