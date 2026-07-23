/**
 * Registry de animações de transição de aba.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  const REG_VERSION = 2;

  if (NS.AnimationRegistry?.__v === REG_VERSION) return;

  const animations = NS.AnimationRegistry?._animations || Object.create(null);

  function register(id, impl) {
    if (!id || !impl?.play) return;
    animations[id] = impl;
  }

  function isFloatingLayout() {
    return (
      document.body.classList.contains('janelas-window-floating') ||
      document.body.classList.contains('janelas-multi-floating')
    );
  }

  /**
   * Superfície do destino: browser.active tem prioridade (New Tab → conteúdo
   * durante crossfade ainda deixa home sem .hidden).
   */
  function getSurface() {
    const browser = document.getElementById('browser');
    const home = document.getElementById('homePage');
    if (browser && browser.classList.contains('active')) return browser;
    if (home && !home.classList.contains('hidden')) return home;
    return home || browser || document.body;
  }

  /**
   * @param {{ fromId: string, toId: string, delaySatisfied?: boolean }} ctx
   * @returns {Promise<void>}
   */
  async function play(ctx) {
    const id = NS.Store?.getSettings?.()?.tabTransition || 'none';
    if (id === 'none') return;
    if (!ctx?.delaySatisfied) return;
    const impl = animations[id];
    if (!impl) return;
    await impl.play({
      ...(ctx || {}),
      floating: isFloatingLayout(),
      surface: getSurface(),
    });
  }

  NS.AnimationRegistry = {
    register,
    play,
    getSurface,
    isFloatingLayout,
    _animations: animations,
    __v: REG_VERSION,
  };
})();
