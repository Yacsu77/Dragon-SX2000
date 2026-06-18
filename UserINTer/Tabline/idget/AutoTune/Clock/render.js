window.AutoTuneClockRender = (function () {
  const Config = window.AutoTuneClockConfig;

  const ROLE_MAP = {
    time: "time",
    date: "date",
    weekDay: "weekday"
  };

  function parseColor(hex, fallback) {
    if (!hex || !hex.startsWith("#")) return fallback || { r: 255, g: 255, b: 255 };
    const raw = hex.replace("#", "");
    const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
    const n = parseInt(full, 16);
    if (Number.isNaN(n)) return fallback || { r: 255, g: 255, b: 255 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgba(hex, alpha01) {
    const c = parseColor(hex);
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.max(0, Math.min(1, alpha01))})`;
  }

  function applyBackground(node, bg) {
    if (!node || !bg) return;
    if (bg.enabled === false) {
      node.style.display = "none";
      return;
    }
    node.style.display = "";
    node.style.left = `${bg.x ?? 0}%`;
    node.style.top = `${bg.y ?? 0}%`;
    node.style.width = `${bg.width ?? 100}%`;
    node.style.height = `${bg.height ?? 100}%`;
    node.style.backgroundColor = rgba(bg.color, Number(bg.opacity) / 100);
    node.style.borderRadius = `${Number(bg.borderRadius) || 0}px`;
  }

  function applyElementStyle(node, cfg) {
    if (!node || !cfg) return;
    node.style.display = cfg.visible ? "" : "none";
    node.style.left = `${cfg.x}%`;
    node.style.top = `${cfg.y}%`;
    node.style.width = `${cfg.width}%`;
    node.style.height = `${cfg.height}%`;
    node.style.fontSize = `${cfg.fontSize}px`;
    node.style.fontFamily = cfg.fontFamily || "inherit";
    node.style.fontWeight = String(cfg.fontWeight || 500);
    node.style.textAlign = cfg.textAlign || "center";
    const alignMap = { left: "flex-start", center: "center", right: "flex-end" };
    node.style.justifyContent = alignMap[cfg.textAlign] || "center";
    node.style.color = rgba(cfg.color, Number(cfg.opacity) / 100);
    node.style.opacity = cfg.visible ? "1" : "0";
  }

  function applyToRoot(root, clockConfig) {
    if (!root) return;
    const config = Config.mergeClock(clockConfig);
    const bg = root.querySelector('[data-role="background"]');
    applyBackground(bg, config.background);

    Config.ELEMENT_KEYS.forEach((key) => {
      const role = ROLE_MAP[key];
      const node = root.querySelector(`[data-role="${role}"]`);
      applyElementStyle(node, config.elements[key]);
    });
  }

  function findClockRoot(el) {
    if (!el) return null;
    if (el.classList && el.classList.contains("autotune-clock-root")) return el;
    return el.querySelector(".autotune-clock-root");
  }

  function applyToWidget(widgetEl, clockConfig) {
    const body = widgetEl.querySelector(".floating-widget-body") || widgetEl;
    applyToRoot(findClockRoot(body) || body, clockConfig);
  }

  return {
    applyToRoot,
    applyToWidget,
    findClockRoot,
    applyElementStyle,
    applyBackground
  };
})();
