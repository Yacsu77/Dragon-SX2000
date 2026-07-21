/**
 * Registry de animações de transição de aba.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.AnimationRegistry) return;

  const animations = Object.create(null);

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
   * Superfície visível (home ou browser) — animações em webview não funcionam bem.
   */
  function getSurface() {
    const home = document.getElementById('homePage');
    if (home && !home.classList.contains('hidden') && home.offsetParent !== null) {
      return home;
    }
    const browser = document.getElementById('browser');
    if (browser && browser.classList.contains('active')) return browser;
    return home || browser || document.body;
  }

  /**
   * @param {{ fromId: string, toId: string }} ctx
   * @returns {Promise<void>}
   */
  async function play(ctx) {
    const id = NS.Store?.getSettings?.()?.tabTransition || 'none';
    if (id === 'none') return;
    const impl = animations[id];
    if (!impl) return;
    await impl.play({
      ...(ctx || {}),
      floating: isFloatingLayout(),
      surface: getSurface(),
    });
  }

  NS.AnimationRegistry = { register, play, getSurface, isFloatingLayout };
})();
