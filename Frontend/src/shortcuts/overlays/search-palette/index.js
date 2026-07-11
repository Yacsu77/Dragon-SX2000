/**
 * Search Palette
 *
 * Overlay flutuante centralizado que abre com Ctrl+Espaço (configurável via
 * ShortcutManager). Permite o usuário pesquisar/abrir uma URL sem voltar para
 * a home. Cancela sem efeito ao clicar fora ou pressionar Esc.
 *
 * Visual configurável em Customise → Search Palette (`customise-search-palette`).
 */
(function () {
  if (window.SearchPalette) return; // idempotente

  const ROOT_ID = "shortcut-search-palette";
  const STORE_KEY = "customiseSettings";
  const TARGET_KEY = "customise-search-palette";

  const DEFAULT_SETTINGS = {
    color: "#7a8cff",
    width: 640,
    backgroundOpacity: 92,
    placeholder: "Pesquisar na web ou colar URL…",
  };

  let rootEl = null;
  let inputEl = null;
  let formEl = null;
  let submitEl = null;
  let isOpen = false;
  let lastFocusEl = null;
  let focusTimer = null;
  let focusRaf = null;
  let currentSettings = { ...DEFAULT_SETTINGS };

  function readSettings() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const store = JSON.parse(raw);
      const record = store && store[TARGET_KEY];
      if (!record || typeof record !== "object") return { ...DEFAULT_SETTINGS };
      return {
        color: typeof record.color === "string" ? record.color : DEFAULT_SETTINGS.color,
        width: Number(record.width) > 0 ? Number(record.width) : DEFAULT_SETTINGS.width,
        backgroundOpacity:
          Number(record.backgroundOpacity) >= 0
            ? Number(record.backgroundOpacity)
            : DEFAULT_SETTINGS.backgroundOpacity,
        placeholder:
          typeof record.placeholder === "string" && record.placeholder.trim()
            ? record.placeholder.trim()
            : DEFAULT_SETTINGS.placeholder,
      };
    } catch (_) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function parseColor(input) {
    if (!input || !input.startsWith("#")) return { r: 122, g: 140, b: 255 };
    const hex = input.replace("#", "");
    const full = hex.length === 3 ? hex.split("").map((ch) => ch + ch).join("") : hex;
    const value = parseInt(full, 16);
    if (Number.isNaN(value)) return { r: 122, g: 140, b: 255 };
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
  }

  function applySettings(settings) {
    currentSettings = settings || readSettings();
    if (!rootEl) return;
    const rgb = parseColor(currentSettings.color);
    const opacity = Math.max(0, Math.min(100, Number(currentSettings.backgroundOpacity))) / 100;
    rootEl.style.setProperty("--search-accent", currentSettings.color);
    rootEl.style.setProperty("--search-accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    rootEl.style.setProperty("--search-width", `${currentSettings.width}px`);
    rootEl.style.setProperty("--search-shell-bg", `rgba(20, 22, 32, ${opacity})`);
    if (inputEl) {
      inputEl.placeholder = currentSettings.placeholder || DEFAULT_SETTINGS.placeholder;
    }
  }

  function clearFocusTimers() {
    if (focusTimer) {
      clearTimeout(focusTimer);
      focusTimer = null;
    }
    if (focusRaf) {
      cancelAnimationFrame(focusRaf);
      focusRaf = null;
    }
  }

  function buildDom() {
    if (rootEl) return;
    rootEl = document.createElement("div");
    rootEl.id = ROOT_ID;
    rootEl.className = "shortcut-search-palette";
    rootEl.setAttribute("aria-hidden", "true");
    rootEl.innerHTML = `
      <div class="shortcut-search-palette__backdrop" data-role="backdrop"></div>
      <div class="shortcut-search-palette__shell" role="dialog" aria-modal="true"
           aria-label="Buscar ou abrir URL">
        <form class="shortcut-search-palette__form" data-role="form" autocomplete="off">
          <span class="shortcut-search-palette__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </span>
          <input
            type="text"
            class="shortcut-search-palette__input"
            data-role="input"
            placeholder="Pesquisar na web ou colar URL…"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="submit" class="shortcut-search-palette__submit" data-role="submit">
            Buscar
          </button>
        </form>
        <div class="shortcut-search-palette__hint">
          <kbd>Enter</kbd> para buscar · <kbd>Esc</kbd> para fechar
        </div>
      </div>
    `;
    document.body.appendChild(rootEl);

    inputEl = rootEl.querySelector('[data-role="input"]');
    formEl = rootEl.querySelector('[data-role="form"]');
    submitEl = rootEl.querySelector('[data-role="submit"]');

    rootEl.querySelector('[data-role="backdrop"]').addEventListener("click", () => close());
    formEl.addEventListener("submit", onSubmit);
    applySettings(readSettings());
  }

  function looksLikeUrl(value) {
    return value.includes(".") && !value.includes(" ");
  }

  function normalizeUrl(value) {
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
  }

  function runSearch(raw) {
    let url;
    let title;
    if (looksLikeUrl(raw)) {
      url = normalizeUrl(raw);
    } else {
      url = `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
      title = `Busca: ${raw}`;
    }

    if (typeof window.createTab === "function") {
      window.createTab(url, title);
    } else {
      window.open(url, "_blank");
    }
  }

  function onSubmit(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const raw = (inputEl && inputEl.value ? inputEl.value : "").trim();

    // Fecha primeiro para a UI sumir mesmo se a abertura da aba falhar.
    close();

    if (!raw) return;

    try {
      runSearch(raw);
    } catch (err) {
      console.warn("[SearchPalette] falha ao buscar:", err);
    }
  }

  function open() {
    buildDom();
    applySettings(readSettings());
    if (isOpen) return;
    isOpen = true;
    lastFocusEl = document.activeElement;

    if (inputEl) inputEl.value = "";
    rootEl.classList.add("is-open");
    rootEl.setAttribute("aria-hidden", "false");

    void rootEl.offsetHeight;

    document.addEventListener("keydown", onKeydownWhileOpen, true);

    clearFocusTimers();
    focusInput();
    focusRaf = requestAnimationFrame(() => {
      focusRaf = null;
      focusInput();
    });
    focusTimer = setTimeout(() => {
      focusTimer = null;
      focusInput();
    }, 80);
  }

  function focusInput() {
    if (!isOpen || !inputEl) return;
    if (document.activeElement === inputEl) return;
    try {
      inputEl.focus({ preventScroll: true });
    } catch (_) {
      inputEl.focus();
    }
    try {
      inputEl.select();
    } catch (_) { /* ignore */ }
  }

  function close() {
    clearFocusTimers();
    if (!isOpen && rootEl && !rootEl.classList.contains("is-open")) {
      return;
    }
    isOpen = false;
    document.removeEventListener("keydown", onKeydownWhileOpen, true);

    if (rootEl) {
      rootEl.classList.remove("is-open");
      rootEl.setAttribute("aria-hidden", "true");
    }
    if (inputEl) {
      inputEl.blur();
      inputEl.value = "";
    }

    const restore = lastFocusEl;
    lastFocusEl = null;
    if (restore && typeof restore.focus === "function" && document.contains(restore)) {
      try {
        restore.focus({ preventScroll: true });
      } catch (_) { /* ignore */ }
    }
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function onKeydownWhileOpen(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    // Enter no input dispara submit do form; garante close mesmo fora do form.
    if (event.key === "Enter" && event.target === inputEl) {
      // Deixa o submit nativo do form rodar (onSubmit fecha + busca).
      return;
    }
  }

  function reloadFromStore() {
    applySettings(readSettings());
  }

  window.SearchPalette = {
    open,
    close,
    toggle,
    reload: reloadFromStore,
    getSettings: readSettings,
    get isOpen() {
      return isOpen;
    },
  };

  function tryRegister() {
    if (!window.ShortcutManager) {
      setTimeout(tryRegister, 50);
      return;
    }
    window.ShortcutManager.register({
      id: "search-palette",
      label: "Abrir paleta de busca",
      description:
        "Abre uma barra de pesquisa flutuante no centro da tela. " +
        "Aceita texto (busca no Google) ou URL (abre como nova aba). " +
        "Esc ou clique fora cancela sem buscar.",
      defaultKeys: "Ctrl+Space",
      category: "Navegação",
      allowInInputs: true,
      global: true,
      handler: () => toggle(),
    });
  }

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
