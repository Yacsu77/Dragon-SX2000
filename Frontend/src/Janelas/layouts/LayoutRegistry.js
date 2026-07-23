/**
 * Registry de layouts de janela / multi-janela.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.LayoutRegistry) return;

  const layouts = Object.create(null);

  function register(id, impl) {
    if (!id || !impl?.apply) return;
    layouts[id] = impl;
  }

  function apply() {
    const settings = NS.Store?.getSettings?.() || {};
    const runtime = NS.Store?.getRuntime?.() || {};
    const root = document.documentElement;

    root.dataset.janelasWindowLayout = settings.windowLayout || 'standard';
    root.dataset.janelasMultiLayout = settings.multiLayout || 'standard';
    root.dataset.janelasMode = runtime.mode || 'single';
    root.dataset.janelasBorders = settings.borders ? '1' : '0';
    root.dataset.janelasBordersAnimated = settings.bordersAnimated ? '1' : '0';
    root.dataset.janelasBordersRgb = settings.bordersRgb ? '1' : '0';

    const windowId =
      runtime.mode === 'split'
        ? `multi-${settings.multiLayout || 'standard'}`
        : `window-${settings.windowLayout || 'standard'}`;

    const impl = layouts[windowId];
    if (impl?.apply) impl.apply({ settings, runtime });
  }

  NS.LayoutRegistry = { register, apply };
})();
