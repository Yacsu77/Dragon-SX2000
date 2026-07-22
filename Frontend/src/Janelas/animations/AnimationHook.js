/**
 * Liga animações de transição à troca de aba.
 *
 * Conteúdo↔conteúdo: o crossfade dos webviews já é a transição — rodar flip
 * no #browser (opacity 0.72→1) causava piscar. Flip/drop só em New Tab↔conteúdo.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  const HOOK_VERSION = 10;

  if (NS.AnimationHook?.__v === HOOK_VERSION) {
    NS.AnimationHook.init?.();
    return;
  }

  let playing = false;
  let previousTabId = null;
  let listenersBound = false;

  function isHomeId(id) {
    return Boolean(id && String(id).startsWith('home-tab'));
  }

  function shouldAnimate(fromId, toId) {
    const settings = NS.Store?.getSettings?.() || {};
    const transition = settings.tabTransition || 'none';
    if (transition === 'none') return false;
    if (!fromId || !toId || fromId === toId) return false;
    if (NS.Store?.getRuntime?.()?.mode === 'split') return false;
    // Só anima superfície quando envolve New Tab (home). Conteúdo↔conteúdo = webview crossfade.
    if (!isHomeId(fromId) && !isHomeId(toId)) return false;
    return true;
  }

  function playTransition(fromId, toId) {
    window.TabWarmth?.releaseTabSwitchVeil?.();
    if (!shouldAnimate(fromId, toId) || playing) return;

    playing = true;
    Promise.resolve(
      NS.AnimationRegistry?.play?.({
        fromId,
        toId,
        delaySatisfied: true,
        syncedWithSurface: true,
      })
    )
      .catch(() => {})
      .finally(() => {
        playing = false;
      });
  }

  function onTabChanged(e) {
    const toId = e?.detail?.tabId;
    if (!toId) return;
    const fromId = previousTabId;
    previousTabId = toId;
    playTransition(fromId, toId);
  }

  function bindListeners() {
    if (listenersBound) return;
    listenersBound = true;
    document.addEventListener('app:tab-changed', onTabChanged);
  }

  function init() {
    bindListeners();
    previousTabId =
      window.TabsState?.currentActiveTab || window.currentActiveTab || previousTabId;
  }

  NS.AnimationHook = {
    init,
    OPEN_DELAY_MS: 0,
    CONTENT_OPEN_MS: 0,
    __v: HOOK_VERSION,
  };
})();
