(function () {
  const STORE_KEY = "autotuneFactorySettings";
  const STYLE_NODE_PREFIX = "factory-style-";
  const DEFAULT_VISUAL = {
    primaryColor: "#7a8cff",
    intensity: 60,
    objectOpacity: 100,
    backgroundOpacity: 85,
    textOpacity: 100,
    borderRadius: 14,
    minWidth: 160,
    minHeight: 100,
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 500,
    backgroundEnabled: true,
    borderEnabled: true
  };
  const FONTS = [
    { label: "Padrao", value: "inherit" },
    { label: "Segoe UI", value: '"Segoe UI", sans-serif' },
    { label: "Inter", value: "Inter, sans-serif" },
    { label: "Roboto", value: "Roboto, sans-serif" },
    { label: "Monospace", value: 'ui-monospace, SFMono-Regular, Menlo, monospace' }
  ];
  const CUSTOM_CONFIG = {
    "autotune-widget-timer": [
      { id: "timerDisplaySize", label: "Fonte do cronometro", min: 20, max: 78, value: 32, unit: "px", selector: ".autotune-timer-display", property: "fontSize" },
      { id: "timerButtonsGap", label: "Espaco dos botoes", min: 2, max: 26, value: 6, unit: "px", selector: ".autotune-timer-actions", property: "gap" },
      { id: "timerButtonsRadius", label: "Borda dos botoes", min: 4, max: 22, value: 8, unit: "px", selector: ".autotune-timer-btn", property: "borderRadius" }
    ],
    "autotune-widget-share": [
      { id: "shareUrlHeight", label: "Altura da area do link", min: 50, max: 220, value: 72, unit: "px", selector: ".autotune-share-url", property: "maxHeight" },
      { id: "shareHintOpacity", label: "Opacidade do subtitulo", min: 10, max: 100, value: 65, unit: "%", selector: ".autotune-share-hint", property: "opacity", transform: (n) => String(n / 100) },
      { id: "shareButtonRadius", label: "Borda do botao copiar", min: 4, max: 22, value: 8, unit: "px", selector: ".autotune-share-copy", property: "borderRadius" }
    ]
  };

  let overlay;
  let targetEl = null;
  let targetLabel = "Componente";
  let targetKey = "global";
  let activeStage = "visual";
  let cssEditor;
  let htmlReadonly;
  let infoLabel;
  let previewRoots = [];
  let previewStyleTags = [];
  let controls = {};
  let customContainer;
  let customControls = {};
  let stageButtons = [];
  let stages = {};

  function readStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_err) {
      return {};
    }
  }

  function writeStore(next) {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  }

  function getRecord(key) {
    const store = readStore();
    return store[key] || { visual: { ...DEFAULT_VISUAL }, css: "", custom: {} };
  }

  function updateRecord(key, patch) {
    const store = readStore();
    const current = store[key] || { visual: { ...DEFAULT_VISUAL }, css: "", custom: {} };
    store[key] = { ...current, ...patch };
    writeStore(store);
  }

  function isAutoTuneKey(key) {
    return typeof key === "string" && key.startsWith("autotune-");
  }

  function sanitizeStoreForAutoTune() {
    const store = readStore();
    const clean = {};
    Object.keys(store).forEach((key) => {
      if (isAutoTuneKey(key)) {
        clean[key] = store[key];
      }
    });
    writeStore(clean);
  }

  function removeLegacyStyleNodes() {
    document.querySelectorAll(`[id^="${STYLE_NODE_PREFIX}"]`).forEach((node) => {
      if (node.id.includes("autotune-")) return;
      node.remove();
    });
  }

  function slug(input) {
    return (input || "component")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function buildElementKey(el) {
    if (!el) return "global";
    if (el.dataset && el.dataset.factoryKey) return el.dataset.factoryKey;
    if (el.id) return `id-${slug(el.id)}`;
    if (el.className && typeof el.className === "string") return `class-${slug(el.className.split(" ")[0])}`;
    return `node-${slug(el.tagName || "div")}`;
  }

  function parseColor(input, fallback) {
    if (!input) return fallback || { r: 122, g: 140, b: 255 };
    if (input.startsWith("#")) {
      const hex = input.replace("#", "");
      const full = hex.length === 3 ? hex.split("").map((ch) => ch + ch).join("") : hex;
      const value = parseInt(full, 16);
      if (Number.isNaN(value)) return fallback || { r: 122, g: 140, b: 255 };
      return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
    }
    const match = input.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!match) return fallback || { r: 122, g: 140, b: 255 };
    return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
  }

  function rgba(rgb, alpha01) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, Math.min(1, alpha01))})`;
  }

  function ensureScope(el, key) {
    if (!el || !el.dataset) return;
    el.dataset.factoryScope = slug(key);
  }

  function getScopedSelector(key) {
    return `[data-factory-scope="${slug(key)}"]`;
  }

  function ensureStyleNode(key) {
    const id = `${STYLE_NODE_PREFIX}${slug(key)}`;
    let styleNode = document.getElementById(id);
    if (!styleNode) {
      styleNode = document.createElement("style");
      styleNode.id = id;
      document.head.appendChild(styleNode);
    }
    return styleNode;
  }

  function getCustomSchemaForKey(key) {
    return CUSTOM_CONFIG[key] || [];
  }

  function applyVisualStyles(el, visual) {
    if (!el) return;
    const primary = parseColor(visual.primaryColor, { r: 122, g: 140, b: 255 });
    const computed = window.getComputedStyle(el);
    const textBase = parseColor(computed.color, primary);
    const objectOpacity = Number(visual.objectOpacity) / 100;
    const backgroundOpacity = Number(visual.backgroundOpacity) / 100;
    const textOpacity = Number(visual.textOpacity) / 100;
    const intensity = Math.max(0, Math.min(100, Number(visual.intensity)));
    const backgroundEnabled = visual.backgroundEnabled !== false;
    const borderEnabled = visual.borderEnabled !== false;

    el.style.opacity = String(objectOpacity);
    el.style.backgroundColor = backgroundEnabled ? rgba(primary, backgroundOpacity) : "transparent";
    el.style.color = rgba(textBase, textOpacity);
    el.style.borderRadius = `${Number(visual.borderRadius) || 0}px`;
    el.style.minWidth = `${Number(visual.minWidth) || DEFAULT_VISUAL.minWidth}px`;
    el.style.minHeight = `${Number(visual.minHeight) || DEFAULT_VISUAL.minHeight}px`;
    el.style.fontFamily = visual.fontFamily || DEFAULT_VISUAL.fontFamily;
    el.style.fontSize = `${Number(visual.fontSize) || DEFAULT_VISUAL.fontSize}px`;
    el.style.fontWeight = String(Number(visual.fontWeight) || DEFAULT_VISUAL.fontWeight);
    if (borderEnabled) {
      el.style.border = `1px solid ${rgba(primary, Math.max(0.2, intensity / 100))}`;
      el.style.boxShadow = `0 0 ${Math.max(6, Math.round(intensity * 0.45))}px ${rgba(primary, Math.max(0.2, intensity / 200))}`;
    } else {
      el.style.border = "none";
      el.style.boxShadow = "none";
    }
  }

  function applyCustomStyles(el, key, customData) {
    if (!el) return;
    Object.values(CUSTOM_CONFIG).forEach((schema) => {
      schema.forEach((item) => {
        el.querySelectorAll(item.selector).forEach((node) => {
          node.style[item.property] = "";
        });
      });
    });
    const schema = getCustomSchemaForKey(key);
    if (schema.length === 0) return;
    schema.forEach((item) => {
      const rawValue = Number(customData[item.id] ?? item.value);
      const transformed = typeof item.transform === "function" ? item.transform(rawValue) : `${rawValue}${item.unit === "%" ? "" : item.unit}`;
      el.querySelectorAll(item.selector).forEach((node) => {
        node.style[item.property] = transformed;
      });
    });
  }

  function applyCssForKey(key, cssText) {
    const styleNode = ensureStyleNode(key);
    styleNode.textContent = cssText || "";
  }

  function mirrorPreviewCss(cssText) {
    previewStyleTags.forEach((styleNode) => {
      styleNode.textContent = cssText || "";
    });
  }

  function ensureAutoTuneFactoryTriggers() {
    document.querySelectorAll(".autotune-row-factory-btn").forEach((btn) => {
      const type = btn.dataset.factoryTarget?.includes('"timer"') ? "timer" : "share";
      btn.dataset.openFactory = "true";
      btn.dataset.factoryKey = `autotune-widget-${type}`;
      btn.dataset.factoryLabel = `AutoTune ${type === "timer" ? "Timer" : "Share"}`;
    });
  }

  function resetTriggerButtonsVisualState() {
    document.querySelectorAll(".autotune-row-factory-btn").forEach((btn) => {
      btn.style.opacity = "";
      btn.style.backgroundColor = "";
      btn.style.color = "";
      btn.style.borderRadius = "";
      btn.style.minWidth = "";
      btn.style.minHeight = "";
      btn.style.fontFamily = "";
      btn.style.fontSize = "";
      btn.style.fontWeight = "";
      btn.style.border = "";
      btn.style.boxShadow = "";
    });
  }

  function createField(label, controlHtml) {
    return `
      <div class="factory-field">
        <label>${label}</label>
        ${controlHtml}
      </div>
    `;
  }

  function createToggleField(label, id, checked) {
    return `
      <label class="factory-toggle-row" for="${id}">
        <span>${label}</span>
        <input id="${id}" type="checkbox" ${checked ? "checked" : ""} />
      </label>
    `;
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "factory-overlay";
    overlay.innerHTML = `
      <div class="factory-modal" role="dialog" aria-modal="true" aria-label="Factory">
        <div class="factory-header">
          <div class="factory-title-wrap">
            <h3>Factory</h3>
            <p id="factoryTargetInfo">Componente alvo</p>
          </div>
          <button type="button" class="factory-close-btn" data-factory-close="true" aria-label="Fechar">×</button>
        </div>
        <div class="factory-stage-tabs">
          <button type="button" class="factory-stage-btn active" data-stage-btn="visual">Stage 1 - Visual</button>
          <button type="button" class="factory-stage-btn" data-stage-btn="code">Stage 2 - CSS/SCSS</button>
        </div>
        <div class="factory-body">
          <section class="factory-stage factory-stage-visual active" data-stage="visual">
            <div class="factory-stage1-layout">
              <div class="factory-stage1-controls">
                <section class="factory-panel">
                  <h4>Cosmeticos padrao</h4>
                  <div class="factory-grid">
                    ${createField("Cor principal", '<input id="factoryPrimaryColor" type="color" value="#7a8cff" /><input id="factoryIntensity" type="range" min="0" max="100" value="60" /><span class="factory-field-value" data-value-for="factoryIntensity">60%</span>')}
                    ${createField("Transparencia do objeto", '<input id="factoryObjectOpacity" type="range" min="0" max="100" value="100" /><span class="factory-field-value" data-value-for="factoryObjectOpacity">100%</span>')}
                    ${createField("Transparencia do fundo", '<input id="factoryBackgroundOpacity" type="range" min="0" max="100" value="85" /><span class="factory-field-value" data-value-for="factoryBackgroundOpacity">85%</span>')}
                    ${createField("Transparencia das letras", '<input id="factoryTextOpacity" type="range" min="0" max="100" value="100" /><span class="factory-field-value" data-value-for="factoryTextOpacity">100%</span>')}
                    ${createField("Arredondamento", '<input id="factoryBorderRadius" type="range" min="0" max="50" value="14" /><span class="factory-field-value" data-value-for="factoryBorderRadius">14px</span>')}
                    ${createField("Tamanho minimo (largura)", '<input id="factoryMinWidth" type="range" min="80" max="760" value="160" /><span class="factory-field-value" data-value-for="factoryMinWidth">160px</span>')}
                    ${createField("Tamanho minimo (altura)", '<input id="factoryMinHeight" type="range" min="40" max="500" value="100" /><span class="factory-field-value" data-value-for="factoryMinHeight">100px</span>')}
                    ${createField("Tipografia", `
                      <select id="factoryFontFamily">
                        ${FONTS.map((font) => `<option value="${font.value}">${font.label}</option>`).join("")}
                      </select>
                      <select id="factoryFontSize">
                        ${[11, 12, 13, 14, 16, 18, 20, 24].map((size) => `<option value="${size}">${size}px</option>`).join("")}
                      </select>
                      <select id="factoryFontWeight">
                        ${[300, 400, 500, 600, 700, 800].map((weight) => `<option value="${weight}">${weight}</option>`).join("")}
                      </select>
                    `)}
                  </div>
                  <div class="factory-toggle-group">
                    ${createToggleField("Ativar fundo", "factoryBackgroundEnabled", true)}
                    ${createToggleField("Ativar bordas", "factoryBorderEnabled", true)}
                  </div>
                </section>
                <section class="factory-panel">
                  <h4>Personalizacao do componente</h4>
                  <div id="factoryCustomControls" class="factory-grid"></div>
                </section>
              </div>
              <div class="factory-stage1-preview">
                <div class="factory-pane-header">
                  <strong>Preview em tempo real</strong>
                </div>
                <div class="factory-preview" data-factory-preview="stage1"></div>
              </div>
            </div>
          </section>
          <section class="factory-stage factory-stage-code" data-stage="code">
            <div class="factory-code-pane">
              <div class="factory-pane-header">
                <strong>Editor CSS/SCSS</strong>
                <button type="button" class="factory-inject-html" id="factoryInjectHtml">Injetar Estrutura HTML</button>
              </div>
              <textarea class="factory-css-editor" id="factoryCssEditor" spellcheck="false" placeholder="/* CSS ou SCSS */"></textarea>
            </div>
            <div class="factory-preview-pane">
              <div class="factory-pane-header">
                <strong>Componente vivo</strong>
              </div>
              <div class="factory-preview" data-factory-preview="stage2"></div>
            </div>
            <div class="factory-html-pane">
              <div class="factory-pane-header">
                <strong>HTML (somente leitura)</strong>
              </div>
              <pre class="factory-html-readonly" id="factoryHtmlReadonly"></pre>
            </div>
          </section>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    infoLabel = overlay.querySelector("#factoryTargetInfo");
    cssEditor = overlay.querySelector("#factoryCssEditor");
    htmlReadonly = overlay.querySelector("#factoryHtmlReadonly");
    customContainer = overlay.querySelector("#factoryCustomControls");
    previewRoots = Array.from(overlay.querySelectorAll("[data-factory-preview]"));
    stageButtons = Array.from(overlay.querySelectorAll("[data-stage-btn]"));
    stages = {
      visual: overlay.querySelector('[data-stage="visual"]'),
      code: overlay.querySelector('[data-stage="code"]')
    };
    controls = {
      primaryColor: overlay.querySelector("#factoryPrimaryColor"),
      intensity: overlay.querySelector("#factoryIntensity"),
      objectOpacity: overlay.querySelector("#factoryObjectOpacity"),
      backgroundOpacity: overlay.querySelector("#factoryBackgroundOpacity"),
      textOpacity: overlay.querySelector("#factoryTextOpacity"),
      borderRadius: overlay.querySelector("#factoryBorderRadius"),
      minWidth: overlay.querySelector("#factoryMinWidth"),
      minHeight: overlay.querySelector("#factoryMinHeight"),
      fontFamily: overlay.querySelector("#factoryFontFamily"),
      fontSize: overlay.querySelector("#factoryFontSize"),
      fontWeight: overlay.querySelector("#factoryFontWeight"),
      backgroundEnabled: overlay.querySelector("#factoryBackgroundEnabled"),
      borderEnabled: overlay.querySelector("#factoryBorderEnabled")
    };
    bindOverlayEvents();
  }

  function renderCustomControls(record) {
    if (!customContainer) return;
    customContainer.innerHTML = "";
    customControls = {};
    const schema = getCustomSchemaForKey(targetKey);
    if (schema.length === 0) {
      customContainer.innerHTML = `<div class="factory-empty-note">Esse componente nao possui personalizacoes adicionais.</div>`;
      return;
    }
    schema.forEach((item) => {
      const value = Number(record?.custom?.[item.id] ?? item.value);
      const field = document.createElement("div");
      field.className = "factory-field";
      field.innerHTML = `
        <label>${item.label}</label>
        <input type="range" id="factoryCustom-${item.id}" min="${item.min}" max="${item.max}" value="${value}" />
        <span class="factory-field-value" data-value-for-custom="${item.id}">${value}${item.unit}</span>
      `;
      customContainer.appendChild(field);
      const input = field.querySelector("input");
      const valueEl = field.querySelector("[data-value-for-custom]");
      customControls[item.id] = { input, valueEl, item };
      input.addEventListener("input", () => {
        valueEl.textContent = `${input.value}${item.unit}`;
        applyCurrentVisual();
      });
      input.addEventListener("change", applyCurrentVisual);
    });
  }

  function switchStage(stage) {
    activeStage = stage === "code" ? "code" : "visual";
    stageButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.stageBtn === activeStage);
    });
    Object.keys(stages).forEach((name) => {
      stages[name].classList.toggle("active", name === activeStage);
    });
  }

  function updateRangeLabels() {
    const units = {
      factoryIntensity: "%",
      factoryObjectOpacity: "%",
      factoryBackgroundOpacity: "%",
      factoryTextOpacity: "%",
      factoryBorderRadius: "px",
      factoryMinWidth: "px",
      factoryMinHeight: "px"
    };
    overlay.querySelectorAll("[data-value-for]").forEach((el) => {
      const id = el.getAttribute("data-value-for");
      const input = overlay.querySelector(`#${id}`);
      if (!input) return;
      const unit = units[id] || "";
      el.textContent = `${input.value}${unit}`;
    });
  }

  function readVisualFromControls() {
    return {
      primaryColor: controls.primaryColor.value,
      intensity: Number(controls.intensity.value),
      objectOpacity: Number(controls.objectOpacity.value),
      backgroundOpacity: Number(controls.backgroundOpacity.value),
      textOpacity: Number(controls.textOpacity.value),
      borderRadius: Number(controls.borderRadius.value),
      minWidth: Number(controls.minWidth.value),
      minHeight: Number(controls.minHeight.value),
      fontFamily: controls.fontFamily.value,
      fontSize: Number(controls.fontSize.value),
      fontWeight: Number(controls.fontWeight.value),
      backgroundEnabled: !!controls.backgroundEnabled.checked,
      borderEnabled: !!controls.borderEnabled.checked
    };
  }

  function readCustomFromControls() {
    const out = {};
    Object.keys(customControls).forEach((key) => {
      out[key] = Number(customControls[key].input.value);
    });
    return out;
  }

  function paintPreview() {
    if (previewRoots.length === 0 || !targetEl) return;
    previewStyleTags = [];
    const record = getRecord(targetKey);
    const visual = { ...DEFAULT_VISUAL, ...(record.visual || {}) };
    const custom = record.custom || {};
    previewRoots.forEach((root) => {
      root.innerHTML = "";
      const clone = targetEl.cloneNode(true);
      root.appendChild(clone);
      const styleNode = document.createElement("style");
      root.appendChild(styleNode);
      previewStyleTags.push(styleNode);
      applyVisualStyles(clone, visual);
      applyCustomStyles(clone, targetKey, custom);
    });
    mirrorPreviewCss(record.css || "");
  }

  function setControlsFromRecord(record) {
    const visual = { ...DEFAULT_VISUAL, ...(record.visual || {}) };
    Object.keys(controls).forEach((key) => {
      const control = controls[key];
      if (!control) return;
      if (control.type === "checkbox") {
        control.checked = !!visual[key];
      } else {
        control.value = String(visual[key]);
      }
    });
    updateRangeLabels();
  }

  function applyCurrentVisual() {
    const visual = readVisualFromControls();
    const custom = readCustomFromControls();
    if (targetEl) {
      ensureScope(targetEl, targetKey);
      applyVisualStyles(targetEl, visual);
      applyCustomStyles(targetEl, targetKey, custom);
    }
    updateRecord(targetKey, { visual, custom });
    paintPreview();
  }

  function serializeTargetHtml(el) {
    if (!el) return "<!-- componente nao encontrado -->";
    return el.outerHTML || "<!-- sem HTML -->";
  }

  function resolveTargetFromTrigger(trigger) {
    const selector = trigger?.dataset?.factoryTarget;
    const direct = selector ? document.querySelector(selector) : null;
    if (direct) return direct;
    if (trigger && trigger.closest(".floating-widget")) return trigger.closest(".floating-widget");
    return null;
  }

  function openFactory(options) {
    ensureOverlay();
    const trigger = options?.trigger || null;
    targetEl = options?.target || resolveTargetFromTrigger(trigger);
    targetLabel = options?.label || trigger?.dataset?.factoryLabel || targetEl?.dataset?.widgetType || "Componente";
    targetKey = options?.key || trigger?.dataset?.factoryKey || buildElementKey(targetEl);
    if (!isAutoTuneKey(targetKey) || !targetEl) return;
    if (targetEl.dataset) targetEl.dataset.factoryKey = targetKey;
    ensureScope(targetEl, targetKey);

    const record = getRecord(targetKey);
    setControlsFromRecord(record);
    renderCustomControls(record);
    cssEditor.value = record.css || "";
    htmlReadonly.textContent = serializeTargetHtml(targetEl);
    infoLabel.textContent = `${targetLabel} • key: ${targetKey}`;

    applyVisualStyles(targetEl, { ...DEFAULT_VISUAL, ...(record.visual || {}) });
    applyCustomStyles(targetEl, targetKey, record.custom || {});
    applyCssForKey(targetKey, record.css || "");
    paintPreview();
    switchStage(activeStage);
    overlay.classList.add("is-open");
  }

  function closeFactory() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
  }

  function injectHtmlReference() {
    if (!cssEditor || !targetEl) return;
    const selector = getScopedSelector(targetKey);
    const html = serializeTargetHtml(targetEl);
    const block = `\n/* Estrutura HTML (somente referencia)\n${html}\n*/\n\n${selector} {\n  /* escreva seu CSS aqui */\n}\n`;
    if (cssEditor.value.includes("Estrutura HTML")) return;
    cssEditor.value = `${cssEditor.value}${block}`.trim();
    const css = cssEditor.value;
    updateRecord(targetKey, { css });
    applyCssForKey(targetKey, css);
    mirrorPreviewCss(css);
  }

  function onEditorInput() {
    const css = cssEditor.value;
    updateRecord(targetKey, { css });
    applyCssForKey(targetKey, css);
    mirrorPreviewCss(css);
  }

  function bindOverlayEvents() {
    overlay.addEventListener("click", (event) => {
      const closeTrigger = event.target.closest("[data-factory-close='true']");
      if (closeTrigger || event.target === overlay) closeFactory();
    });

    stageButtons.forEach((button) => {
      button.addEventListener("click", () => {
        switchStage(button.dataset.stageBtn);
      });
    });

    Object.values(controls).forEach((input) => {
      input.addEventListener("input", () => {
        updateRangeLabels();
        applyCurrentVisual();
      });
      input.addEventListener("change", applyCurrentVisual);
    });

    cssEditor.addEventListener("input", onEditorInput);
    overlay.querySelector("#factoryInjectHtml").addEventListener("click", injectHtmlReference);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) closeFactory();
    });
  }

  function onGlobalClick(event) {
    const trigger = event.target.closest("[data-open-factory='true']");
    if (!trigger) return;
    const key = trigger.dataset.factoryKey || "";
    if (!isAutoTuneKey(key)) return;
    event.preventDefault();
    event.stopPropagation();
    openFactory({ trigger });
  }

  function applyAllPersisted() {
    const store = readStore();
    Object.keys(store).forEach((key) => {
      if (!isAutoTuneKey(key)) return;
      const record = store[key] || {};
      applyCssForKey(key, record.css || "");
      const selector = `.floating-widget[data-factory-key="${key}"]`;
      document.querySelectorAll(selector).forEach((el) => {
        ensureScope(el, key);
        applyVisualStyles(el, { ...DEFAULT_VISUAL, ...(record.visual || {}) });
        applyCustomStyles(el, key, record.custom || {});
      });
    });
  }

  function applyPersistedToElement(el) {
    if (!el) return;
    const key = buildElementKey(el);
    if (!isAutoTuneKey(key)) return;
    const store = readStore();
    const record = store[key];
    if (!record) return;
    ensureScope(el, key);
    applyVisualStyles(el, { ...DEFAULT_VISUAL, ...(record.visual || {}) });
    applyCustomStyles(el, key, record.custom || {});
    applyCssForKey(key, record.css || "");
  }

  function boot() {
    ensureAutoTuneFactoryTriggers();
    resetTriggerButtonsVisualState();
    ensureOverlay();
    sanitizeStoreForAutoTune();
    removeLegacyStyleNodes();
    document.addEventListener("click", onGlobalClick);
    applyAllPersisted();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.AutoTuneFactory = {
    open: openFactory,
    close: closeFactory,
    applyAllPersisted,
    applyPersistedToElement
  };
})();
