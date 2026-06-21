/**
 * Rastreia navegação nos webviews e persiste na API-DSX.
 */
(function () {
  const PROFILE_ID = 'default';
  const DEBOUNCE_MS = 1500;
  const lastRecorded = new Map();

  function shouldSkipUrl(url) {
    if (!url) return true;
    const blocked = ['about:', 'file:', 'chrome:', 'data:', 'devtools:'];
    return blocked.some((prefix) => url.startsWith(prefix));
  }

  function getTransitionType() {
    const type = window._historyTransitionType || 'link';
    window._historyTransitionType = 'link';
    return type;
  }

  function setHistoryTransitionType(type) {
    window._historyTransitionType = type;
  }

  async function recordVisit(webview) {
    if (!window.HistoryApi || !webview) return;

    let url;
    let title;

    try {
      url = webview.getURL();
      title = webview.getTitle();
    } catch {
      return;
    }

    if (shouldSkipUrl(url)) return;

    const now = Date.now();
    const lastTime = lastRecorded.get(url);
    if (lastTime && now - lastTime < DEBOUNCE_MS) return;
    lastRecorded.set(url, now);

    const transitionType = getTransitionType();
    let faviconUrl = null;

    try {
      const parsed = new URL(url);
      faviconUrl = `${parsed.protocol}//${parsed.host}/favicon.ico`;
    } catch {
      faviconUrl = null;
    }

    try {
      await window.HistoryApi.createHistoryEntry({
        url,
        title: title || url,
        favicon_url: faviconUrl,
        transition_type: transitionType,
        profile_id: PROFILE_ID,
        typed_count: transitionType === 'typed' ? 1 : 0,
      });
    } catch (err) {
      console.warn('[HistoryTracker]', err.message);
    }
  }

  function trackWebviewHistory(webview) {
    if (!webview || webview.dataset.historyTracking === 'true') return;
    webview.dataset.historyTracking = 'true';

    const onNavigate = () => recordVisit(webview);
    webview.addEventListener('did-finish-load', onNavigate);
    webview.addEventListener('did-navigate-in-page', onNavigate);
  }

  function trackExistingWebviews() {
    document.querySelectorAll('webview').forEach(trackWebviewHistory);
  }

  window.trackWebviewHistory = trackWebviewHistory;
  window.setHistoryTransitionType = setHistoryTransitionType;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackExistingWebviews);
  } else {
    trackExistingWebviews();
  }
})();
