/**
 * Radial Menu — editor Factory.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  const {
    Keys,
    Store,
    EditorFactory,
    DragList,
    Utils,
    RadialMenuComponent,
    RadialPreview,
  } = NS;
  if (!Keys || EditorFactory.has(Keys.RADIAL)) return;

  function render(body, infoEl) {
    let draft = Store.getRecord(Keys.RADIAL);
    infoEl.textContent = "Radial Menu — cor e idgets";

    body.innerHTML = `
      <div class="customise-factory-controls">
        <section class="customise-factory-panel">
          <h4>Aparência</h4>
          <div class="customise-factory-field">
            <label for="customiseRadialColor">Cor principal</label>
            <input id="customiseRadialColor" type="color" value="${draft.color}" />
          </div>
          <div class="customise-factory-field">
            <label for="customiseRadialSize">Tamanho</label>
            <input id="customiseRadialSize" type="range" min="200" max="360" value="${draft.size}" />
            <span class="customise-factory-field-value" data-role="size-label">${draft.size}px</span>
          </div>
        </section>
        <section class="customise-factory-panel">
          <h4>Itens do menu</h4>
          <p class="customise-factory-hint">Inclua ou remova idgets da Tabline. Arraste pela alça para reordenar. É preciso manter pelo menos 1 item.</p>
          <div class="customise-factory-items" data-role="items-list"></div>
        </section>
      </div>
      <div class="customise-factory-preview">
        <div class="customise-factory-preview-header">Preview em tempo real</div>
        <div class="customise-factory-preview-stage">
          <div class="customise-factory-preview-radial" data-role="preview-radial"></div>
        </div>
      </div>
    `;

    const colorInput = body.querySelector("#customiseRadialColor");
    const sizeInput = body.querySelector("#customiseRadialSize");
    const sizeLabel = body.querySelector('[data-role="size-label"]');
    const listEl = body.querySelector('[data-role="items-list"]');

    function persist(options) {
      const refreshList = !options || options.refreshList !== false;
      draft = Store.updateRecord(Keys.RADIAL, {
        color: draft.color,
        size: draft.size,
        items: draft.items.slice(),
      });
      RadialPreview.paint(body, draft);
      if (refreshList) renderItemsList();
    }

    function renderItemsList() {
      const catalog = RadialMenuComponent.getIdgetCatalog();
      listEl.innerHTML = catalog
        .map((item) => {
          const on = draft.items.includes(item.id);
          return `
            <div class="customise-factory-item ${on ? "" : "is-off"}" data-idget-id="${item.id}" data-drag-id="${item.id}">
              <span class="customise-factory-item-handle" title="Arrastar">⠿</span>
              <span class="customise-factory-item-icon" data-lucide="${item.icon}"></span>
              <div class="customise-factory-item-meta">
                <strong>${item.label}</strong>
                <span>${item.description || item.id}</span>
              </div>
              <button type="button" class="customise-factory-item-toggle ${on ? "is-on" : ""}" data-toggle-idget="${item.id}">
                ${on ? "No menu" : "Adicionar"}
              </button>
            </div>
          `;
        })
        .join("");

      const ordered = [
        ...draft.items.map((id) => listEl.querySelector(`[data-idget-id="${id}"]`)).filter(Boolean),
        ...Array.from(listEl.querySelectorAll(".customise-factory-item.is-off")),
      ];
      ordered.forEach((node) => listEl.appendChild(node));
      Utils.refreshLucide();

      listEl.querySelectorAll("[data-toggle-idget]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-toggle-idget");
          const idx = draft.items.indexOf(id);
          if (idx >= 0) {
            if (draft.items.length <= 1) return;
            draft.items.splice(idx, 1);
          } else {
            draft.items.push(id);
          }
          persist();
        });
      });

      DragList.bindActiveReorder(
        listEl,
        () => draft.items,
        (next) => {
          draft.items = next;
        },
        () => persist()
      );
    }

    colorInput.addEventListener("input", () => {
      draft.color = colorInput.value;
      persist({ refreshList: false });
    });
    sizeInput.addEventListener("input", () => {
      draft.size = Number(sizeInput.value);
      sizeLabel.textContent = `${draft.size}px`;
      persist({ refreshList: false });
    });

    renderItemsList();
    RadialPreview.paint(body, draft);
  }

  EditorFactory.register(Keys.RADIAL, {
    label: "Radial Menu",
    render,
  });
})();
