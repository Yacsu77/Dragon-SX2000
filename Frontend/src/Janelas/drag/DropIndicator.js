/**
 * Indicador visual de drop na barra de abas (esta janela como destino).
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.DropIndicator) return;

  let el = null;

  function ensure() {
    if (el && el.isConnected) return el;
    el = document.createElement('div');
    el.className = 'janelas-drop-indicator';
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    const host =
      document.querySelector('.tabs-bar') ||
      document.getElementById('tabs') ||
      document.body;
    host.appendChild(el);
    return el;
  }

  function show(screenX) {
    const node = ensure();
    const host =
      document.querySelector('.tabs-bar') || document.getElementById('tabs');
    if (!host) return;
    const rect = host.getBoundingClientRect();
    let localX = rect.width / 2;
    if (typeof screenX === 'number') {
      // Converte screen → client da janela destino
      localX = screenX - window.screenX - rect.left;
    }
    const x = Math.max(6, Math.min(rect.width - 6, localX));
    node.style.left = `${Math.round(x)}px`;
    node.hidden = false;
    host.classList.add('janelas-drop-target');
  }

  function hide() {
    if (el) el.hidden = true;
    document
      .querySelectorAll('.janelas-drop-target')
      .forEach((n) => n.classList.remove('janelas-drop-target'));
  }

  function init() {
    NS.WindowBridge?.onDropIndicator?.((payload) => {
      if (payload?.show) show(payload.screenX);
      else hide();
    });
  }

  NS.DropIndicator = { init, show, hide };
})();
