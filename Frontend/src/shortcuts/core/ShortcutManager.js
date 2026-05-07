/**
 * Dragon SX2000 — Shortcut Manager
 *
 * Registry global de atalhos do navegador. Centraliza:
 *   - Registro de atalhos (id, label, description, defaultKeys, handler)
 *   - Parse de combos como "Ctrl+Space", "Ctrl+Shift+K", "Alt+T"
 *   - Persistência de bindings customizados pelo usuário em localStorage
 *   - Listener global de keydown que dispara o handler correspondente
 *   - API para a futura tela de configuração:
 *       getAll()           → lista de todos os atalhos com keys atuais
 *       setBinding(id, k)  → muda os keys de um shortcut
 *       resetBinding(id)   → volta para o defaultKeys
 *       onChange(fn)       → assina mudanças de bindings
 *
 * Convenção das keys (formato canônico):
 *   - Modificadores: "Ctrl", "Shift", "Alt", "Meta" (na ordem)
 *   - Tecla principal: nome do KeyboardEvent.key OU "Space" / "Tab" / etc.
 *     "Ctrl+Space", "Ctrl+Shift+K", "Alt+ArrowLeft", "F5"
 *   - Letras maiúsculas para A-Z; "Plus" e "Minus" para +/-.
 *
 * Uso:
 *   ShortcutManager.register({
 *     id: "search-palette",
 *     label: "Abrir paleta de busca",
 *     description: "Abre a barra de pesquisa flutuante.",
 *     defaultKeys: "Ctrl+Space",
 *     handler: (event, ctx) => { ... },
 *   });
 *   ShortcutManager.start(); // chamado uma vez no boot
 */
(function () {
  const STORAGE_KEY = "dragonsx.shortcuts.bindings";
  const ORDERED_MODS = ["Ctrl", "Shift", "Alt", "Meta"];
  const SAFE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

  /** @type {Map<string, ShortcutEntry>} */
  const registry = new Map();
  /** @type {Set<(snapshot: ShortcutEntry[]) => void>} */
  const changeListeners = new Set();

  let started = false;
  let bootSnapshotPending = false;

  /**
   * @typedef {Object} ShortcutEntry
   * @property {string} id
   * @property {string} label
   * @property {string} description
   * @property {string} defaultKeys     Combo no formato canônico ("Ctrl+Space")
   * @property {string} keys            Combo atual (default ou customizado)
   * @property {(event: KeyboardEvent, ctx: object) => void | boolean} handler
   * @property {boolean} [allowInInputs] Se true, dispara mesmo dentro de input/textarea
   * @property {string} [category]      Categoria para agrupar na settings page
   */

  function loadBindings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveBindings(bindings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings || {}));
    } catch (_) { /* ignore */ }
  }

  function emitChange() {
    const snapshot = getAll();
    changeListeners.forEach((fn) => {
      try { fn(snapshot); } catch (_) { /* ignore */ }
    });
  }

  /**
   * Normaliza uma string de combo para o formato canônico.
   * Aceita variações como "ctrl+space", "CTRL + space", "control+space".
   * @param {string} raw
   * @returns {string}
   */
  function normalizeCombo(raw) {
    if (!raw || typeof raw !== "string") return "";
    const tokens = raw.split("+").map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0) return "";

    const mods = new Set();
    let main = "";

    tokens.forEach((token) => {
      const lower = token.toLowerCase();
      switch (lower) {
        case "ctrl":
        case "control":
          mods.add("Ctrl"); break;
        case "shift":
          mods.add("Shift"); break;
        case "alt":
        case "option":
          mods.add("Alt"); break;
        case "meta":
        case "cmd":
        case "win":
        case "super":
          mods.add("Meta"); break;
        case "space":
        case "spacebar":
          main = "Space"; break;
        case "esc":
        case "escape":
          main = "Escape"; break;
        case "enter":
        case "return":
          main = "Enter"; break;
        case "plus":
          main = "Plus"; break;
        case "minus":
          main = "Minus"; break;
        default:
          // Capitaliza letras isoladas (a → A); preserva F-keys e setas como vêm
          if (/^[a-z]$/i.test(token)) main = token.toUpperCase();
          else main = token;
      }
    });

    if (!main) return "";
    const orderedMods = ORDERED_MODS.filter((m) => mods.has(m));
    return [...orderedMods, main].join("+");
  }

  /**
   * Constrói o combo canônico a partir de um KeyboardEvent.
   * @param {KeyboardEvent} event
   * @returns {string}
   */
  function comboFromEvent(event) {
    const mods = [];
    if (event.ctrlKey) mods.push("Ctrl");
    if (event.shiftKey) mods.push("Shift");
    if (event.altKey) mods.push("Alt");
    if (event.metaKey) mods.push("Meta");

    let main = event.key;
    // KeyboardEvent.key para Space é " "; usamos a forma legível.
    if (main === " " || event.code === "Space") main = "Space";
    else if (main && main.length === 1 && /[a-z]/i.test(main)) main = main.toUpperCase();
    // Algumas teclas vêm como "Esc", "Del" — padronizamos
    if (main === "Esc") main = "Escape";
    if (main === "Del") main = "Delete";

    if (!main) return "";
    return [...mods, main].join("+");
  }

  /**
   * Registra um atalho. Chamadas com mesmo id substituem o anterior.
   * @param {Omit<ShortcutEntry, "keys">} entry
   */
  function register(entry) {
    if (!entry || !entry.id || typeof entry.handler !== "function") {
      throw new Error("ShortcutManager.register: id e handler são obrigatórios");
    }
    const defaultKeys = normalizeCombo(entry.defaultKeys || "");
    const bindings = loadBindings();
    const customKeys = normalizeCombo(bindings[entry.id] || "");

    const stored = {
      id: entry.id,
      label: entry.label || entry.id,
      description: entry.description || "",
      defaultKeys,
      keys: customKeys || defaultKeys,
      handler: entry.handler,
      allowInInputs: !!entry.allowInInputs,
      category: entry.category || "Geral",
    };
    registry.set(entry.id, stored);

    if (started && !bootSnapshotPending) emitChange();
  }

  function unregister(id) {
    if (registry.delete(id) && started) emitChange();
  }

  /**
   * Retorna todos os atalhos registrados com seus bindings atuais.
   * @returns {ShortcutEntry[]}
   */
  function getAll() {
    return Array.from(registry.values()).map((entry) => ({ ...entry }));
  }

  /**
   * Muda o binding de um atalho. Persiste em localStorage.
   * Aceita "" para "desabilitar" o atalho (não dispara).
   * @param {string} id
   * @param {string} keys
   */
  function setBinding(id, keys) {
    const entry = registry.get(id);
    if (!entry) return false;
    const normalized = normalizeCombo(keys || "");
    entry.keys = normalized || ""; // string vazia = desabilitado
    const bindings = loadBindings();
    if (entry.keys === entry.defaultKeys) {
      delete bindings[id];
    } else {
      bindings[id] = entry.keys;
    }
    saveBindings(bindings);
    emitChange();
    return true;
  }

  function resetBinding(id) {
    const entry = registry.get(id);
    if (!entry) return false;
    entry.keys = entry.defaultKeys;
    const bindings = loadBindings();
    delete bindings[id];
    saveBindings(bindings);
    emitChange();
    return true;
  }

  function onChange(fn) {
    if (typeof fn !== "function") return () => {};
    changeListeners.add(fn);
    return () => changeListeners.delete(fn);
  }

  /**
   * Verifica se o foco atual está em um campo editável.
   * Usado para evitar disparar atalhos enquanto o usuário digita.
   */
  function isEditingTarget(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    return SAFE_TAGS.has(target.tagName);
  }

  function handleKeydown(event) {
    const combo = comboFromEvent(event);
    if (!combo) return;

    // Itera registry e dispara o primeiro match
    for (const entry of registry.values()) {
      if (!entry.keys) continue;
      if (entry.keys !== combo) continue;
      if (!entry.allowInInputs && isEditingTarget(event.target)) continue;

      const ctx = { combo, source: "keydown" };
      let result;
      try {
        result = entry.handler(event, ctx);
      } catch (err) {
        console.warn("[Shortcuts] handler throw:", entry.id, err);
        continue;
      }
      // Por padrão, atalhos consomem o evento. Handler pode retornar false
      // explicitamente para deixar passar.
      if (result !== false) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
  }

  function start() {
    if (started) return;
    started = true;
    bootSnapshotPending = false;
    document.addEventListener("keydown", handleKeydown, true);
    emitChange();
  }

  function stop() {
    if (!started) return;
    started = false;
    document.removeEventListener("keydown", handleKeydown, true);
  }

  // Marca que estamos no fluxo de boot — durante o boot, varios `register`
  // são chamados em sequência e queremos um único `emitChange` no final
  // (feito pelo `start()`).
  bootSnapshotPending = true;

  window.ShortcutManager = {
    register,
    unregister,
    getAll,
    setBinding,
    resetBinding,
    onChange,
    start,
    stop,
    normalizeCombo,
    comboFromEvent,
  };
})();
