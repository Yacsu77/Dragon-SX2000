/**
 * Ghost de aba em janela OS always-on-top (visível entre janelas/monitores).
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.OsDragGhost) return;

  let active = false;

  function start(payload) {
    const api = window.DragonJanelas;
    if (!api?.dragGhostStart) return false;
    active = true;
    api.dragGhostStart({
      title: payload?.title || 'Aba',
      favicon: payload?.favicon || null,
      thumbnail: payload?.thumbnail || null,
      mode: payload?.mode || 'tab',
      width: Math.max(80, Math.round(payload?.width || 160)),
      height: Math.max(28, Math.round(payload?.height || 32)),
      offsetX: Math.round(payload?.offsetX || 40),
      offsetY: Math.round(payload?.offsetY || 14),
    });
    return true;
  }

  function setMode(mode, extra) {
    if (!active) return;
    window.DragonJanelas?.dragGhostUpdate?.({
      mode: mode || 'tab',
      thumbnail: extra?.thumbnail || null,
      title: extra?.title || null,
      favicon: extra?.favicon || null,
      width: extra?.width,
      height: extra?.height,
    });
  }

  function end() {
    if (!active) return;
    active = false;
    window.DragonJanelas?.dragGhostEnd?.();
  }

  function isActive() {
    return active;
  }

  NS.OsDragGhost = { start, setMode, end, isActive };
})();
