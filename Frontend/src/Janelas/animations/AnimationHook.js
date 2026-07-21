/**
 * Liga animações de transição ao activateTab / activateHomeTab.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.AnimationHook) return;

  let hooked = false;
  let playing = false;

  function shouldAnimate(fromId, toId) {
    const settings = NS.Store?.getSettings?.() || {};
    const transition = settings.tabTransition || 'none';
    if (transition === 'none') return false;
    if (!fromId || !toId || fromId === toId) return false;
    if (playing) return false;
    if (NS.Store?.getRuntime?.()?.mode === 'split') return false;
    return true;
  }

  function playTransition(fromId, toId) {
    if (!shouldAnimate(fromId, toId)) return;
    playing = true;
    // Próximo frame: conteúdo já trocou
    requestAnimationFrame(() => {
      Promise.resolve(NS.AnimationRegistry?.play?.({ fromId, toId }))
        .catch(() => {})
        .finally(() => {
          playing = false;
        });
    });
  }

  function wrapFn(name) {
    const current = window[name];
    if (typeof current !== 'function') return;
    // Já somos o wrapper mais externo
    if (current.__janelasAnimHooked) return;

    function wrapped(tabId) {
      const fromId = window.TabsState?.currentActiveTab || window.currentActiveTab;
      const result = current.call(this, tabId);
      playTransition(fromId, tabId);
      return result;
    }
    wrapped.__janelasAnimHooked = true;
    wrapped.__janelasAnimInner = current;
    window[name] = wrapped;
    if (window.TabsCore && name in window.TabsCore) {
      window.TabsCore[name] = wrapped;
    }
  }

  function hookActivateTab() {
    wrapFn('activateTab');
    wrapFn('activateHomeTab');
  }

  function init() {
    hookActivateTab();
    // Re-hook se Split/Thumbnail envolverem depois
    setTimeout(() => {
      const a = window.activateTab;
      if (a && !a.__janelasAnimHooked) hookActivateTab();
      const h = window.activateHomeTab;
      if (h && !h.__janelasAnimHooked) wrapFn('activateHomeTab');
    }, 0);
    setTimeout(() => {
      if (window.activateTab && !window.activateTab.__janelasAnimHooked) {
        wrapFn('activateTab');
      }
      if (window.activateHomeTab && !window.activateHomeTab.__janelasAnimHooked) {
        wrapFn('activateHomeTab');
      }
    }, 300);
  }

  NS.AnimationHook = { init };
})();
