/**
 * Motor da grade fixa dos AutoTunes.
 *
 * A home tem 3 linhas por 4 colunas. Cada AutoTune fixo ocupa um vão
 * declarado no próprio registro e só entra na grade em modo de edição.
 * A posição salva é a célula. O tipo flutuante fica reservado e não monta.
 */
(function () {
  const SETTINGS_KEY = "settingsAUTO";
  const COLS = 4;
  const ROWS = 3;

  function emptyState() {
    return { version: 2, items: [] };
  }

  function readRaw() {
    try {
      const raw = window.UserStorage
        ? window.UserStorage.getItem(SETTINGS_KEY)
        : localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function loadSettings() {
    const data = readRaw();
    if (!data || data.version !== 2 || !Array.isArray(data.items)) return emptyState();
    const items = data.items
      .filter((item) => item && typeof item.id === "string")
      .filter((item) => item.placement === "fixo" || item.placement === "flutuante")
      .map((item) => ({
        id: item.id,
        placement: item.placement,
        col: Number(item.col) || 0,
        row: Number(item.row) || 0,
        cols: Math.max(1, Number(item.cols) || 1),
        rows: Math.max(1, Number(item.rows) || 1),
      }));
    return { version: 2, items };
  }

  function saveSettings(state) {
    const payload = JSON.stringify(state);
    if (window.UserStorage) window.UserStorage.setItem(SETTINGS_KEY, payload);
    else localStorage.setItem(SETTINGS_KEY, payload);
  }

  function widgetMap() {
    return window.AutoTuneWidgetMeta || {};
  }

  function getWidget(id) {
    const meta = widgetMap()[id];
    if (!meta) return null;
    return {
      id,
      title: meta.title || id,
      placement: meta.placement === "flutuante" ? "flutuante" : "fixo",
      cols: Math.max(1, Number(meta.cols) || 1),
      rows: Math.max(1, Number(meta.rows) || 1),
    };
  }

  function isEditing() {
    return window.location.hash === "#autotune-widget";
  }

  function cellsFor(col, row, cols, rows) {
    const list = [];
    for (let y = row; y < row + rows; y += 1) {
      for (let x = col; x < col + cols; x += 1) {
        list.push({ col: x, row: y });
      }
    }
    return list;
  }

  function inside(col, row, cols, rows) {
    return col >= 0 && row >= 0 && col + cols <= COLS && row + rows <= ROWS;
  }

  function fits(col, row, cols, rows, items, ignoreId) {
    if (!inside(col, row, cols, rows)) return false;
    const occupied = new Set();
    items.forEach((item) => {
      if (item.id === ignoreId || item.placement !== "fixo") return;
      cellsFor(item.col, item.row, item.cols, item.rows).forEach((cell) => {
        occupied.add(`${cell.col},${cell.row}`);
      });
    });
    return cellsFor(col, row, cols, rows).every((cell) => !occupied.has(`${cell.col},${cell.row}`));
  }

  function gridEl() {
    return document.querySelector("#floating-cosmetics-root .autotune-grid");
  }

  function destroyBlock(block) {
    const body = block.querySelector(".autotune-block-body");
    if (body && typeof body._clockCleanup === "function") body._clockCleanup();
    if (body && typeof body._dragonMediaCleanup === "function") body._dragonMediaCleanup();
    block.remove();
  }

  function mountBlock(item) {
    const grid = gridEl();
    if (!grid) return null;
    const existing = grid.querySelector(`.autotune-block[data-widget-type="${item.id}"]`);
    if (existing) destroyBlock(existing);

    const block = document.createElement("article");
    block.className = "autotune-block";
    block.dataset.widgetType = item.id;
    block.dataset.placement = "fixo";
    block.style.gridColumn = `${item.col + 1} / span ${item.cols}`;
    block.style.gridRow = `${item.row + 1} / span ${item.rows}`;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "autotune-block-remove";
    remove.textContent = "Tirar";
    remove.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeWidget(item.id);
    });

    const body = document.createElement("div");
    body.className = "autotune-block-body";
    block.append(remove, body);
    grid.appendChild(block);

    const init = window.AutoTuneWidgets && window.AutoTuneWidgets[item.id];
    if (typeof init === "function") init(body);
    return block;
  }

  function clearBlocks() {
    const grid = gridEl();
    if (!grid) return;
    grid.querySelectorAll(".autotune-block").forEach(destroyBlock);
  }

  function syncShelf() {
    const placed = new Set(loadSettings().items.filter((item) => item.placement === "fixo").map((item) => item.id));
    document.querySelectorAll("[data-autotune-preview]").forEach((node) => {
      const id = node.getAttribute("data-autotune-preview");
      node.hidden = placed.has(id);
    });
  }

  function restore() {
    clearBlocks();
    const state = loadSettings();
    const accepted = [];
    state.items.forEach((item) => {
      if (item.placement !== "fixo") return;
      const widget = getWidget(item.id);
      if (!widget || widget.placement !== "fixo") return;
      if (!fits(item.col, item.row, widget.cols, widget.rows, accepted)) return;
      const next = {
        id: item.id,
        placement: "fixo",
        col: item.col,
        row: item.row,
        cols: widget.cols,
        rows: widget.rows,
      };
      accepted.push(next);
      mountBlock(next);
    });
    syncShelf();
  }

  function place(id, col, row) {
    const widget = getWidget(id);
    if (!widget) return { ok: false, error: "autotune desconhecido", item: null };
    if (widget.placement !== "fixo") {
      return { ok: false, error: "flutuante ainda não entra na grade", item: null };
    }
    if (!isEditing()) return { ok: false, error: "fora do modo de edição", item: null };

    const state = loadSettings();
    if (state.items.some((item) => item.id === id && item.placement === "fixo")) {
      return { ok: false, error: "já está na grade", item: null };
    }
    if (!inside(col, row, widget.cols, widget.rows)) {
      return { ok: false, error: "fora da grade", item: null };
    }
    if (!fits(col, row, widget.cols, widget.rows, state.items)) {
      return { ok: false, error: "célula ocupada", item: null };
    }

    const item = {
      id,
      placement: "fixo",
      col,
      row,
      cols: widget.cols,
      rows: widget.rows,
    };
    state.items.push(item);
    saveSettings(state);
    mountBlock(item);
    syncShelf();
    return { ok: true, error: null, item };
  }

  function removeWidget(id) {
    if (!isEditing()) return { ok: false, error: "fora do modo de edição" };
    const state = loadSettings();
    const next = state.items.filter((item) => item.id !== id);
    if (next.length === state.items.length) return { ok: false, error: "não está na grade" };
    saveSettings({ version: 2, items: next });
    const grid = gridEl();
    const block = grid && grid.querySelector(`.autotune-block[data-widget-type="${id}"]`);
    if (block) destroyBlock(block);
    syncShelf();
    return { ok: true, error: null };
  }

  function ensureGrid(root) {
    let grid = root.querySelector(".autotune-grid");
    if (grid) return grid;
    grid = document.createElement("div");
    grid.className = "autotune-grid";
    grid.dataset.cols = String(COLS);
    grid.dataset.rows = String(ROWS);
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const cell = document.createElement("div");
        cell.className = "autotune-cell";
        cell.dataset.col = String(col);
        cell.dataset.row = String(row);
        cell.style.gridColumn = String(col + 1);
        cell.style.gridRow = String(row + 1);
        grid.appendChild(cell);
      }
    }
    root.appendChild(grid);
    return grid;
  }

  function cellFromPoint(grid, clientX, clientY) {
    const rect = grid.getBoundingClientRect();
    const styles = window.getComputedStyle(grid);
    const padLeft = parseFloat(styles.paddingLeft) || 0;
    const padTop = parseFloat(styles.paddingTop) || 0;
    const padRight = parseFloat(styles.paddingRight) || 0;
    const padBottom = parseFloat(styles.paddingBottom) || 0;
    const gap = parseFloat(styles.columnGap) || 0;
    const innerW = rect.width - padLeft - padRight;
    const innerH = rect.height - padTop - padBottom;
    const colSize = (innerW - gap * (COLS - 1)) / COLS;
    const rowSize = (innerH - gap * (ROWS - 1)) / ROWS;
    const x = clientX - rect.left - padLeft;
    const y = clientY - rect.top - padTop;
    if (x < 0 || y < 0) return null;
    const col = Math.floor(x / (colSize + gap));
    const row = Math.floor(y / (rowSize + gap));
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return null;
    return { col, row };
  }

  function clearHover(grid) {
    grid.querySelectorAll(".autotune-cell").forEach((cell) => {
      cell.classList.remove("is-hover", "is-blocked");
    });
  }

  function paintHover(grid, id, cell) {
    clearHover(grid);
    if (!cell || !id) return;
    const widget = getWidget(id);
    if (!widget) return;
    const ok = fits(cell.col, cell.row, widget.cols, widget.rows, loadSettings().items);
    cellsFor(cell.col, cell.row, widget.cols, widget.rows).forEach((spot) => {
      const node = grid.querySelector(`.autotune-cell[data-col="${spot.col}"][data-row="${spot.row}"]`);
      if (node) node.classList.add(ok ? "is-hover" : "is-blocked");
    });
  }

  function bindDrag(grid) {
    let draggingId = "";

    document.querySelectorAll("[data-autotune-preview]").forEach((preview) => {
      preview.addEventListener("dragstart", (event) => {
        if (!isEditing()) {
          event.preventDefault();
          return;
        }
        draggingId = preview.getAttribute("data-autotune-preview") || "";
        if (event.dataTransfer) {
          event.dataTransfer.setData("text/plain", draggingId);
          event.dataTransfer.effectAllowed = "copy";
        }
      });
      preview.addEventListener("dragend", () => {
        draggingId = "";
        clearHover(grid);
      });
    });

    grid.addEventListener("dragover", (event) => {
      if (!isEditing() || !draggingId) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      paintHover(grid, draggingId, cellFromPoint(grid, event.clientX, event.clientY));
    }, true);

    grid.addEventListener("drop", (event) => {
      if (!isEditing()) return;
      event.preventDefault();
      const id = (event.dataTransfer && event.dataTransfer.getData("text/plain")) || draggingId;
      const cell = cellFromPoint(grid, event.clientX, event.clientY);
      clearHover(grid);
      draggingId = "";
      if (!id || !cell) return;
      place(id, cell.col, cell.row);
    }, true);
  }

  function syncEditMode(root, grid) {
    const editing = isEditing();
    root.classList.toggle("autotune-editing", editing);
    grid.classList.toggle("is-editing", editing);
    if (!editing) clearHover(grid);
  }

  function syncVisibilityFromHome() {
    const home = document.getElementById("homePage");
    const root = document.getElementById("floating-cosmetics-root");
    if (!root) return;
    if (!home) {
      root.classList.remove("floating-cosmetics--hidden");
      return;
    }
    root.classList.toggle("floating-cosmetics--hidden", home.classList.contains("hidden"));
  }

  window.setAutoTuneHomeVisible = function (visible) {
    const root = document.getElementById("floating-cosmetics-root");
    if (!root) return;
    root.classList.toggle("floating-cosmetics--hidden", !visible);
  };

  function reloadFromStorage() {
    restore();
    syncVisibilityFromHome();
  }

  function boot() {
    const root = document.getElementById("floating-cosmetics-root");
    if (!root) return;
    const grid = ensureGrid(root);
    bindDrag(grid);
    restore();
    syncEditMode(root, grid);
    syncVisibilityFromHome();
    window.addEventListener("hashchange", () => syncEditMode(root, grid));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("user:changed", reloadFromStorage);

  window.AutoTune = {
    reloadFromStorage,
    getSettings: loadSettings,
    place,
    remove: removeWidget,
    isEditing,
    grid: { cols: COLS, rows: ROWS },
  };

  window.AutoTuneEngine = {
    getSettings: loadSettings,
    reloadFromStorage,
    place,
  };
})();
