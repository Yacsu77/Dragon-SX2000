/**
 * AtalhosRender — renderização da lista de atalhos (camada de view).
 *
 * Responsabilidade única: transformar a lista de atalhos do ShortcutManager
 * em DOM, agrupada por categoria, com o botão "Editar" à direita.
 * Não lê nem grava bindings; apenas dispara callbacks.
 *
 * API:
 *   AtalhosRender.render(container, shortcuts, { onEdit })
 */
(function () {
  function fmtKeys(keys) {
    return window.AtalhosFormat ? window.AtalhosFormat.humanize(keys) : (keys || "Não definido");
  }

  function groupByCategory(shortcuts) {
    const groups = new Map();
    shortcuts.forEach((s) => {
      const cat = s.category || "Geral";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(s);
    });
    return groups;
  }

  function buildKeysBadge(shortcut) {
    const badge = document.createElement("span");
    const empty = window.AtalhosFormat && window.AtalhosFormat.isEmpty(shortcut.keys);
    badge.className = "atalhos-row__keys" + (empty ? " atalhos-row__keys--empty" : "");
    badge.textContent = fmtKeys(shortcut.keys);
    return badge;
  }

  function buildRow(shortcut, onEdit) {
    const row = document.createElement("div");
    row.className = "atalhos-row";
    row.dataset.id = shortcut.id;

    const info = document.createElement("div");
    info.className = "atalhos-row__info";

    const label = document.createElement("div");
    label.className = "atalhos-row__label";
    label.textContent = shortcut.label || shortcut.id;
    info.appendChild(label);

    if (shortcut.description) {
      const desc = document.createElement("div");
      desc.className = "atalhos-row__desc";
      desc.textContent = shortcut.description;
      info.appendChild(desc);
    }

    const right = document.createElement("div");
    right.className = "atalhos-row__right";
    right.appendChild(buildKeysBadge(shortcut));

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "atalhos-row__edit";
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", () => {
      if (typeof onEdit === "function") onEdit(shortcut);
    });
    right.appendChild(editBtn);

    row.appendChild(info);
    row.appendChild(right);
    return row;
  }

  function render(container, shortcuts, opts = {}) {
    if (!container) return;
    container.innerHTML = "";

    if (!shortcuts || shortcuts.length === 0) {
      const empty = document.createElement("div");
      empty.className = "atalhos-empty";
      empty.textContent = "Nenhum atalho registrado.";
      container.appendChild(empty);
      return;
    }

    const groups = groupByCategory(shortcuts);
    groups.forEach((items, category) => {
      const section = document.createElement("section");
      section.className = "atalhos-group";

      const heading = document.createElement("h2");
      heading.className = "atalhos-group__title";
      heading.textContent = category;
      section.appendChild(heading);

      items.forEach((s) => section.appendChild(buildRow(s, opts.onEdit)));
      container.appendChild(section);
    });
  }

  window.AtalhosRender = { render };
})();
