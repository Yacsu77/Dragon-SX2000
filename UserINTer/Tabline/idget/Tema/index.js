const STORAGE_KEY = "themeMode";
const MODES = ["light", "dark", "system"];

const themeTogglerStrip = document.getElementById("themeTogglerStrip");
const themeModeLabel = document.getElementById("themeModeLabel");
const themeTogglerBtn = document.getElementById("themeTogglerBtn");
const temaTabBtn = document.getElementById("temaTabBtn");

if (document.body && document.body.dataset) {
  const path = window.location.pathname || "";
  if (path.includes("Tema/index.html")) {
    document.body.dataset.widget = "Tema";
  }
}

function getStoredMode() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw && MODES.includes(raw)) return raw;
  return "dark";
}

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveEffectiveTheme(mode) {
  if (mode === "system") return prefersDark() ? "dark" : "light";
  return mode;
}

function applyThemeToDocument() {
  const mode = getStoredMode();
  const effective = resolveEffectiveTheme(mode);
  document.documentElement.setAttribute("data-theme", effective);
  document.documentElement.setAttribute("data-theme-mode", mode);
  updateTogglerUi(mode);
}

function updateTogglerUi(mode) {
  const index = MODES.indexOf(mode);
  if (themeTogglerStrip) {
    themeTogglerStrip.dataset.index = String(Math.max(0, index));
  }
  if (themeModeLabel) {
    const labels = { light: "Claro", dark: "Escuro", system: "Sistema" };
    themeModeLabel.textContent = labels[mode] || mode;
  }
  const labelText = { light: "Claro", dark: "Escuro", system: "Sistema" }[mode] || mode;
  if (temaTabBtn) {
    temaTabBtn.setAttribute("aria-label", `Tema: ${labelText}`);
    temaTabBtn.setAttribute("title", `Tema · ${labelText}`);
  }
}

function cycleMode() {
  const current = getStoredMode();
  const next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
  localStorage.setItem(STORAGE_KEY, next);
  applyThemeToDocument();
}

const cycleTarget = temaTabBtn || themeTogglerBtn;
if (cycleTarget) {
  cycleTarget.addEventListener("click", () => {
    cycleMode();
  });
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (getStoredMode() === "system") {
    applyThemeToDocument();
  }
});

window.DragonTheme = {
  cycle: cycleMode,
  apply: applyThemeToDocument,
  getMode: getStoredMode
};

applyThemeToDocument();
