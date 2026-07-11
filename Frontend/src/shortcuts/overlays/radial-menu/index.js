/**
 * Radial Menu (Alt / Option)
 *
 * Segure Alt (Option no Mac) para abrir um menu circular com os idgets
 * da Tabline. O ângulo do cursor pré-seleciona o item; soltar Alt abre
 * o item pré-selecionado (ou nada, se o cursor estiver no centro).
 *
 * Configuração (cor + itens) via Customise → Radial Menu.
 * Visual inspirado em: https://animate-ui.com/docs/components/community/radial-menu
 */
(function () {
  if (window.RadialMenu) return;

  const ROOT_ID = "shortcut-radial-menu";
  const STORE_KEY = "customiseSettings";
  const TARGET_KEY = "customise-radial-menu";
  const FULL_CIRCLE = 360;
  const START_ANGLE = -90;

  const DEFAULT_SETTINGS = {
    color: "#7a8cff",
    size: 280,
    items: ["wallpaper", "tema", "autotune", "customise", "donate"],
  };

  /** Catálogo canônico dos idgets da Tabline (fonte única). */
  const IDGET_CATALOG = [
    {
      id: "wallpaper",
      label: "Wallpaper",
      icon: "image",
      description: "Abrir seletor de wallpaper",
    },
    {
      id: "tema",
      label: "Tema",
      icon: "moon",
      description: "Alternar tema claro/escuro/sistema",
    },
    {
      id: "customise",
      label: "Customise",
      icon: "sliders",
      description: "Abrir painel Customise",
    },
    {
      id: "donate",
      label: "Donate",
      icon: "heart",
      description: "Donate (em breve)",
    },
    {
      id: "autotune",
      label: "AutoTune",
      icon: "sparkles",
      description: "Abrir catálogo AutoTune",
    },
  ];

  let rootEl = null;
  let stageEl = null;
  let svgEl = null;
  let itemsEl = null;
  let hintEl = null;
  let isOpen = false;
  let activeIndex = null;
  let center = { x: 0, y: 0 };
  let lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let currentItems = [];
  let currentSettings = { ...DEFAULT_SETTINGS };

  function readSettings() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const store = JSON.parse(raw);
      const record = store && store[TARGET_KEY];
      if (!record || typeof record !== "object") return { ...DEFAULT_SETTINGS };
      const items = Array.isArray(record.items)
        ? record.items.filter((id) => IDGET_CATALOG.some((item) => item.id === id))
        : DEFAULT_SETTINGS.items.slice();
      return {
        color: typeof record.color === "string" ? record.color : DEFAULT_SETTINGS.color,
        size: Number(record.size) > 0 ? Number(record.size) : DEFAULT_SETTINGS.size,
        items: items.length > 0 ? items : DEFAULT_SETTINGS.items.slice(),
      };
    } catch (_) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function resolveItems(settings) {
    return (settings.items || [])
      .map((id) => IDGET_CATALOG.find((item) => item.id === id))
      .filter(Boolean);
  }

  function degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function polarToCartesian(radius, angleDeg) {
    const rad = degToRad(angleDeg);
    return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
  }

  function slicePath(index, total, outerR, innerR) {
    if (total <= 0) return "";
    if (total === 1) {
      return [
        `M ${outerR} 0`,
        `A ${outerR} ${outerR} 0 1 1 ${-outerR} 0`,
        `A ${outerR} ${outerR} 0 1 1 ${outerR} 0`,
        `M ${innerR} 0`,
        `A ${innerR} ${innerR} 0 1 0 ${-innerR} 0`,
        `A ${innerR} ${innerR} 0 1 0 ${innerR} 0`,
      ].join(" ");
    }

    const anglePerSlice = FULL_CIRCLE / total;
    const midDeg = START_ANGLE + anglePerSlice * index;
    const halfSlice = anglePerSlice / 2;
    const startDeg = midDeg - halfSlice;
    const endDeg = midDeg + halfSlice;
    const outerStart = polarToCartesian(outerR, startDeg);
    const outerEnd = polarToCartesian(outerR, endDeg);
    const innerStart = polarToCartesian(innerR, startDeg);
    const innerEnd = polarToCartesian(innerR, endDeg);
    const largeArc = anglePerSlice > 180 ? 1 : 0;

    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      "Z",
    ].join(" ");
  }

  function buildDom() {
    if (rootEl) return;
    rootEl = document.createElement("div");
    rootEl.id = ROOT_ID;
    rootEl.className = "shortcut-radial-menu";
    rootEl.setAttribute("aria-hidden", "true");
    rootEl.innerHTML = `
      <div class="shortcut-radial-menu__stage" data-role="stage">
        <svg class="shortcut-radial-menu__svg" data-role="svg" viewBox="-140 -140 280 280" aria-hidden="true"></svg>
        <div class="shortcut-radial-menu__items" data-role="items"></div>
        <div class="shortcut-radial-menu__hint" data-role="hint">Alt</div>
      </div>
    `;
    document.body.appendChild(rootEl);
    stageEl = rootEl.querySelector('[data-role="stage"]');
    svgEl = rootEl.querySelector('[data-role="svg"]');
    itemsEl = rootEl.querySelector('[data-role="items"]');
    hintEl = rootEl.querySelector('[data-role="hint"]');
  }

  function paintMenu() {
    if (!svgEl || !itemsEl || !stageEl) return;
    currentSettings = readSettings();
    currentItems = resolveItems(currentSettings);
    const size = currentSettings.size || DEFAULT_SETTINGS.size;
    const half = size / 2;
    const color = currentSettings.color || DEFAULT_SETTINGS.color;

    stageEl.style.setProperty("--radial-size", `${size}px`);
    stageEl.style.setProperty("--radial-color", color);
    svgEl.setAttribute("viewBox", `${-half} ${-half} ${size} ${size}`);

    const outerRingWidth = 12;
    const outerGap = 8;
    const bandWidth = 54;
    const innerGap = 10;
    const outerRingOuter = half;
    const outerRingInner = outerRingOuter - outerRingWidth;
    const wedgeOuter = outerRingInner - outerGap;
    const wedgeInner = wedgeOuter - bandWidth;
    const iconRing = (wedgeOuter + wedgeInner) / 2;
    const hubRadius = Math.max(wedgeInner - innerGap, 18);
    const total = currentItems.length;

    const parts = [];
    currentItems.forEach((_, index) => {
      parts.push(
        `<path class="shortcut-radial-menu__ring" data-ring="${index}" d="${slicePath(index, total, outerRingOuter, outerRingInner)}"></path>`
      );
      parts.push(
        `<path class="shortcut-radial-menu__wedge" data-wedge="${index}" d="${slicePath(index, total, wedgeOuter, wedgeInner)}"></path>`
      );
    });
    parts.push(`<circle class="shortcut-radial-menu__hub" r="${hubRadius}" cx="0" cy="0"></circle>`);
    svgEl.innerHTML = parts.join("");

    itemsEl.innerHTML = currentItems
      .map((item, index) => {
        const midDeg = START_ANGLE + (FULL_CIRCLE / Math.max(total, 1)) * index;
        const pos = polarToCartesian(iconRing, midDeg);
        // Converte coords do SVG (centro 0,0) para % do stage
        const left = ((pos.x + half) / size) * 100;
        const top = ((pos.y + half) / size) * 100;
        return `
          <div class="shortcut-radial-menu__item" data-item-index="${index}" style="left:${left}%;top:${top}%;">
            <span class="shortcut-radial-menu__item-icon" data-lucide="${item.icon}"></span>
            <span class="shortcut-radial-menu__item-label">${item.label}</span>
          </div>
        `;
      })
      .join("");

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      try {
        window.lucide.createIcons();
      } catch (_) { /* ignore */ }
    }

    if (hintEl) {
      hintEl.textContent = total ? "Alt" : "—";
    }

    // Guarda raios para hit-test
    stageEl.dataset.hubRadius = String(hubRadius);
    stageEl.dataset.outerRadius = String(outerRingOuter);
  }

  function setActiveIndex(next) {
    if (activeIndex === next) return;
    activeIndex = next;
    if (!rootEl) return;
    rootEl.querySelectorAll("[data-wedge], [data-ring], [data-item-index]").forEach((el) => {
      const idx = Number(el.getAttribute("data-wedge") ?? el.getAttribute("data-ring") ?? el.getAttribute("data-item-index"));
      el.classList.toggle("is-active", Number.isFinite(idx) && idx === activeIndex);
    });
    if (hintEl) {
      hintEl.textContent =
        activeIndex == null || !currentItems[activeIndex]
          ? "Alt"
          : currentItems[activeIndex].label;
    }
  }

  function indexFromPointer(clientX, clientY) {
    if (!currentItems.length) return null;
    const dx = clientX - center.x;
    const dy = clientY - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hub = Number(stageEl && stageEl.dataset.hubRadius) || 40;
    const outer = Number(stageEl && stageEl.dataset.outerRadius) || 140;
    if (dist < hub * 0.85 || dist > outer * 1.15) return null;

    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    angle = (angle - START_ANGLE + 360) % 360;
    const slice = FULL_CIRCLE / currentItems.length;
    return Math.min(currentItems.length - 1, Math.floor(angle / slice));
  }

  function onPointerMove(event) {
    lastPointer = { x: event.clientX, y: event.clientY };
    if (!isOpen) return;
    setActiveIndex(indexFromPointer(event.clientX, event.clientY));
  }

  function activateIdget(item) {
    if (!item) return;
    switch (item.id) {
      case "wallpaper":
        window.location.hash = "wallpaper-widget";
        break;
      case "autotune":
        window.location.hash = "autotune-widget";
        break;
      case "customise":
        if (window.Customise && typeof window.Customise.open === "function") {
          window.Customise.open();
        } else {
          window.location.hash = "customise-widget";
        }
        break;
      case "tema":
        if (window.DragonTheme && typeof window.DragonTheme.cycle === "function") {
          window.DragonTheme.cycle();
        } else {
          const btn = document.getElementById("temaTabBtn");
          if (btn) btn.click();
        }
        break;
      case "donate":
        // Placeholder — Donate ainda não tem painel.
        break;
      default:
        break;
    }
  }

  function close(commit) {
    if (!isOpen) return;
    const selected =
      commit && activeIndex != null ? currentItems[activeIndex] || null : null;
    isOpen = false;
    activeIndex = null;
    document.removeEventListener("keydown", onKeyWhileOpen, true);
    if (rootEl) {
      rootEl.classList.remove("is-open");
      rootEl.setAttribute("aria-hidden", "true");
    }
    if (selected) {
      requestAnimationFrame(() => activateIdget(selected));
    }
  }

  function onKeyWhileOpen(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(false);
    }
  }

  function openAt(x, y) {
    buildDom();
    paintMenu();
    if (!currentItems.length) return;

    center = { x, y };
    stageEl.style.left = `${x}px`;
    stageEl.style.top = `${y}px`;

    isOpen = true;
    rootEl.classList.add("is-open");
    rootEl.setAttribute("aria-hidden", "false");
    document.addEventListener("keydown", onKeyWhileOpen, true);
    setActiveIndex(indexFromPointer(x, y));
  }

  function onHold(phase, source) {
    if (phase === "down") {
      const fromWebview = source === "webview";
      const x = fromWebview ? window.innerWidth / 2 : lastPointer.x;
      const y = fromWebview ? window.innerHeight / 2 : lastPointer.y;
      openAt(x, y);
      return;
    }
    if (phase === "up") {
      close(true);
    }
  }

  function trackPointer() {
    document.addEventListener("mousemove", onPointerMove, true);
    document.addEventListener(
      "pointermove",
      (event) => {
        lastPointer = { x: event.clientX, y: event.clientY };
      },
      true
    );
  }

  function reloadFromStore() {
    currentSettings = readSettings();
    currentItems = resolveItems(currentSettings);
    if (isOpen) paintMenu();
  }

  window.RadialMenu = {
    open: () => openAt(lastPointer.x, lastPointer.y),
    close: () => close(false),
    reload: reloadFromStore,
    getCatalog: () => IDGET_CATALOG.map((item) => ({ ...item })),
    getSettings: readSettings,
    get isOpen() {
      return isOpen;
    },
  };

  // Expõe catálogo para o Customise Factory.
  window.DragonIdgetCatalog = IDGET_CATALOG;

  function tryRegister() {
    if (!window.ShortcutManager) {
      setTimeout(tryRegister, 50);
      return;
    }
    window.ShortcutManager.register({
      id: "radial-menu",
      label: "Menu radial de idgets",
      description:
        "Segure Alt (Option no Mac) para abrir o menu circular com os idgets. " +
        "Mova o cursor para pré-selecionar; solte Alt para abrir. " +
        "Itens e cor configuráveis em Customise.",
      defaultKeys: "Alt",
      category: "Navegação",
      allowInInputs: true,
      global: true,
      hold: true,
      handler: (_event, ctx) => {
        onHold(ctx && ctx.phase === "up" ? "up" : "down", ctx && ctx.source);
      },
    });
  }

  trackPointer();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryRegister);
  } else {
    tryRegister();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === STORE_KEY) reloadFromStore();
  });

  window.addEventListener("customise:settings-changed", (event) => {
    if (!event.detail || event.detail.key === TARGET_KEY) reloadFromStore();
  });
})();
