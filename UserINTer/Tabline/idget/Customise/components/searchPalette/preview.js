/**
 * Search Palette — preview.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.SearchPreview) return;

  const { Utils, SearchPaletteComponent } = NS;

  function paint(body, draft) {
    const preview = body.querySelector('[data-role="preview-search"]');
    if (!preview || !draft) return;
    const rgb = Utils.parseHexColor(draft.color);
    const opacity = Utils.clamp(Number(draft.backgroundOpacity) || 0, 0, 100) / 100;
    const width = Math.min(520, Number(draft.width) || 640);
    preview.style.setProperty("--search-accent", draft.color || SearchPaletteComponent.DEFAULTS.color);
    preview.style.setProperty("--search-accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    preview.style.setProperty("--search-width", `${width}px`);
    preview.style.setProperty("--search-shell-bg", `rgba(20, 22, 32, ${opacity})`);
    const placeholderEl = preview.querySelector('[data-role="preview-placeholder"]');
    if (placeholderEl) {
      placeholderEl.textContent = draft.placeholder || SearchPaletteComponent.DEFAULTS.placeholder;
    }
  }

  NS.SearchPreview = { paint };
})();
