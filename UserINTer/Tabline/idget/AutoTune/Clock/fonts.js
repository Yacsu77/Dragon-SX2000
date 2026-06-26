window.AutoTuneClockFonts = (function () {
  const STORE_KEY = "autotuneCustomFonts";
  const STYLE_ID = "autotune-custom-fonts";

  const BUILTIN = [
    { label: "Padrao", value: "inherit" },
    { label: "Segoe UI", value: '"Segoe UI", sans-serif' },
    { label: "Inter", value: "Inter, sans-serif" },
    { label: "Roboto", value: "Roboto, sans-serif" },
    { label: "Monospace", value: 'ui-monospace, SFMono-Regular, Menlo, monospace' }
  ];

  const EXT_MAP = {
    otf: "opentype",
    ttf: "truetype",
    woff: "woff",
    woff2: "woff2"
  };

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

  function slug(name) {
    return (name || "custom-font")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "custom-font";
  }

  function ensureStyleNode() {
    let node = document.getElementById(STYLE_ID);
    if (!node) {
      node = document.createElement("style");
      node.id = STYLE_ID;
      document.head.appendChild(node);
    }
    return node;
  }

  function injectAll() {
    const store = readStore();
    const rules = Object.values(store).map((font) => {
      const format = font.format || "truetype";
      return `@font-face {
  font-family: "${font.family}";
  src: url("${font.dataUrl}") format("${format}");
  font-display: swap;
}`;
    });
    ensureStyleNode().textContent = rules.join("\n");
  }

  function listCustom() {
    return Object.values(readStore()).map((font) => ({
      label: font.name || font.family,
      value: `"${font.family}", sans-serif`,
      id: font.id
    }));
  }

  function listAll() {
    return [...BUILTIN, ...listCustom()];
  }

  function importFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("Nenhum arquivo selecionado."));
        return;
      }
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const format = EXT_MAP[ext];
      if (!format) {
        reject(new Error("Formato nao suportado. Use .otf, .ttf, .woff ou .woff2."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const baseName = file.name.replace(/\.[^.]+$/, "");
        const family = `AutoTune-${slug(baseName)}-${Date.now().toString(36)}`;
        const id = slug(baseName) + "-" + Date.now().toString(36);
        const store = readStore();
        store[id] = { id, name: baseName, family, dataUrl, format, ext };
        writeStore(store);
        injectAll();
        resolve({ id, name: baseName, family, value: `"${family}", sans-serif` });
      };
      reader.onerror = () => reject(new Error("Falha ao ler o arquivo de fonte."));
      reader.readAsDataURL(file);
    });
  }

  function boot() {
    injectAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  return {
    BUILTIN,
    readStore,
    listAll,
    listCustom,
    importFile,
    injectAll
  };
})();
