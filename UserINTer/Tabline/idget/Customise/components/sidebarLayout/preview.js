/**
 * Preview ao vivo da barra lateral (só seções editáveis + placeholders).
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.SidebarLayoutPreview) return;

  const { SidebarLayoutComponent } = NS;

  function iconHtml(icon) {
    if (icon?.type === "url" && icon.value) {
      return `<img src="${icon.value}" alt="" width="14" height="14" />`;
    }
    const name = icon?.value || "circle";
    return `<span data-lucide="${name}"></span>`;
  }

  function sectionBlock(label, items, editable) {
    const rows = items
      .map(
        (item) => `
        <div class="sidebar-preview-item" title="${item.label}">
          <span class="sidebar-preview-item__icon">${iconHtml(item.icon)}</span>
        </div>`
      )
      .join("");

    return `
      <div class="sidebar-preview-section ${editable ? "is-editable" : "is-locked"}">
        <span class="sidebar-preview-section__label">${label}</span>
        <div class="sidebar-preview-section__list">${rows || '<span class="sidebar-preview-empty">—</span>'}</div>
      </div>`;
  }

  function paint(host, state) {
    if (!host) return;
    const labels = SidebarLayoutComponent?.SECTION_LABELS || {};
    const editable = new Set(SidebarLayoutComponent?.EDITABLE || ["llm", "chats"]);
    const bySection = (section) =>
      (state?.items || [])
        .filter((item) => item.section === section && item.visible !== false)
        .sort((a, b) => a.order - b.order);

    host.innerHTML = `
      <div class="sidebar-preview-dock" aria-hidden="true">
        ${sectionBlock(labels.tools || "Ferramentas", bySection("tools"), false)}
        ${sectionBlock(labels.llm || "IA", bySection("llm"), editable.has("llm"))}
        ${sectionBlock(labels.chats || "Chats", bySection("chats"), editable.has("chats"))}
        <div class="sidebar-preview-section is-locked">
          <span class="sidebar-preview-section__label">${labels.widgets || "Widgets"}</span>
          <div class="sidebar-preview-section__list">
            <div class="sidebar-preview-orb"></div>
          </div>
        </div>
        <div class="sidebar-preview-spacer"></div>
        <div class="sidebar-preview-section is-locked">
          <span class="sidebar-preview-section__label">${labels.footer || "Conta"}</span>
          <div class="sidebar-preview-section__list">
            <div class="sidebar-preview-avatar">?</div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide?.createIcons) window.lucide.createIcons();
  }

  NS.SidebarLayoutPreview = { paint };
})();
