/**
 * Layout Topo Global — preview espelho + modo edição ao vivo no topo.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.TopoGlobalPreview) return;

  const { Utils, TopoGlobalMeta, TopoGlobalComponent } = NS;
  const { RIGHT_ACTION_META, NAV_ICON } = TopoGlobalMeta;

  function measureTopoClearance() {
    const tabsBar = document.querySelector(".tabs-bar");
    const navBar = document.querySelector(".nav-bar");
    const tabsH = tabsBar && !tabsBar.classList.contains("hidden") ? tabsBar.getBoundingClientRect().height : 0;
    const navH = navBar ? navBar.getBoundingClientRect().height : 0;
    return Math.max(72, Math.ceil(tabsH + navH + 8));
  }

  /**
   * @param {HTMLElement|null} overlay
   * @param {boolean} enabled
   * @param {{ remeasure?: boolean }} [options]
   *   remeasure=false mantém o clearance já definido (evita o painel “pular”
   *   quando Music/botões alteram a altura real do topo).
   */
  function setTopoGlobalMode(overlay, enabled, options = {}) {
    if (!overlay) return;
    overlay.classList.toggle("is-topo-global", Boolean(enabled));
    document.body.classList.toggle("customise-topo-editing", Boolean(enabled));
    if (enabled) {
      const shouldRemeasure =
        options.remeasure !== false || !overlay.style.getPropertyValue("--topo-clearance");
      if (shouldRemeasure) {
        overlay.style.setProperty("--topo-clearance", `${measureTopoClearance()}px`);
      }
    } else {
      overlay.style.removeProperty("--topo-clearance");
    }
  }

  function orderedRightIds(draft) {
    const defaults = TopoGlobalComponent.getDefaults();
    return Utils.mergeUniqueOrder(draft.rightOrder, defaults.rightOrder);
  }

  function visibleRightButtonsHtml(draft) {
    return orderedRightIds(draft)
      .filter((id) => draft.rightItems?.[id] !== false)
      .map((id) => {
        const meta = RIGHT_ACTION_META[id];
        return `<button type="button" class="topo-mirror-btn" title="${meta.label}">${meta.icon}</button>`;
      })
      .join("");
  }

  function paint(preview, draft) {
    if (!preview || !draft) return;
    const opacity = Utils.clamp(Number(draft.activeTabOpacity) || 48, 0, 100) / 100;
    const ledClass = draft.activeTabLedBorder ? " has-led" : "";
    const searchWidth = Utils.clamp(Number(draft.searchWidth) || 520, 260, 820);
    const borderRgb = Utils.hexToRgbCss(draft.borderColor);
    const musicPos = TopoGlobalComponent.normalizeMusicPosition(draft.musicPosition);

    preview.innerHTML = `
      <div class="topo-mirror" style="--mirror-search-width:${searchWidth}px;--mirror-border:${draft.borderColor};--mirror-border-rgb:${borderRgb};--mirror-border-opacity:${(Number(draft.borderOpacity) || 0) / 100};--mirror-active-opacity:${opacity};" data-right-slot="right" data-music-position="${musicPos}">
        <div class="topo-mirror__tabs">
          <button type="button" class="topo-mirror-groups" title="Grupos de abas">${NAV_ICON.groups}</button>
          <div class="topo-mirror-tab is-active${ledClass}">
            <span class="topo-mirror-tab__icon">G</span>
            <span class="topo-mirror-tab__title">Aba selecionada</span>
            <span class="topo-mirror-tab__close">×</span>
          </div>
          <div class="topo-mirror-tab">
            <span class="topo-mirror-tab__icon">M</span>
            <span class="topo-mirror-tab__title">Gmail</span>
          </div>
          <div class="topo-mirror-tab">
            <span class="topo-mirror-tab__icon">N</span>
            <span class="topo-mirror-tab__title">Notion</span>
          </div>
        </div>
        <div class="topo-mirror__nav" data-music-position="${musicPos}">
          <div class="topo-mirror__side topo-mirror__side--left">
            <div class="topo-mirror__left">
              <button type="button" class="topo-mirror-btn">${NAV_ICON.menu}</button>
              <button type="button" class="topo-mirror-btn">${NAV_ICON.back}</button>
              <button type="button" class="topo-mirror-btn">${NAV_ICON.forward}</button>
            </div>
            ${musicPos === "left" ? `<div class="topo-mirror__music" title="Music"><span class="topo-mirror-music__title">Now Playing</span><span class="topo-mirror-music__controls">⏮ ⏯ ⏭</span></div>` : ""}
          </div>
          <div class="topo-mirror__center">
            <div class="topo-mirror-search">
              ${NAV_ICON.search}
              <span>Busque ou digite o nome do site</span>
            </div>
          </div>
          <div class="topo-mirror__side topo-mirror__side--right">
            ${musicPos === "right" ? `<div class="topo-mirror__music" title="Music"><span class="topo-mirror-music__title">Now Playing</span><span class="topo-mirror-music__controls">⏮ ⏯ ⏭</span></div>` : ""}
            <div class="topo-mirror__right">
              ${visibleRightButtonsHtml(draft)}
            </div>
          </div>
        </div>
        ${musicPos === "bottom" ? `<div class="topo-mirror__music topo-mirror__music--bottom" title="Music"><span class="topo-mirror-music__title">Now Playing</span><span class="topo-mirror-music__controls">⏮ ⏯ ⏭</span></div>` : ""}
      </div>
    `;
  }

  NS.TopoGlobalPreview = {
    measureTopoClearance,
    setTopoGlobalMode,
    orderedRightIds,
    paint,
  };
})();
