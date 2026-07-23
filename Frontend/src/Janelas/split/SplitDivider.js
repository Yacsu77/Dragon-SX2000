/**
 * Divisor central do split — bolinha → hover X → fecha split.
 * Fase 4 — stub DOM.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.SplitDivider) return;

  let el = null;

  function ensure() {
    if (el) return el;
    el = document.createElement('button');
    el.type = 'button';
    el.className = 'janelas-split-divider';
    el.title = 'Fechar divisão';
    el.setAttribute('aria-label', 'Fechar modo multijanela');
    el.innerHTML = '<span class="janelas-split-divider__dot"></span><span class="janelas-split-divider__x" aria-hidden="true">×</span>';
    el.addEventListener('click', () => {
      NS.SplitHost?.closeSplit?.();
    });
    return el;
  }

  function mount() {
    const host = document.getElementById('browser') || document.body;
    const node = ensure();
    if (!node.parentNode) host.appendChild(node);
    node.hidden = false;
  }

  function unmount() {
    if (el) el.hidden = true;
  }

  function sync() {
    const mode = NS.Store?.getRuntime?.()?.mode;
    if (mode === 'split') mount();
    else unmount();
  }

  function init() {
    const { Types, Bus } = NS;
    Bus?.on(Types?.EVENTS?.SPLIT_OPENED, sync);
    Bus?.on(Types?.EVENTS?.SPLIT_CLOSED, sync);
    sync();
  }

  NS.SplitDivider = { init, mount, unmount, sync };
})();
