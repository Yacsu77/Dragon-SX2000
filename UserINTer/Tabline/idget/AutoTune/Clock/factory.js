window.AutoTuneFactoryPlugins = window.AutoTuneFactoryPlugins || {};

(function () {
  const Config = window.AutoTuneClockConfig;
  const Fonts = window.AutoTuneClockFonts;
  const Render = window.AutoTuneClockRender;
  const KEY = Config.FACTORY_KEY;

  let panelRoot = null;
  let activeTab = "time";
  let currentRecord = null;
  let onChangeCallback = null;
  let targetElRef = null;

  function createField(label, html) {
    return `
      <div class="factory-field">
        <label>${label}</label>
        ${html}
      </div>
    `;
  }

  function createToggle(label, id, checked) {
    return `
      <label class="factory-toggle-row" for="${id}">
        <span>${label}</span>
        <input id="${id}" type="checkbox" ${checked ? "checked" : ""} />
      </label>
    `;
  }

  function fontOptions(selected) {
    return Fonts.listAll()
      .map((f) => `<option value="${f.value.replace(/"/g, "&quot;")}" ${f.value === selected ? "selected" : ""}>${f.label}</option>`)
      .join("");
  }

  function renderElementSection(key, cfg) {
    const label = Config.ELEMENT_LABELS[key];
    const prefix = `clock-${key}`;
    return `
      <div class="clock-factory-section ${activeTab === key ? "active" : ""}" data-clock-section="${key}">
        <div class="factory-toggle-group">
          ${createToggle(`Exibir ${label.toLowerCase()}`, `${prefix}-visible`, cfg.visible !== false)}
        </div>
        <div class="factory-grid">
          ${createField("Posicao X (%)", `<input id="${prefix}-x" type="range" min="0" max="100" value="${cfg.x}" /><span class="factory-field-value" data-clock-value="${prefix}-x">${cfg.x}%</span>`)}
          ${createField("Posicao Y (%)", `<input id="${prefix}-y" type="range" min="0" max="100" value="${cfg.y}" /><span class="factory-field-value" data-clock-value="${prefix}-y">${cfg.y}%</span>`)}
          ${createField("Largura (%)", `<input id="${prefix}-width" type="range" min="10" max="100" value="${cfg.width}" /><span class="factory-field-value" data-clock-value="${prefix}-width">${cfg.width}%</span>`)}
          ${createField("Altura (%)", `<input id="${prefix}-height" type="range" min="8" max="100" value="${cfg.height}" /><span class="factory-field-value" data-clock-value="${prefix}-height">${cfg.height}%</span>`)}
          ${createField("Tamanho da fonte", `<input id="${prefix}-fontSize" type="range" min="8" max="96" value="${cfg.fontSize}" /><span class="factory-field-value" data-clock-value="${prefix}-fontSize">${cfg.fontSize}px</span>`)}
          ${createField("Cor da fonte", `<input id="${prefix}-color" type="color" value="${cfg.color}" />`)}
          ${createField("Transparencia", `<input id="${prefix}-opacity" type="range" min="0" max="100" value="${cfg.opacity}" /><span class="factory-field-value" data-clock-value="${prefix}-opacity">${cfg.opacity}%</span>`)}
          ${createField("Tipografia", `
            <select id="${prefix}-fontFamily">${fontOptions(cfg.fontFamily)}</select>
            <div class="clock-factory-import-row">
              <button type="button" class="clock-factory-import-btn" data-clock-import="${prefix}">Importar fonte</button>
              <input type="file" class="clock-factory-import-input" data-clock-import-input="${prefix}" accept=".otf,.ttf,.woff,.woff2" />
              <span class="clock-factory-status" data-clock-import-status="${prefix}"></span>
            </div>
          `)}
          ${createField("Peso da fonte", `
            <select id="${prefix}-fontWeight">
              ${[300, 400, 500, 600, 700, 800].map((w) => `<option value="${w}" ${Number(cfg.fontWeight) === w ? "selected" : ""}>${w}</option>`).join("")}
            </select>
          `)}
          ${createField("Alinhamento", `
            <div class="clock-factory-align-group" data-clock-align-group="${prefix}">
              ${["left", "center", "right"].map((align) => `
                <button type="button" class="clock-factory-align-btn ${cfg.textAlign === align ? "active" : ""}" data-clock-align="${prefix}" data-align-value="${align}">${align === "left" ? "Esq." : align === "center" ? "Centro" : "Dir."}</button>
              `).join("")}
            </div>
            <input type="hidden" id="${prefix}-textAlign" value="${cfg.textAlign || "center"}" />
          `)}
        </div>
      </div>
    `;
  }

  function renderBackgroundSection(bg) {
    return `
      <div class="clock-factory-section ${activeTab === "background" ? "active" : ""}" data-clock-section="background">
        <div class="factory-toggle-group">
          ${createToggle("Ativar fundo", "clock-bg-enabled", bg.enabled !== false)}
        </div>
        <div class="factory-grid">
          ${createField("Cor do fundo", `<input id="clock-bg-color" type="color" value="${bg.color}" />`)}
          ${createField("Transparencia", `<input id="clock-bg-opacity" type="range" min="0" max="100" value="${bg.opacity}" /><span class="factory-field-value" data-clock-value="clock-bg-opacity">${bg.opacity}%</span>`)}
          ${createField("Posicao X (%)", `<input id="clock-bg-x" type="range" min="0" max="100" value="${bg.x ?? 0}" /><span class="factory-field-value" data-clock-value="clock-bg-x">${bg.x ?? 0}%</span>`)}
          ${createField("Posicao Y (%)", `<input id="clock-bg-y" type="range" min="0" max="100" value="${bg.y ?? 0}" /><span class="factory-field-value" data-clock-value="clock-bg-y">${bg.y ?? 0}%</span>`)}
          ${createField("Largura (%)", `<input id="clock-bg-width" type="range" min="10" max="100" value="${bg.width ?? 100}" /><span class="factory-field-value" data-clock-value="clock-bg-width">${bg.width ?? 100}%</span>`)}
          ${createField("Altura (%)", `<input id="clock-bg-height" type="range" min="10" max="100" value="${bg.height ?? 100}" /><span class="factory-field-value" data-clock-value="clock-bg-height">${bg.height ?? 100}%</span>`)}
          ${createField("Bordas arredondadas", `<input id="clock-bg-borderRadius" type="range" min="0" max="50" value="${bg.borderRadius}" /><span class="factory-field-value" data-clock-value="clock-bg-borderRadius">${bg.borderRadius}px</span>`)}
        </div>
      </div>
    `;
  }

  function renderPanel(container, ctx) {
    panelRoot = container;
    currentRecord = ctx.record;
    onChangeCallback = ctx.onUpdate;
    targetElRef = ctx.targetEl;
    activeTab = "time";

    const clock = Config.readFromRecord(currentRecord);

    container.innerHTML = `
      <section class="factory-panel factory-panel--clock">
        <h4>Clock — Elementos</h4>
        <div class="clock-factory-tabs">
          ${Config.ELEMENT_KEYS.map((key) => `
            <button type="button" class="clock-factory-tab ${activeTab === key ? "active" : ""}" data-clock-tab="${key}">${Config.ELEMENT_LABELS[key]}</button>
          `).join("")}
          <button type="button" class="clock-factory-tab ${activeTab === "background" ? "active" : ""}" data-clock-tab="background">Fundo</button>
        </div>
        ${Config.ELEMENT_KEYS.map((key) => renderElementSection(key, clock.elements[key])).join("")}
        ${renderBackgroundSection(clock.background)}
      </section>
    `;

    bindPanelEvents(container);
  }

  function switchTab(tab) {
    activeTab = tab;
    if (!panelRoot) return;
    panelRoot.querySelectorAll("[data-clock-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.clockTab === tab);
    });
    panelRoot.querySelectorAll("[data-clock-section]").forEach((sec) => {
      sec.classList.toggle("active", sec.dataset.clockSection === tab);
    });
  }

  function readElement(key) {
    const prefix = `clock-${key}`;
    const get = (id) => panelRoot.querySelector(`#${id}`);
    return {
      visible: !!get(`${prefix}-visible`)?.checked,
      x: Number(get(`${prefix}-x`)?.value ?? 0),
      y: Number(get(`${prefix}-y`)?.value ?? 0),
      width: Number(get(`${prefix}-width`)?.value ?? 50),
      height: Number(get(`${prefix}-height`)?.value ?? 20),
      fontSize: Number(get(`${prefix}-fontSize`)?.value ?? 14),
      color: get(`${prefix}-color`)?.value || "#ffffff",
      opacity: Number(get(`${prefix}-opacity`)?.value ?? 100),
      fontFamily: get(`${prefix}-fontFamily`)?.value || "inherit",
      fontWeight: Number(get(`${prefix}-fontWeight`)?.value ?? 500),
      textAlign: get(`${prefix}-textAlign`)?.value || "center"
    };
  }

  function readBackground() {
    return {
      enabled: !!panelRoot.querySelector("#clock-bg-enabled")?.checked,
      color: panelRoot.querySelector("#clock-bg-color")?.value || "#121828",
      opacity: Number(panelRoot.querySelector("#clock-bg-opacity")?.value ?? 85),
      borderRadius: Number(panelRoot.querySelector("#clock-bg-borderRadius")?.value ?? 14),
      x: Number(panelRoot.querySelector("#clock-bg-x")?.value ?? 0),
      y: Number(panelRoot.querySelector("#clock-bg-y")?.value ?? 0),
      width: Number(panelRoot.querySelector("#clock-bg-width")?.value ?? 100),
      height: Number(panelRoot.querySelector("#clock-bg-height")?.value ?? 100)
    };
  }

  function readClockFromPanel() {
    const elements = {};
    Config.ELEMENT_KEYS.forEach((key) => {
      elements[key] = readElement(key);
    });
    return { elements, background: readBackground() };
  }

  function updateValueLabels() {
    if (!panelRoot) return;
    panelRoot.querySelectorAll("[data-clock-value]").forEach((el) => {
      const id = el.getAttribute("data-clock-value");
      const input = panelRoot.querySelector(`#${id}`);
      if (!input) return;
      if (id.includes("opacity") && !id.includes("fontSize")) {
        el.textContent = `${input.value}%`;
      } else if (id.includes("borderRadius")) {
        el.textContent = `${input.value}px`;
      } else if (id.includes("fontSize")) {
        el.textContent = `${input.value}px`;
      } else if (id.includes("-x") || id.includes("-y") || id.includes("-width") || id.includes("-height")) {
        el.textContent = `${input.value}%`;
      }
    });
  }

  function emitChange() {
    if (typeof onChangeCallback !== "function") return;
    const clock = readClockFromPanel();
    onChangeCallback({ clock });
    if (targetElRef) {
      applyToElement(targetElRef, { clock });
    }
  }

  function refreshFontSelects(selectedValue) {
    if (!panelRoot) return;
    Config.ELEMENT_KEYS.forEach((key) => {
      const select = panelRoot.querySelector(`#clock-${key}-fontFamily`);
      if (!select) return;
      const current = selectedValue || select.value;
      select.innerHTML = fontOptions(current);
    });
  }

  function bindPanelEvents(container) {
    container.addEventListener("click", (event) => {
      const tabBtn = event.target.closest("[data-clock-tab]");
      if (tabBtn) {
        switchTab(tabBtn.dataset.clockTab);
        return;
      }

      const alignBtn = event.target.closest("[data-clock-align]");
      if (alignBtn) {
        const prefix = alignBtn.dataset.clockAlign;
        const value = alignBtn.dataset.alignValue;
        const hidden = container.querySelector(`#${prefix}-textAlign`);
        if (hidden) hidden.value = value;
        container.querySelectorAll(`[data-clock-align="${prefix}"]`).forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.alignValue === value);
        });
        emitChange();
        return;
      }

      const importBtn = event.target.closest("[data-clock-import]");
      if (importBtn) {
        const prefix = importBtn.dataset.clockImport;
        const input = container.querySelector(`[data-clock-import-input="${prefix}"]`);
        if (input) input.click();
      }
    });

    container.addEventListener("change", async (event) => {
      const fileInput = event.target.closest("[data-clock-import-input]");
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const prefix = fileInput.dataset.clockImportInput;
        const status = container.querySelector(`[data-clock-import-status="${prefix}"]`);
        try {
          if (status) status.textContent = "Importando...";
          const imported = await Fonts.importFile(fileInput.files[0]);
          refreshFontSelects(imported.value);
          const select = container.querySelector(`#${prefix}-fontFamily`);
          if (select) select.value = imported.value;
          if (status) status.textContent = `"${imported.name}" adicionada.`;
          emitChange();
        } catch (err) {
          if (status) status.textContent = err.message || "Erro ao importar.";
        }
        fileInput.value = "";
        return;
      }
      updateValueLabels();
      emitChange();
    });

    container.addEventListener("input", () => {
      updateValueLabels();
      emitChange();
    });
  }

  function applyToElement(el, record) {
    const clock = Config.readFromRecord(record);
    Render.applyToWidget(el, clock);
    const body = el.querySelector(".floating-widget-body");
    if (body) {
      body.dispatchEvent(new CustomEvent("autotune-clock-config", { bubbles: false }));
    }
  }

  function applyToPreviewClone(clone, record) {
    applyToElement(clone, record);
  }

  function destroyPanel() {
    panelRoot = null;
    onChangeCallback = null;
    targetElRef = null;
  }

  window.AutoTuneFactoryPlugins[KEY] = {
    hideDefaultVisual: true,
    hideDefaultCustom: true,
    renderPanel,
    destroyPanel,
    applyToElement,
    applyToPreviewClone,
    readFromPanel: readClockFromPanel
  };
})();
