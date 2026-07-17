/**
 * Layout Topo Global — editor Factory (seções Busca / Botões / Music / Acabamento / Abas).
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  const {
    Keys,
    Store,
    EditorFactory,
    DragList,
    Utils,
    TopoGlobalComponent,
    TopoGlobalMeta,
    TopoGlobalPreview,
  } = NS;
  if (!Keys || EditorFactory.has(Keys.CHROME)) return;

  const { RIGHT_ACTION_META } = TopoGlobalMeta;

  function render(body, infoEl, ctx) {
    let draft = Store.getRecord(Keys.CHROME);
    infoEl.textContent = "Layout Topo Global";
    draft.tabsPosition = "middle";
    draft.searchSlot = "center";
    draft.rightSlot = "right";
    draft.musicPosition = TopoGlobalComponent.normalizeMusicPosition(draft.musicPosition);
    if (!Array.isArray(draft.rightOrder) || !draft.rightOrder.length) {
      draft.rightOrder = TopoGlobalComponent.getDefaults().rightOrder.slice();
    }

    const overlay = ctx?.overlay || null;
    TopoGlobalPreview.setTopoGlobalMode(overlay, true);
    body.classList.add("customise-factory-body--topo");

    body.innerHTML = `
      <div class="customise-factory-controls customise-topo-controls">
        <section class="customise-factory-panel customise-topo-hero">
          <div class="customise-section-nav customise-section-nav--pills" data-role="chrome-sections">
            <button type="button" data-section="search">Busca</button>
            <button type="button" data-section="actions">Botões</button>
            <button type="button" data-section="music">Music</button>
            <button type="button" data-section="visual">Acabamento</button>
            <button type="button" data-section="animations">Abas</button>
          </div>
        </section>
        <section class="customise-factory-panel customise-topo-section" data-role="chrome-section-body"></section>
      </div>
      <div class="customise-factory-preview customise-topo-preview-pane">
        <div class="customise-factory-preview-stage customise-topo-stage" data-role="chrome-preview"></div>
      </div>
    `;

    const sectionsEl = body.querySelector('[data-role="chrome-sections"]');
    const sectionBody = body.querySelector('[data-role="chrome-section-body"]');
    const preview = body.querySelector('[data-role="chrome-preview"]');
    let activeSection = "search";

    function saveChromeDraft() {
      draft.tabsPosition = "middle";
      draft.searchSlot = "center";
      draft.rightSlot = "right";
      draft.musicPosition = TopoGlobalComponent.normalizeMusicPosition(draft.musicPosition);
      draft = Store.updateRecord(Keys.CHROME, draft);
      TopoGlobalPreview.setTopoGlobalMode(overlay, true);
    }

    function drawPreview() {
      TopoGlobalPreview.paint(preview, draft);
    }

    function drawSection(section) {
      activeSection = section;
      sectionsEl.querySelectorAll("button").forEach((button) => {
        button.classList.toggle("is-active", button.getAttribute("data-section") === section);
      });

      if (section === "search") {
        sectionBody.innerHTML = `
          <h4>Busca</h4>
          <div class="customise-factory-field">
            <label for="customiseSearchChromeWidth">Largura</label>
            <input id="customiseSearchChromeWidth" type="range" min="260" max="820" value="${draft.searchWidth}" />
            <span class="customise-factory-field-value" data-role="search-width-label">${draft.searchWidth}px</span>
          </div>
        `;
        const searchWidth = sectionBody.querySelector("#customiseSearchChromeWidth");
        const searchWidthLabel = sectionBody.querySelector('[data-role="search-width-label"]');
        searchWidth.addEventListener("input", () => {
          draft.searchWidth = Number(searchWidth.value);
          searchWidthLabel.textContent = `${draft.searchWidth}px`;
          saveChromeDraft();
          drawPreview();
        });
      } else if (section === "actions") {
        const rows = TopoGlobalPreview.orderedRightIds(draft)
          .map((id) => {
            const meta = RIGHT_ACTION_META[id];
            const on = draft.rightItems?.[id] !== false;
            return `
              <div class="customise-factory-item customise-topo-action ${on ? "" : "is-off"}" data-action-id="${id}" data-drag-id="${id}">
                <span class="customise-factory-item-handle" title="Arrastar">⋮⋮</span>
                <span class="customise-factory-item-icon">${meta.icon}</span>
                <div class="customise-factory-item-meta">
                  <strong>${meta.label}</strong>
                </div>
                <button type="button" class="customise-factory-item-toggle ${on ? "is-on" : ""}" data-role="toggle-action">${on ? "On" : "Off"}</button>
              </div>
            `;
          })
          .join("");

        sectionBody.innerHTML = `
          <h4>Botões</h4>
          <div class="customise-factory-items" data-role="right-actions-list">${rows}</div>
        `;

        const list = sectionBody.querySelector('[data-role="right-actions-list"]');
        list.querySelectorAll("[data-action-id]").forEach((row) => {
          const id = row.getAttribute("data-action-id");
          const toggle = row.querySelector("[data-role='toggle-action']");
          if (toggle) {
            toggle.addEventListener("click", () => {
              draft.rightItems = {
                ...draft.rightItems,
                [id]: draft.rightItems?.[id] === false,
              };
              saveChromeDraft();
              drawSection("actions");
            });
          }
        });

        DragList.bindReorder(list, {
          onReorder(ids) {
            draft.rightOrder = ids;
            saveChromeDraft();
            drawPreview();
          },
        });
      } else if (section === "music") {
        const musicPos = TopoGlobalComponent.normalizeMusicPosition(draft.musicPosition);
        sectionBody.innerHTML = `
          <h4>Music</h4>
          <div class="customise-topo-choice" data-role="music-position">
            <button type="button" data-music-pos="left" class="${musicPos === "left" ? "is-active" : ""}">Esquerda</button>
            <button type="button" data-music-pos="right" class="${musicPos === "right" ? "is-active" : ""}">Direita</button>
            <button type="button" data-music-pos="bottom" class="${musicPos === "bottom" ? "is-active" : ""}">Embaixo</button>
          </div>
        `;
        sectionBody.querySelectorAll("[data-music-pos]").forEach((button) => {
          button.addEventListener("click", () => {
            draft.musicPosition = button.getAttribute("data-music-pos") || "right";
            saveChromeDraft();
            drawSection("music");
          });
        });
      } else if (section === "visual") {
        sectionBody.innerHTML = `
          <h4>Acabamento</h4>
          <div class="customise-factory-field customise-factory-field--inline">
            <label for="customiseBorderColor">Cor</label>
            <input id="customiseBorderColor" type="color" value="${draft.borderColor}" />
          </div>
          <div class="customise-factory-field">
            <label for="customiseBorderOpacity">Intensidade</label>
            <input id="customiseBorderOpacity" type="range" min="0" max="100" value="${draft.borderOpacity}" />
            <span class="customise-factory-field-value" data-role="border-label">${draft.borderOpacity}%</span>
          </div>
        `;
        const borderColor = sectionBody.querySelector("#customiseBorderColor");
        const borderOpacity = sectionBody.querySelector("#customiseBorderOpacity");
        const borderLabel = sectionBody.querySelector('[data-role="border-label"]');
        borderColor.addEventListener("input", () => {
          draft.borderColor = borderColor.value;
          saveChromeDraft();
          drawPreview();
        });
        borderOpacity.addEventListener("input", () => {
          draft.borderOpacity = Number(borderOpacity.value);
          borderLabel.textContent = `${draft.borderOpacity}%`;
          saveChromeDraft();
          drawPreview();
        });
      } else {
        const opacity = Utils.clamp(Number(draft.activeTabOpacity) || 48, 0, 100);
        sectionBody.innerHTML = `
          <h4>Abas</h4>
          <div class="customise-factory-field">
            <label for="customiseActiveTabOpacity">Opacidade</label>
            <input id="customiseActiveTabOpacity" type="range" min="15" max="90" value="${opacity}" />
            <span class="customise-factory-field-value" data-role="active-tab-opacity-label">${opacity}%</span>
          </div>
          <label class="customise-factory-check">
            <input id="customiseActiveTabLed" type="checkbox" ${draft.activeTabLedBorder ? "checked" : ""} />
            Borda LED
          </label>
        `;
        const opacityInput = sectionBody.querySelector("#customiseActiveTabOpacity");
        const opacityLabel = sectionBody.querySelector('[data-role="active-tab-opacity-label"]');
        const ledInput = sectionBody.querySelector("#customiseActiveTabLed");
        opacityInput.addEventListener("input", () => {
          draft.activeTabOpacity = Number(opacityInput.value);
          opacityLabel.textContent = `${draft.activeTabOpacity}%`;
          saveChromeDraft();
          drawPreview();
        });
        ledInput.addEventListener("change", () => {
          draft.activeTabLedBorder = ledInput.checked;
          saveChromeDraft();
          drawPreview();
        });
      }

      drawPreview();
    }

    sectionsEl.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        drawSection(button.getAttribute("data-section") || "search");
      });
    });

    saveChromeDraft();
    drawSection(activeSection);
  }

  function teardown(body, ctx) {
    body?.classList.remove("customise-factory-body--topo");
    TopoGlobalPreview.setTopoGlobalMode(ctx?.overlay || null, false);
  }

  EditorFactory.register(Keys.CHROME, {
    label: "Layout Topo Global",
    render,
    teardown,
  });
})();
