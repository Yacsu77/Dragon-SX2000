/**
 * Customise — catálogo de objetos da UI (estilo AutoTune, sem toggle on/off).
 * Cada linha abre o Customise Factory para editar aquele objeto.
 *
 * Persistência: localStorage `customiseSettings`
 * Chave do Radial Menu: `customise-radial-menu`
 */
(function () {
  if (window.Customise) return;

  const STORE_KEY = "customiseSettings";
  const RADIAL_KEY = "customise-radial-menu";
  const SEARCH_KEY = "customise-search-palette";
  const DEFAULT_RADIAL = {
    color: "#7a8cff",
    size: 280,
    items: ["wallpaper", "tema", "autotune", "customise", "donate"],
  };
  const DEFAULT_SEARCH = {
    color: "#7a8cff",
    width: 640,
    backgroundOpacity: 92,
    placeholder: "Pesquisar na web ou colar URL…",
  };

  /** Fallback local — não depende do RadialMenu já ter carregado. */
  const IDGET_CATALOG = [
    { id: "wallpaper", label: "Wallpaper", icon: "image", description: "Abrir seletor de wallpaper" },
    { id: "tema", label: "Tema", icon: "moon", description: "Alternar tema claro/escuro/sistema" },
    { id: "customise", label: "Customise", icon: "sliders", description: "Abrir painel Customise" },
    { id: "donate", label: "Donate", icon: "heart", description: "Donate (em breve)" },
    { id: "autotune", label: "AutoTune", icon: "sparkles", description: "Abrir catálogo AutoTune" },
  ];

  let catalogBound = false;
  let factoryOverlay = null;
  let factoryKey = null;
  let factoryLabel = "Objeto";
  let draft = null;
  let dragId = null;
  let initialized = false;
  let closingCatalog = false;

  function readStore() {
    try {
      const raw = (window.UserStorage ? window.UserStorage.getItem(STORE_KEY) : localStorage.getItem(STORE_KEY));
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeStore(next) {
    (window.UserStorage ? window.UserStorage.setItem(STORE_KEY, JSON.stringify(next)) : localStorage.setItem(STORE_KEY, JSON.stringify(next)));
  }

  function getRecord(key) {
    const store = readStore();
    if (key === RADIAL_KEY) {
      const current = store[key];
      if (!current || typeof current !== "object") return { ...DEFAULT_RADIAL, items: DEFAULT_RADIAL.items.slice() };
      return {
        color: typeof current.color === "string" ? current.color : DEFAULT_RADIAL.color,
        size: Number(current.size) > 0 ? Number(current.size) : DEFAULT_RADIAL.size,
        items: Array.isArray(current.items) && current.items.length
          ? current.items.slice()
          : DEFAULT_RADIAL.items.slice(),
      };
    }
    if (key === SEARCH_KEY) {
      const current = store[key];
      if (!current || typeof current !== "object") return { ...DEFAULT_SEARCH };
      return {
        color: typeof current.color === "string" ? current.color : DEFAULT_SEARCH.color,
        width: Number(current.width) > 0 ? Number(current.width) : DEFAULT_SEARCH.width,
        backgroundOpacity:
          Number(current.backgroundOpacity) >= 0
            ? Number(current.backgroundOpacity)
            : DEFAULT_SEARCH.backgroundOpacity,
        placeholder:
          typeof current.placeholder === "string" && current.placeholder.trim()
            ? current.placeholder.trim()
            : DEFAULT_SEARCH.placeholder,
      };
    }
    return store[key] || {};
  }

  function notifySettingsChanged(key) {
    try {
      window.dispatchEvent(
        new CustomEvent("customise:settings-changed", { detail: { key } })
      );
    } catch (_) { /* ignore */ }
    if (key === RADIAL_KEY && window.RadialMenu && typeof window.RadialMenu.reload === "function") {
      window.RadialMenu.reload();
    }
    if (key === SEARCH_KEY && window.SearchPalette && typeof window.SearchPalette.reload === "function") {
      window.SearchPalette.reload();
    }
  }

  function updateRecord(key, patch) {
    const store = readStore();
    const previous = store[key] && typeof store[key] === "object" ? store[key] : {};
    store[key] = { ...previous, ...patch };
    writeStore(store);
    notifySettingsChanged(key);
  }

  function getCatalog() {
    if (window.DragonIdgetCatalog && Array.isArray(window.DragonIdgetCatalog) && window.DragonIdgetCatalog.length) {
      return window.DragonIdgetCatalog;
    }
    if (window.RadialMenu && typeof window.RadialMenu.getCatalog === "function") {
      const list = window.RadialMenu.getCatalog();
      if (list && list.length) return list;
    }
    return IDGET_CATALOG;
  }

  function clearCustomiseHash() {
    if (window.location.hash !== "#customise-widget") return;
    const clean = String(window.location.href || "").replace(/#customise-widget\/?$/, "");
    history.replaceState(null, "", clean || window.location.pathname);
  }

  function openCatalog() {
    if (closingCatalog) return;
    const el = document.getElementById("customise-widget");
    if (!el) return;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    if (window.location.hash !== "#customise-widget") {
      window.location.hash = "customise-widget";
    }
  }

  function closeCatalog() {
    closingCatalog = true;
    const el = document.getElementById("customise-widget");
    if (el) {
      el.classList.remove("is-open");
      el.setAttribute("aria-hidden", "true");
    }
    closeFactory();
    clearCustomiseHash();
    // Libera o flag no próximo tick para o hashchange/replaceState não reabrir.
    setTimeout(() => {
      closingCatalog = false;
    }, 0);
  }

  function degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function polar(radius, angleDeg) {
    const rad = degToRad(angleDeg);
    return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
  }

  function slicePath(index, total, outerR, innerR) {
    if (total <= 0) return "";
    if (total === 1) {
      return `M ${outerR} 0 A ${outerR} ${outerR} 0 1 1 ${-outerR} 0 A ${outerR} ${outerR} 0 1 1 ${outerR} 0 M ${innerR} 0 A ${innerR} ${innerR} 0 1 0 ${-innerR} 0 A ${innerR} ${innerR} 0 1 0 ${innerR} 0`;
    }
    const slice = 360 / total;
    const mid = -90 + slice * index;
    const half = slice / 2;
    const start = mid - half;
    const end = mid + half;
    const os = polar(outerR, start);
    const oe = polar(outerR, end);
    const is = polar(innerR, start);
    const ie = polar(innerR, end);
    const large = slice > 180 ? 1 : 0;
    return `M ${os.x} ${os.y} A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y} L ${ie.x} ${ie.y} A ${innerR} ${innerR} 0 ${large} 0 ${is.x} ${is.y} Z`;
  }

  function ensureFactoryOverlay() {
    if (factoryOverlay) return;
    factoryOverlay = document.createElement("div");
    factoryOverlay.className = "customise-factory-overlay";
    factoryOverlay.innerHTML = `
      <div class="customise-factory-modal" role="dialog" aria-modal="true" aria-label="Customise Factory">
        <div class="customise-factory-header">
          <div class="customise-factory-title-wrap">
            <h3>Customise</h3>
            <p data-role="factory-info">Objeto alvo</p>
          </div>
          <button type="button" class="customise-factory-close-btn" data-role="factory-close" aria-label="Fechar">×</button>
        </div>
        <div class="customise-factory-body" data-role="factory-body"></div>
      </div>
    `;
    document.body.appendChild(factoryOverlay);

    factoryOverlay.addEventListener("click", (event) => {
      if (event.target === factoryOverlay) closeFactory();
    });
    factoryOverlay.querySelector('[data-role="factory-close"]').addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeFactory();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (factoryOverlay && factoryOverlay.classList.contains("is-open")) {
        event.preventDefault();
        closeFactory();
        return;
      }
      const catalog = document.getElementById("customise-widget");
      if (catalog && catalog.classList.contains("is-open")) {
        event.preventDefault();
        closeCatalog();
      }
    });
  }

  function renderRadialFactory(body, infoEl) {
    draft = getRecord(RADIAL_KEY);
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
      updateRecord(RADIAL_KEY, {
        color: draft.color,
        size: draft.size,
        items: draft.items.slice(),
      });
      paintRadialPreview(body);
      if (refreshList) renderItemsList(listEl);
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

    renderItemsList(listEl);
    paintRadialPreview(body);

    function renderItemsList(container) {
      const catalog = getCatalog();
      container.innerHTML = catalog
        .map((item) => {
          const on = draft.items.includes(item.id);
          return `
            <div class="customise-factory-item ${on ? "" : "is-off"}" data-idget-id="${item.id}" draggable="true">
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

      // Ordena visualmente: itens ativos na ordem do draft, depois os off.
      const ordered = [
        ...draft.items.map((id) => container.querySelector(`[data-idget-id="${id}"]`)).filter(Boolean),
        ...Array.from(container.querySelectorAll(".customise-factory-item.is-off")),
      ];
      ordered.forEach((node) => container.appendChild(node));

      if (window.lucide && typeof window.lucide.createIcons === "function") {
        try {
          window.lucide.createIcons();
        } catch (_) { /* ignore */ }
      }

      container.querySelectorAll("[data-toggle-idget]").forEach((btn) => {
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

      container.querySelectorAll(".customise-factory-item").forEach((row) => {
        row.addEventListener("dragstart", (event) => {
          dragId = row.getAttribute("data-idget-id");
          event.dataTransfer.effectAllowed = "move";
        });
        row.addEventListener("dragover", (event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        });
        row.addEventListener("drop", (event) => {
          event.preventDefault();
          const targetId = row.getAttribute("data-idget-id");
          if (!dragId || !targetId || dragId === targetId) return;
          const from = draft.items.indexOf(dragId);
          const to = draft.items.indexOf(targetId);
          if (from < 0 || to < 0) return;
          draft.items.splice(from, 1);
          draft.items.splice(to, 0, dragId);
          dragId = null;
          persist();
        });
      });
    }
  }

  function paintRadialPreview(body) {
    const preview = body.querySelector('[data-role="preview-radial"]');
    if (!preview || !draft) return;
    const catalog = getCatalog();
    const items = draft.items
      .map((id) => catalog.find((item) => item.id === id))
      .filter(Boolean);
    const size = Math.min(240, Number(draft.size) || 240);
    const half = size / 2;
    preview.style.setProperty("--preview-size", `${size}px`);
    preview.style.setProperty("--radial-color", draft.color || DEFAULT_RADIAL.color);

    const wedgeOuter = half - 20;
    const wedgeInner = wedgeOuter - 48;
    const iconRing = (wedgeOuter + wedgeInner) / 2;
    const total = items.length;

    const paths = items
      .map((_, index) => `<path class="preview-wedge" d="${slicePath(index, total, wedgeOuter, wedgeInner)}"></path>`)
      .join("");

    const labels = items
      .map((item, index) => {
        const mid = -90 + (360 / Math.max(total, 1)) * index;
        const pos = polar(iconRing, mid);
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

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      try {
        window.lucide.createIcons();
      } catch (_) { /* ignore */ }
    }
  }

  function parseHexColor(input) {
    if (!input || !input.startsWith("#")) return { r: 122, g: 140, b: 255 };
    const hex = input.replace("#", "");
    const full = hex.length === 3 ? hex.split("").map((ch) => ch + ch).join("") : hex;
    const value = parseInt(full, 16);
    if (Number.isNaN(value)) return { r: 122, g: 140, b: 255 };
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
  }

  function paintSearchPreview(body) {
    const preview = body.querySelector('[data-role="preview-search"]');
    if (!preview || !draft) return;
    const rgb = parseHexColor(draft.color);
    const opacity = Math.max(0, Math.min(100, Number(draft.backgroundOpacity))) / 100;
    const width = Math.min(520, Number(draft.width) || 640);
    preview.style.setProperty("--search-accent", draft.color || DEFAULT_SEARCH.color);
    preview.style.setProperty("--search-accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    preview.style.setProperty("--search-width", `${width}px`);
    preview.style.setProperty("--search-shell-bg", `rgba(20, 22, 32, ${opacity})`);
    const placeholderEl = preview.querySelector('[data-role="preview-placeholder"]');
    if (placeholderEl) {
      placeholderEl.textContent = draft.placeholder || DEFAULT_SEARCH.placeholder;
    }
  }

  function renderSearchFactory(body, infoEl) {
    draft = getRecord(SEARCH_KEY);
    infoEl.textContent = "Search Palette — aparência da barra (Ctrl+Espaço)";

    const safePlaceholder = String(draft.placeholder || DEFAULT_SEARCH.placeholder)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");

    body.innerHTML = `
      <div class="customise-factory-controls">
        <section class="customise-factory-panel">
          <h4>Aparência</h4>
          <div class="customise-factory-field">
            <label for="customiseSearchColor">Cor de destaque</label>
            <input id="customiseSearchColor" type="color" value="${draft.color}" />
          </div>
          <div class="customise-factory-field">
            <label for="customiseSearchWidth">Largura</label>
            <input id="customiseSearchWidth" type="range" min="420" max="760" value="${draft.width}" />
            <span class="customise-factory-field-value" data-role="width-label">${draft.width}px</span>
          </div>
          <div class="customise-factory-field">
            <label for="customiseSearchOpacity">Opacidade do fundo</label>
            <input id="customiseSearchOpacity" type="range" min="40" max="100" value="${draft.backgroundOpacity}" />
            <span class="customise-factory-field-value" data-role="opacity-label">${draft.backgroundOpacity}%</span>
          </div>
          <div class="customise-factory-field">
            <label for="customiseSearchPlaceholder">Placeholder</label>
            <input id="customiseSearchPlaceholder" type="text" value="${safePlaceholder}" maxlength="80" />
          </div>
          <p class="customise-factory-hint">Atalho padrão: Ctrl + Espaço. Alterações aplicam na próxima abertura da paleta.</p>
        </section>
      </div>
      <div class="customise-factory-preview">
        <div class="customise-factory-preview-header">Preview em tempo real</div>
        <div class="customise-factory-preview-stage customise-factory-preview-stage--search">
          <div class="customise-factory-preview-search" data-role="preview-search">
            <div class="customise-factory-preview-search-shell">
              <div class="customise-factory-preview-search-form">
                <span class="customise-factory-preview-search-icon" aria-hidden="true">⌕</span>
                <span class="customise-factory-preview-search-placeholder" data-role="preview-placeholder">${safePlaceholder}</span>
                <span class="customise-factory-preview-search-btn">Buscar</span>
              </div>
              <div class="customise-factory-preview-search-hint">Enter para buscar · Esc para fechar</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const colorInput = body.querySelector("#customiseSearchColor");
    const widthInput = body.querySelector("#customiseSearchWidth");
    const opacityInput = body.querySelector("#customiseSearchOpacity");
    const placeholderInput = body.querySelector("#customiseSearchPlaceholder");
    const widthLabel = body.querySelector('[data-role="width-label"]');
    const opacityLabel = body.querySelector('[data-role="opacity-label"]');

    function persist() {
      updateRecord(SEARCH_KEY, {
        color: draft.color,
        width: draft.width,
        backgroundOpacity: draft.backgroundOpacity,
        placeholder: draft.placeholder,
      });
      paintSearchPreview(body);
    }

    colorInput.addEventListener("input", () => {
      draft.color = colorInput.value;
      persist();
    });
    widthInput.addEventListener("input", () => {
      draft.width = Number(widthInput.value);
      widthLabel.textContent = `${draft.width}px`;
      persist();
    });
    opacityInput.addEventListener("input", () => {
      draft.backgroundOpacity = Number(opacityInput.value);
      opacityLabel.textContent = `${draft.backgroundOpacity}%`;
      persist();
    });
    placeholderInput.addEventListener("input", () => {
      draft.placeholder = placeholderInput.value.trim() || DEFAULT_SEARCH.placeholder;
      persist();
    });

    paintSearchPreview(body);
  }

  function openFactory({ key, label } = {}) {
    ensureFactoryOverlay();
    factoryKey = key || RADIAL_KEY;
    factoryLabel = label || "Objeto";
    const infoEl = factoryOverlay.querySelector('[data-role="factory-info"]');
    const body = factoryOverlay.querySelector('[data-role="factory-body"]');
    infoEl.textContent = factoryLabel;

    if (factoryKey === RADIAL_KEY) {
      renderRadialFactory(body, infoEl);
    } else if (factoryKey === SEARCH_KEY) {
      renderSearchFactory(body, infoEl);
    } else {
      body.innerHTML = `<div class="customise-factory-controls"><p class="customise-factory-hint">Editor ainda não disponível para este objeto.</p></div>`;
    }

    factoryOverlay.classList.add("is-open");
  }

  function closeFactory() {
    if (!factoryOverlay) return;
    factoryOverlay.classList.remove("is-open");
    factoryKey = null;
    draft = null;
  }

  function bindCatalogTriggers(root) {
    if (!root || catalogBound) return;
    catalogBound = true;
    root.querySelectorAll("[data-open-customise-factory]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openFactory({
          key: btn.getAttribute("data-customise-key") || RADIAL_KEY,
          label: btn.getAttribute("data-customise-label") || "Objeto",
        });
      });
    });

    root.querySelectorAll("[data-customise-close], .customise-close").forEach((closeBtn) => {
      closeBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeCatalog();
      });
    });

    root.addEventListener("click", (event) => {
      if (event.target === root) closeCatalog();
    });
  }

  function bindTablineButton() {
    const btn = document.querySelector('.side-tabs .tab-item[data-idget="customise"]');
    if (!btn || btn.dataset.customiseBound === "1") return;
    btn.dataset.customiseBound = "1";
    btn.addEventListener("click", (event) => {
      // Evita depender só do :target / hash — controlamos via classe is-open.
      event.preventDefault();
      openCatalog();
    });
  }

  function onHashChange() {
    if (closingCatalog) return;
    if (window.location.hash === "#customise-widget") {
      openCatalog();
      return;
    }
    const el = document.getElementById("customise-widget");
    if (el && el.classList.contains("is-open")) {
      el.classList.remove("is-open");
      el.setAttribute("aria-hidden", "true");
    }
  }

  function init() {
    const catalogRoot = document.getElementById("customise-widget");
    if (!catalogRoot) return false;
    bindCatalogTriggers(catalogRoot);
    bindTablineButton();
    if (!initialized) {
      initialized = true;
      onHashChange();
      window.addEventListener("hashchange", onHashChange);
    }
    // Tabline pode montar depois do catálogo — continua tentando o botão.
    return document.querySelector('.side-tabs .tab-item[data-idget="customise"]') != null;
  }

  window.Customise = {
    open: openCatalog,
    close: closeCatalog,
    openFactory,
    closeFactory,
    getRecord,
    updateRecord,
  };

  function boot() {
    if (init()) return;
    const bootWatch = setInterval(() => {
      if (init()) clearInterval(bootWatch);
    }, 100);
    setTimeout(() => clearInterval(bootWatch), 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
