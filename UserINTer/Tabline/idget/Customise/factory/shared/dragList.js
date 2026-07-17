/**
 * Shared — lista arrastável / toggle (Radial + Topo Global).
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.DragList) return;

  /**
   * Bind drag-reorder em rows com [data-drag-id].
   * @param {HTMLElement} list
   * @param {{ onReorder: (ids: string[]) => void, getActiveIds?: () => string[] }} options
   */
  function bindReorder(list, options) {
    if (!list || typeof options?.onReorder !== "function") return;
    let dragId = null;

    list.querySelectorAll("[data-drag-id]").forEach((row) => {
      const id = row.getAttribute("data-drag-id");
      row.setAttribute("draggable", "true");

      row.addEventListener("dragstart", (event) => {
        dragId = id;
        row.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        try {
          event.dataTransfer.setData("text/plain", id);
        } catch (_) { /* ignore */ }
      });

      row.addEventListener("dragend", () => {
        row.classList.remove("is-dragging");
        dragId = null;
        list.querySelectorAll(".is-drop-target").forEach((el) => el.classList.remove("is-drop-target"));
      });

      row.addEventListener("dragover", (event) => {
        if (!dragId || dragId === id) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        row.classList.add("is-drop-target");

        const rect = row.getBoundingClientRect();
        const before = event.clientY < rect.top + rect.height / 2;
        const dragging = list.querySelector(`[data-drag-id="${dragId}"]`);
        if (!dragging || dragging === row) return;
        if (before) list.insertBefore(dragging, row);
        else list.insertBefore(dragging, row.nextSibling);
      });

      row.addEventListener("dragleave", () => row.classList.remove("is-drop-target"));

      row.addEventListener("drop", (event) => {
        event.preventDefault();
        row.classList.remove("is-drop-target");
        const ids = Array.from(list.querySelectorAll("[data-drag-id]")).map((el) =>
          el.getAttribute("data-drag-id")
        );
        const activeFilter = typeof options.getActiveIds === "function" ? options.getActiveIds() : null;
        const next = activeFilter
          ? ids.filter((itemId) => activeFilter.includes(itemId))
          : ids;
        dragId = null;
        options.onReorder(next);
      });
    });
  }

  /**
   * Reorder simples (só itens ativos na lista) — usado pelo Radial.
   */
  function bindActiveReorder(list, getItems, setItems, onDone) {
    if (!list) return;
    let dragId = null;

    list.querySelectorAll("[data-drag-id]").forEach((row) => {
      row.setAttribute("draggable", "true");
      row.addEventListener("dragstart", (event) => {
        dragId = row.getAttribute("data-drag-id");
        event.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      });
      row.addEventListener("drop", (event) => {
        event.preventDefault();
        const targetId = row.getAttribute("data-drag-id");
        if (!dragId || !targetId || dragId === targetId) return;
        const items = getItems().slice();
        const from = items.indexOf(dragId);
        const to = items.indexOf(targetId);
        if (from < 0 || to < 0) return;
        items.splice(from, 1);
        items.splice(to, 0, dragId);
        dragId = null;
        setItems(items);
        onDone();
      });
    });
  }

  NS.DragList = { bindReorder, bindActiveReorder };
})();
