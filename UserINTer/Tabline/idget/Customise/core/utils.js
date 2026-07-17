/**
 * Customise — utilitários compartilhados (sem dependência de UI).
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.Utils) return;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function clampPercent(value, fallback) {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return fallback;
    return Math.round(clamp(raw, 0, 100));
  }

  function parseHexColor(input) {
    if (!input || !input.startsWith("#")) return { r: 122, g: 140, b: 255 };
    const hex = input.replace("#", "");
    const full = hex.length === 3 ? hex.split("").map((ch) => ch + ch).join("") : hex;
    const value = parseInt(full, 16);
    if (Number.isNaN(value)) return { r: 122, g: 140, b: 255 };
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
  }

  function hexToRgbCss(hex) {
    const { r, g, b } = parseHexColor(/^#[0-9a-fA-F]{3,6}$/.test(hex || "") ? hex : "#ffffff");
    return `${r}, ${g}, ${b}`;
  }

  function escapeAttr(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function refreshLucide() {
    if (!window.lucide || typeof window.lucide.createIcons !== "function") return;
    try {
      window.lucide.createIcons();
    } catch (_) { /* ignore */ }
  }

  function mergeUniqueOrder(preferred, fallback) {
    const base = Array.isArray(fallback) ? fallback.slice() : [];
    const seen = new Set();
    const ordered = [];
    const source = Array.isArray(preferred) ? preferred : base;
    source.forEach((id) => {
      if (!base.includes(id) || seen.has(id)) return;
      seen.add(id);
      ordered.push(id);
    });
    base.forEach((id) => {
      if (!seen.has(id)) ordered.push(id);
    });
    return ordered;
  }

  NS.Utils = {
    clamp,
    clampPercent,
    parseHexColor,
    hexToRgbCss,
    escapeAttr,
    refreshLucide,
    mergeUniqueOrder,
  };
})();
