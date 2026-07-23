/**
 * TabWarmth — hidratação linear + discard suave de webviews frias (P4).
 *
 * - deferLoad: cria aba com about:blank e carrega URL depois
 * - hydrate: carrega pendingSrc / discardedUrl ao ativar
 * - discard: about:blank em abas frias quando há muitas abas (libera RAM/CPU)
 */
(function () {
  if (window.TabWarmth) return;

  const MAX_WARM = 8;
  const WARM_GAP_MS = 70;
  const lastActiveAt = new Map();
  let warmerRunning = false;

  function getWebview(tabId) {
    if (!tabId) return null;
    return document.querySelector(`#browser webview[data-id="${tabId}"]`);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function markActive(tabId) {
    if (!tabId || String(tabId).startsWith('home-tab')) return;
    lastActiveAt.set(tabId, Date.now());
  }

  function isProtected(webview) {
    if (!webview) return true;
    if (webview.classList.contains('active')) return true;
    if (webview.classList.contains('janelas-pane-visible')) return true;
    try {
      if (typeof webview.isCurrentlyAudible === 'function' && webview.isCurrentlyAudible()) {
        return true;
      }
    } catch (_) {
      /* ignore */
    }
    return false;
  }

  function hydrateWebview(webview) {
    if (!webview) return false;
    const pending = webview.dataset.pendingSrc;
    if (pending) {
      webview.src = pending;
      delete webview.dataset.pendingSrc;
      webview.dataset.discarded = '0';
      return true;
    }
    if (webview.dataset.discarded === '1' && webview.dataset.discardedUrl) {
      webview.src = webview.dataset.discardedUrl;
      delete webview.dataset.discardedUrl;
      webview.dataset.discarded = '0';
      return true;
    }
    return false;
  }

  function hydrateTab(tabId) {
    markActive(tabId);
    return hydrateWebview(getWebview(tabId));
  }

  function discardWebview(webview) {
    if (!webview || isProtected(webview)) return false;
    if (webview.dataset.discarded === '1') return false;

    let url = webview.dataset.pendingSrc || null;
    if (!url) {
      try {
        url =
          (typeof webview.getURL === 'function' && webview.getURL()) ||
          webview.src ||
          null;
      } catch (_) {
        url = webview.src || null;
      }
    }
    if (!url || url === 'about:blank') return false;

    webview.dataset.discardedUrl = url;
    webview.dataset.discarded = '1';
    delete webview.dataset.pendingSrc;
    try {
      webview.src = 'about:blank';
    } catch (_) {
      /* ignore */
    }
    return true;
  }

  function maybeDiscardCold() {
    if (window.PerfSettings?.isRenderAllTabs?.()) return;

    const webviews = Array.from(
      document.querySelectorAll('#browser webview[data-id]:not([data-id^="home-tab"])')
    );
    if (webviews.length <= MAX_WARM) return;

    const ranked = webviews
      .map((wv) => ({
        wv,
        id: wv.dataset.id,
        at: lastActiveAt.get(wv.dataset.id) || 0,
        warm: !(wv.dataset.pendingSrc || wv.dataset.discarded === '1'),
      }))
      .filter((row) => row.warm && !isProtected(row.wv))
      .sort((a, b) => a.at - b.at);

    let warmCount = webviews.filter(
      (wv) => !wv.dataset.pendingSrc && wv.dataset.discarded !== '1'
    ).length;

    for (const row of ranked) {
      if (warmCount <= MAX_WARM) break;
      if (discardWebview(row.wv)) warmCount -= 1;
    }
  }

  async function warmDeferredQueue(preferFirstId) {
    if (warmerRunning) return;
    warmerRunning = true;
    try {
      if (preferFirstId) hydrateTab(preferFirstId);

      const pending = Array.from(
        document.querySelectorAll('#browser webview[data-pending-src]')
      );
      // Ativa primeiro, depois o resto na ordem do DOM
      pending.sort((a, b) => {
        if (a.dataset.id === preferFirstId) return -1;
        if (b.dataset.id === preferFirstId) return 1;
        return 0;
      });

      for (const wv of pending) {
        if (wv.dataset.id === preferFirstId) continue;
        await sleep(WARM_GAP_MS);
        if (!wv.isConnected) continue;
        hydrateWebview(wv);
        // Yield para o event loop (pintura / input)
        await new Promise((r) => requestAnimationFrame(() => r()));
      }

      maybeDiscardCold();
    } finally {
      warmerRunning = false;
    }
  }

  /**
   * Véu desativado: competia com opacidade/RGB do usuário e com o paint do guest.
   * A transição de aba agora espera 1s (AnimationHook) em vez de mascarar a troca.
   */
  function applyTabSwitchVeil() {
    /* no-op */
  }

  function releaseTabSwitchVeil() {
    const browser = document.getElementById('browser');
    if (!browser) return;
    browser.classList.remove('tab-switch-veil', 'tab-switch-veil-out');
  }

  window.TabWarmth = {
    hydrateTab,
    hydrateWebview,
    markActive,
    discardWebview,
    maybeDiscardCold,
    warmDeferredQueue,
    applyTabSwitchVeil,
    releaseTabSwitchVeil,
    MAX_WARM,
  };
})();

