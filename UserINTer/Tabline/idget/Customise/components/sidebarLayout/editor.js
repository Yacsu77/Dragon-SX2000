/**
 * Barra Lateral — editor Factory (LLM + Chats, drag + preview ao vivo).
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  const {
    Keys,
    Store,
    EditorFactory,
    DragList,
    RuntimeAdapter,
    SidebarLayoutComponent,
    SidebarLayoutPreview,
  } = NS;
  if (!Keys || EditorFactory.has(Keys.SIDEBAR)) return;

  const EDITABLE = SidebarLayoutComponent?.EDITABLE || ["llm", "chats"];
  const LABELS = SidebarLayoutComponent?.SECTION_LABELS || {};
  const ICONS = SidebarLayoutComponent?.LUCIDE_OPTIONS || ["globe"];

  function render(body, infoEl) {
    infoEl.textContent = "Barra Lateral";
    let draft = Store.getRecord(Keys.SIDEBAR);

    body.classList.add("customise-factory-body--sidebar");
    body.innerHTML = `
      <div class="customise-factory-controls customise-sidebar-controls">
        <section class="customise-factory-panel">
          <div class="customise-section-nav customise-section-nav--pills" data-role="sidebar-sections">
            ${EDITABLE.map(
              (section, index) =>
                `<button type="button" data-section="${section}" class="${index === 0 ? "is-active" : ""}">${
                  LABELS[section] || section
                }</button>`
            ).join("")}
          </div>
          <p class="customise-sidebar-hint">Arraste para reordenar. Só IA e Chats são editáveis — o restante permanece fixo.</p>
        </section>
        <section class="customise-factory-panel" data-role="sidebar-section-body"></section>
      </div>
      <div class="customise-factory-preview customise-sidebar-preview-pane">
        <div class="customise-factory-preview-stage customise-sidebar-stage" data-role="sidebar-preview"></div>
      </div>
    `;

    const sectionsEl = body.querySelector('[data-role="sidebar-sections"]');
    const sectionBody = body.querySelector('[data-role="sidebar-section-body"]');
    const preview = body.querySelector('[data-role="sidebar-preview"]');
    let activeSection = EDITABLE[0];

    function refreshDraft() {
      draft = Store.getRecord(Keys.SIDEBAR);
    }

    function persistNotify() {
      refreshDraft();
      RuntimeAdapter.notifyKey(Keys.SIDEBAR);
      drawPreview();
    }

    function drawPreview() {
      SidebarLayoutPreview.paint(preview, draft);
    }

    function itemsFor(section) {
      return (draft.items || [])
        .filter((item) => item.section === section)
        .sort((a, b) => a.order - b.order);
    }

    function drawSection(section) {
      activeSection = section;
      sectionsEl.querySelectorAll("button").forEach((button) => {
        button.classList.toggle("is-active", button.getAttribute("data-section") === section);
      });

      const items = itemsFor(section);
      const rows = items
        .map((item) => {
          const iconOptions = ICONS.map(
            (name) =>
              `<option value="${name}" ${
                item.icon?.type === "lucide" && item.icon.value === name ? "selected" : ""
              }>${name}</option>`
          ).join("");

          return `
            <div class="customise-factory-item customise-sidebar-item" data-item-id="${item.id}" data-drag-id="${item.id}">
              <span class="customise-factory-item-handle" title="Arrastar">⋮⋮</span>
              <div class="customise-sidebar-item__fields">
                <input type="text" data-field="label" value="${escapeAttr(item.label)}" placeholder="Nome" />
                <input type="url" data-field="url" value="${escapeAttr(item.url || "")}" placeholder="https://" />
                <select data-field="icon">${iconOptions}</select>
              </div>
              <button type="button" class="customise-factory-item-toggle" data-role="remove-item" title="Remover">✕</button>
            </div>`;
        })
        .join("");

      sectionBody.innerHTML = `
        <h4>${LABELS[section] || section}</h4>
        <div class="customise-factory-items" data-role="sidebar-items-list">${rows}</div>
        <button type="button" class="customise-sidebar-add" data-role="add-item">+ Adicionar</button>
      `;

      const list = sectionBody.querySelector('[data-role="sidebar-items-list"]');

      list.querySelectorAll("[data-item-id]").forEach((row) => {
        const id = row.getAttribute("data-item-id");

        row.querySelectorAll("[data-field]").forEach((input) => {
          const apply = () => {
            const field = input.getAttribute("data-field");
            const current = window.SidebarNS.Store.getItemById(id);
            if (!current) return;
            const patch = { ...current };
            if (field === "label") patch.label = input.value.trim() || "Item";
            if (field === "url") patch.url = input.value.trim() || "https://";
            if (field === "icon") patch.icon = { type: "lucide", value: input.value };
            window.SidebarNS.Store.upsertItem(patch);
            persistNotify();
          };
          input.addEventListener(input.tagName === "SELECT" ? "change" : "input", apply);
          if (input.tagName !== "SELECT") input.addEventListener("change", apply);
        });

        row.querySelector('[data-role="remove-item"]')?.addEventListener("click", () => {
          window.SidebarNS.Store.removeItem(id);
          persistNotify();
          drawSection(activeSection);
        });
      });

      DragList.bindReorder(list, {
        onReorder(ids) {
          window.SidebarNS.Store.reorderSection(section, ids);
          persistNotify();
        },
      });

      sectionBody.querySelector('[data-role="add-item"]')?.addEventListener("click", () => {
        window.SidebarNS.Store.addUrlItem(section, {
          label: "Novo item",
          url: "https://",
          icon: { type: "lucide", value: "globe" },
        });
        persistNotify();
        drawSection(activeSection);
      });
    }

    function escapeAttr(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
    }

    sectionsEl.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        drawSection(button.getAttribute("data-section"));
      });
    });

    drawSection(activeSection);
    drawPreview();
  }

  function teardown(body) {
    body?.classList?.remove("customise-factory-body--sidebar");
  }

  EditorFactory.register(Keys.SIDEBAR, {
    label: "Barra Lateral",
    render,
    teardown,
  });
})();
