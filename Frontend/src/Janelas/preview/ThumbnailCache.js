/**
 * Cache de miniaturas de abas via webview.capturePage.
 * Snapshots event-driven (deactivate / navigate / hover) — sem loop 2.5s no idle.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.ThumbnailCache) return;

  const cache = new Map();
  const inflight = new Map();
  const CAPTURE_CLASS = 'janelas-capturing';
  let hookedActivate = false;
  let paused = false;

  function canWork() {
    if (paused) return false;
    if (NS.PerfIdle && !NS.PerfIdle.isActive()) return false;
    return !document.hidden;
  }

  function getWebview(tabId) {
    if (!tabId || String(tabId).startsWith('home-tab')) return null;
    return document.querySelector(`webview[data-id="${tabId}"]`);
  }

  /** Sites GPU-pesados: capturePage dispara UnknownVizError no guest (Viz compositor). */
  function shouldSkipCapture(webview) {
    if (!webview) return true;
    let url = '';
    try {
      url =
        (typeof webview.getURL === 'function' && webview.getURL()) ||
        webview.src ||
        '';
    } catch (_) {
      url = webview.src || '';
    }
    return /(?:^|\.)(?:spotify\.(?:com|net)|spotifycdn\.com|scdn\.co)/i.test(
      (() => {
        try {
          return new URL(url).hostname || '';
        } catch (_) {
          return '';
        }
      })()
    );
  }

  function getCached(tabId) {
    const entry = cache.get(tabId);
    return entry?.dataUrl || null;
  }

  function setCached(tabId, dataUrl) {
    if (!tabId || !dataUrl) return;
    cache.set(tabId, { dataUrl, at: Date.now() });
  }

  function invalidate(tabId) {
    if (tabId) cache.delete(tabId);
    inflight.delete(tabId);
  }

  function clear() {
    cache.clear();
    inflight.clear();
  }

  /**
   * @param {string} tabId
   * @param {{ force?: boolean }} [opts]
   * @returns {Promise<string|null>} data URL ou null
   */
  async function capture(tabId, opts) {
    // Hover/preview pode pedir force mesmo com pause de drag — só bloqueia pause de drag
    // se não for force explícito do preview… pause() no drag deve bloquear captures pesadas.
    if (paused) return getCached(tabId);
    if (!tabId || String(tabId).startsWith('home-tab')) return null;

    if (!opts?.force) {
      const hit = getCached(tabId);
      if (hit) return hit;
    }

    if (inflight.has(tabId)) return inflight.get(tabId);

    const job = (async () => {
      const webview = getWebview(tabId);
      if (!webview || typeof webview.capturePage !== 'function') return null;
      if (shouldSkipCapture(webview)) return getCached(tabId);

      const needsTemp = !webview.classList.contains('active');
      if (needsTemp) {
        webview.classList.add(CAPTURE_CLASS);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 40));
      }

      try {
        const image = await webview.capturePage();
        if (!image) return null;
        if (typeof image.isEmpty === 'function' && image.isEmpty()) return null;
        const dataUrl =
          typeof image.toDataURL === 'function' ? image.toDataURL() : null;
        if (!dataUrl) return null;
        setCached(tabId, dataUrl);
        return dataUrl;
      } catch (_) {
        return null;
      } finally {
        if (needsTemp) webview.classList.remove(CAPTURE_CLASS);
      }
    })();

    inflight.set(tabId, job);
    try {
      return await job;
    } finally {
      inflight.delete(tabId);
    }
  }

  async function refreshActive() {
    if (!canWork()) return;
    const activeId = window.TabsState?.currentActiveTab || window.currentActiveTab;
    if (!activeId || String(activeId).startsWith('home-tab')) return;
    const webview = getWebview(activeId);
    if (!webview || !webview.classList.contains('active')) return;
    await capture(activeId, { force: true });
  }

  function attachWebviewHooks(webview, tabId) {
    if (!webview || !tabId || webview.dataset.janelasThumbBound === '1') return;
    webview.dataset.janelasThumbBound = '1';

    const bump = () => {
      if (!canWork()) return;
      const activeId = window.TabsState?.currentActiveTab || window.currentActiveTab;
      if (activeId === tabId) {
        capture(tabId, { force: true });
      }
    };

    webview.addEventListener('did-finish-load', bump);
    webview.addEventListener('did-navigate', bump);
    webview.addEventListener('did-navigate-in-page', bump);
  }

  function bindExistingWebviews() {
    document.querySelectorAll('#browser webview[data-id]').forEach((wv) => {
      attachWebviewHooks(wv, wv.dataset.id);
    });
  }

  /**
   * Captura a aba ativa antes de trocar (ainda visível).
   * Não atrasa a troca — dispara e segue.
   */
  function hookActivateTab() {
    if (hookedActivate) return;
    const orig = window.activateTab;
    if (typeof orig !== 'function') return;

    function wrapped(tabId) {
      const prev = window.TabsState?.currentActiveTab || window.currentActiveTab;
      if (prev && prev !== tabId && !String(prev).startsWith('home-tab')) {
        const existing = cache.get(prev);
        const fresh = existing && Date.now() - (existing.at || 0) < 4000;
        if (!fresh) {
          const wv = getWebview(prev);
          if (wv && wv.classList.contains('active') && typeof wv.capturePage === 'function') {
            // Spotify: capturePage → UnknownVizError no guest (GPU/Viz).
            if (!shouldSkipCapture(wv)) {
              // Fora do caminho crítico: capturePage no mesmo tick da troca compete com a barra
              window.setTimeout(() => {
                if (!wv.isConnected) return;
                wv.capturePage()
                  .then((image) => {
                    if (!image || (typeof image.isEmpty === 'function' && image.isEmpty())) return;
                    if (typeof image.toDataURL === 'function') {
                      setCached(prev, image.toDataURL());
                    }
                  })
                  .catch(() => {});
              }, 320);
            }
          }
        }
      }
      return orig.call(this, tabId);
    }

    wrapped.__janelasThumbHooked = true;
    window.activateTab = wrapped;
    if (window.TabsCore) window.TabsCore.activateTab = wrapped;
    hookedActivate = true;
  }

  function pause() {
    paused = true;
  }

  function resume() {
    paused = false;
  }

  function init() {
    hookActivateTab();
    bindExistingWebviews();
    refreshActive();

    document.addEventListener('app:tab-created', (e) => {
      const tabId = e.detail?.tabId;
      if (!tabId) return;
      const wv = getWebview(tabId);
      if (wv) attachWebviewHooks(wv, tabId);
      setTimeout(() => refreshActive(), 400);
    });

    document.addEventListener('app:tab-closed', (e) => {
      invalidate(e.detail?.tabId);
    });

    document.addEventListener('app:tabs-cleared', () => clear());

    document.addEventListener('app:tab-changed', () => {
      // Snapshot da nova aba só se ainda não houver cache (evita capturePage
      // pesado nos primeiros ms em que o usuário quer usar o conteúdo).
      const activeId = window.TabsState?.currentActiveTab || window.currentActiveTab;
      if (!activeId || String(activeId).startsWith('home-tab')) return;
      if (getCached(activeId)) return;
      setTimeout(() => refreshActive(), 450);
    });

    NS.PerfIdle?.onChange?.((active) => {
      if (active) refreshActive();
    });
  }

  NS.ThumbnailCache = {
    init,
    capture,
    getCached,
    setCached,
    invalidate,
    clear,
    refreshActive,
    pause,
    resume,
  };
})();
