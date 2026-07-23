/**
 * AtalhosCapture — retângulo central para capturar uma nova combinação.
 *
 * Responsabilidade única: exibir um diálogo modal, ouvir a próxima
 * combinação de teclado OU botão extra do mouse e devolvê-la ao chamador.
 * Não persiste bindings (isso é responsabilidade da tela, via ShortcutManager).
 *
 * API:
 *   AtalhosCapture.open(shortcut, { onApply, getConflict })
 *     shortcut    → { id, label, keys, defaultKeys }
 *     onApply(v)  → chamado com o novo combo (string; "" = remover)
 *     getConflict(combo, selfId) → retorna label do atalho em conflito ou null
 *   AtalhosCapture.close()
 */
(function () {
  const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);

  let rootEl = null;
  let boxEl = null;
  let previewEl = null;
  let warnEl = null;
  let applyBtn = null;
  let titleEl = null;
  let currentEl = null;

  let isOpen = false;
  let capturedCombo = null;
  let activeShortcut = null;
  let callbacks = {};

  function buildDom() {
    if (rootEl) return;
    rootEl = document.createElement("div");
    rootEl.className = "atalhos-capture";
    rootEl.setAttribute("aria-hidden", "true");
    rootEl.innerHTML = `
      <div class="atalhos-capture__backdrop" data-role="backdrop"></div>
      <div class="atalhos-capture__card" role="dialog" aria-modal="true" aria-label="Editar atalho">
        <h3 class="atalhos-capture__title" data-role="title">Editar atalho</h3>
        <p class="atalhos-capture__current" data-role="current"></p>
        <div class="atalhos-capture__box" data-role="box" tabindex="0">
          <span class="atalhos-capture__hint">Pressione a combinação desejada…</span>
          <span class="atalhos-capture__preview" data-role="preview"></span>
        </div>
        <p class="atalhos-capture__warn" data-role="warn" hidden></p>
        <div class="atalhos-capture__actions">
          <button type="button" class="atalhos-capture__btn atalhos-capture__btn--ghost" data-role="reset">Restaurar padrão</button>
          <button type="button" class="atalhos-capture__btn atalhos-capture__btn--ghost" data-role="remove">Remover</button>
          <span class="atalhos-capture__spacer"></span>
          <button type="button" class="atalhos-capture__btn atalhos-capture__btn--ghost" data-role="cancel">Cancelar</button>
          <button type="button" class="atalhos-capture__btn atalhos-capture__btn--primary" data-role="apply" disabled>Aplicar</button>
        </div>
      </div>
    `;
    document.body.appendChild(rootEl);

    boxEl = rootEl.querySelector('[data-role="box"]');
    previewEl = rootEl.querySelector('[data-role="preview"]');
    warnEl = rootEl.querySelector('[data-role="warn"]');
    applyBtn = rootEl.querySelector('[data-role="apply"]');
    titleEl = rootEl.querySelector('[data-role="title"]');
    currentEl = rootEl.querySelector('[data-role="current"]');

    rootEl.querySelector('[data-role="backdrop"]').addEventListener("click", close);
    rootEl.querySelector('[data-role="cancel"]').addEventListener("click", close);
    applyBtn.addEventListener("click", () => finish(capturedCombo));
    rootEl.querySelector('[data-role="remove"]').addEventListener("click", () => finish(""));
    rootEl.querySelector('[data-role="reset"]').addEventListener("click", () => {
      finish(activeShortcut ? activeShortcut.defaultKeys || "" : "");
    });
  }

  function fmt(combo, empty) {
    return window.AtalhosFormat
      ? window.AtalhosFormat.humanize(combo, empty)
      : combo || empty;
  }

  function setPreview(combo, partialText) {
    if (partialText != null) {
      previewEl.textContent = partialText;
      previewEl.classList.add("is-partial");
    } else {
      previewEl.textContent = fmt(combo, "");
      previewEl.classList.remove("is-partial");
    }
  }

  function evaluate(combo) {
    capturedCombo = combo;
    setPreview(combo, null);

    const conflict = callbacks.getConflict
      ? callbacks.getConflict(combo, activeShortcut && activeShortcut.id)
      : null;

    if (conflict) {
      warnEl.hidden = false;
      warnEl.textContent = `Já usado por "${conflict}". Escolha outra combinação.`;
      applyBtn.disabled = true;
    } else {
      warnEl.hidden = true;
      applyBtn.disabled = false;
    }
  }

  function onKeydown(event) {
    // Captura tem prioridade sobre os atalhos globais (window > document).
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();

    if (event.key === "Escape") {
      close();
      return;
    }

    if (MODIFIER_KEYS.has(event.key)) {
      // Apenas modificadores ainda — mostra prévia parcial.
      // Hold shortcuts (ex.: menu radial) podem usar só Alt/Ctrl/etc.
      const parts = [];
      if (event.ctrlKey) parts.push("Ctrl");
      if (event.shiftKey) parts.push("Shift");
      if (event.altKey) parts.push("Alt");
      if (event.metaKey) parts.push("Meta");
      setPreview(null, (parts.join(" + ") + " + …") || "…");
      applyBtn.disabled = true;
      return;
    }

    const combo = window.ShortcutManager
      ? window.ShortcutManager.comboFromEvent(event)
      : "";
    if (combo) evaluate(combo);
  }

  function onKeyup(event) {
    if (!MODIFIER_KEYS.has(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();

    // Soltar um único modificador confirma o atalho hold (Alt, Ctrl, Meta…).
    const map = { Control: "Ctrl", Alt: "Alt", Shift: "Shift", Meta: "Meta" };
    const solo = map[event.key];
    if (!solo) return;
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
    evaluate(solo);
  }

  function onAuxClick(event) {
    if (typeof event.button !== "number" || event.button < 3) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();

    const combo = window.ShortcutManager
      ? window.ShortcutManager.comboFromMouseEvent(event)
      : "";
    if (combo) evaluate(combo);
  }

  function finish(value) {
    const cb = callbacks.onApply;
    close();
    if (typeof cb === "function") cb(value || "");
  }

  function open(shortcut, opts = {}) {
    buildDom();
    activeShortcut = shortcut || null;
    callbacks = opts;
    capturedCombo = null;

    titleEl.textContent = `Editar: ${(shortcut && shortcut.label) || "atalho"}`;
    currentEl.textContent = `Atual: ${fmt(shortcut && shortcut.keys, "Não definido")}`;
    setPreview("", "");
    warnEl.hidden = true;
    applyBtn.disabled = true;

    rootEl.classList.add("is-open");
    rootEl.setAttribute("aria-hidden", "false");
    isOpen = true;

    // Listeners na fase de captura em `window`, que roda ANTES do listener do
    // ShortcutManager (registrado em `document`), garantindo prioridade.
    window.addEventListener("keydown", onKeydown, true);
    window.addEventListener("keyup", onKeyup, true);
    window.addEventListener("auxclick", onAuxClick, true);

    void rootEl.offsetHeight;
    if (boxEl) boxEl.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    rootEl.classList.remove("is-open");
    rootEl.setAttribute("aria-hidden", "true");
    window.removeEventListener("keydown", onKeydown, true);
    window.removeEventListener("keyup", onKeyup, true);
    window.removeEventListener("auxclick", onAuxClick, true);
    activeShortcut = null;
    callbacks = {};
    capturedCombo = null;
  }

  window.AtalhosCapture = { open, close, get isOpen() { return isOpen; } };
})();
