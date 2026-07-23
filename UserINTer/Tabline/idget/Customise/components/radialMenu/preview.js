/**
 * Radial Menu — preview em tempo real.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.RadialPreview) return;

  const { Utils, RadialGeometry, RadialMenuComponent } = NS;

  function paint(body, draft) {
    const preview = body.querySelector('[data-role="preview-radial"]');
    if (!preview || !draft) return;

    const catalog = RadialMenuComponent.getIdgetCatalog();
    const items = draft.items
      .map((id) => catalog.find((item) => item.id === id))
      .filter(Boolean);
    const size = Math.min(240, Number(draft.size) || 240);
    const half = size / 2;
    preview.style.setProperty("--preview-size", `${size}px`);
    preview.style.setProperty("--radial-color", draft.color || RadialMenuComponent.DEFAULTS.color);

    const wedgeOuter = half - 20;
    const wedgeInner = wedgeOuter - 48;
    const iconRing = (wedgeOuter + wedgeInner) / 2;
    const total = items.length;

    const paths = items
      .map((_, index) => {
        const d = RadialGeometry.slicePath(index, total, wedgeOuter, wedgeInner);
        return `<path class="preview-wedge" d="${d}"></path>`;
      })
      .join("");

    const labels = items
      .map((item, index) => {
        const mid = -90 + (360 / Math.max(total, 1)) * index;
        const pos = RadialGeometry.polar(iconRing, mid);
        const left = ((pos.x + half) / size) * 100;
        const top = ((pos.y + half) / size) * 100;
        return `
          <div class="customise-factory-preview-label" style="left:${left}%;top:${top}%;">
            <span data-lucide="${item.icon}"></span>
            <span>${item.label}</span>
          </div>
        `;
      })
      .join("");

    preview.innerHTML = `
      <svg viewBox="${-half} ${-half} ${size} ${size}" aria-hidden="true">${paths}<circle cx="0" cy="0" r="${Math.max(wedgeInner - 8, 16)}" fill="rgba(10,12,20,0.88)" stroke="color-mix(in srgb, var(--radial-color) 40%, transparent)" stroke-width="1.5"></circle></svg>
      <div class="customise-factory-preview-labels">${labels}</div>
    `;

    Utils.refreshLucide();
  }

  NS.RadialPreview = { paint };
})();
