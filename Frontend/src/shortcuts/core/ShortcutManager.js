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
   * @property {boolean} [global]       Funciona dentro de webviews
   * @property {boolean} [hold]         keydown = phase down, keyup = phase up (ex.: Alt)
   * @property {string} [category]      Categoria para agrupar na settings page
   */

  const MODIFIER_KEY_TO_COMBO = {
    Alt: "Alt",
    AltGraph: "Alt",
    Option: "Alt",
    Control: "Ctrl",
    Ctrl: "Ctrl",
    Shift: "Shift",
    Meta: "Meta",
  };

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
    syncGlobalCombos();
  }

  /**
   * Combos marcados como `global`, isto é, que devem funcionar mesmo quando o
   * foco está dentro de um site (webview). Enviados ao processo principal, que
   * os intercepta via before-input-event e reenvia para cá.
   * @returns {string[]}
   */
  function getGlobalCombos() {
    const combos = [];
    for (const entry of registry.values()) {
      if (entry.global && entry.keys) combos.push(entry.keys);
    }
    return combos;
  }

  function getGlobalHoldCombos() {
    const combos = [];
    for (const entry of registry.values()) {
      if (entry.global && entry.hold && entry.keys) combos.push(entry.keys);
    }
    return combos;
  }

  function syncGlobalCombos() {
    try {
      if (window.DragonShortcuts && typeof window.DragonShortcuts.setGlobalCombos === "function") {
        window.DragonShortcuts.setGlobalCombos(getGlobalCombos());
      }
      if (window.DragonShortcuts && typeof window.DragonShortcuts.setGlobalHoldCombos === "function") {
        window.DragonShortcuts.setGlobalHoldCombos(getGlobalHoldCombos());
      }
    } catch (_) { /* ignore */ }
  }

  /**
   * Dispara o handler do atalho cujo combo corresponde. Usado quando o combo
   * chega do processo principal (tecla pressionada dentro de um webview),
   * onde não há um KeyboardEvent real do host.
   * @param {string} combo  Combo no formato canônico ("Ctrl+Space")
   * @param {{ phase?: "down"|"up", source?: string }} [extra]
   * @returns {boolean} true se algum handler foi disparado
   */
  function triggerCombo(combo, extra) {
    const normalized = normalizeCombo(combo);
    if (!normalized) return false;
    const phase = extra && extra.phase === "up" ? "up" : "down";
    const source = (extra && extra.source) || "webview";

    for (const entry of registry.values()) {
      if (!entry.keys || entry.keys !== normalized) continue;
      if (phase === "up" && !entry.hold) continue;

      const syntheticEvent = {
        preventDefault() {},
        stopPropagation() {},
        target: null,
        repeat: false,
      };
      const ctx = { combo: normalized, source, phase };
      try {
        entry.handler(syntheticEvent, ctx);
      } catch (err) {
        console.warn("[Shortcuts] handler throw (webview):", entry.id, err);
      }
      return true;
    }
    return false;
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
          // Botão extra de mouse: "mouse3" → "Mouse3"
          if (/^mouse[0-9]+$/i.test(token)) main = "Mouse" + token.replace(/[^0-9]/g, "");
          // Capitaliza letras isoladas (a → A); preserva F-keys e setas como vêm
          else if (/^[a-z]$/i.test(token)) main = token.toUpperCase();
          else main = token;
      }
    });

    // Permite atalho só de modificador: "Alt", "Ctrl", "Shift", "Meta"
    if (!main && mods.size === 1) {
      return ORDERED_MODS.find((m) => mods.has(m)) || "";
    }
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
    const keyName = event && event.key ? String(event.key) : "";
    const bareMod = MODIFIER_KEY_TO_COMBO[keyName];
    if (bareMod) {
      // Tecla modificadora sozinha (Alt/Option no Mac, Ctrl, etc.)
      const otherDown =
        (bareMod !== "Ctrl" && event.ctrlKey) ||
        (bareMod !== "Shift" && event.shiftKey) ||
        (bareMod !== "Alt" && event.altKey) ||
        (bareMod !== "Meta" && event.metaKey);
      if (!otherDown) return bareMod;
    }

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

    if (!main || MODIFIER_KEY_TO_COMBO[main]) return "";
    return [...mods, main].join("+");
  }

  /**
   * Constrói o combo canônico a partir de um evento de mouse, considerando
   * apenas os botões extras (>= 3). Os botões esquerdo (0), central (1) e
   * direito (2) — além do scroll — são reservados e nunca viram atalho.
   * @param {MouseEvent} event
   * @returns {string}
   */
  function comboFromMouseEvent(event) {
    if (!event || typeof event.button !== "number" || event.button < 3) return "";

    const mods = [];
    if (event.ctrlKey) mods.push("Ctrl");
    if (event.shiftKey) mods.push("Shift");
    if (event.altKey) mods.push("Alt");
    if (event.metaKey) mods.push("Meta");

    return [...mods, `Mouse${event.button}`].join("+");
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
      global: !!entry.global,
      hold: !!entry.hold,
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

  /**
   * Percorre o registry e dispara o primeiro atalho cujo combo corresponde.
   * Compartilhado entre teclado e mouse (botões extras).
   * @param {string} combo
   * @param {Event} event
   * @param {string} source  "keydown" | "keyup" | "mouse"
   * @param {"down"|"up"} [phase]
   * @returns {boolean}
   */
  function dispatchCombo(combo, event, source, phase) {
    if (!combo) return false;
    const resolvedPhase = phase === "up" ? "up" : "down";

    for (const entry of registry.values()) {
      if (!entry.keys) continue;
      if (entry.keys !== combo) continue;
      if (resolvedPhase === "up" && !entry.hold) continue;
      if (!entry.allowInInputs && isEditingTarget(event.target)) continue;
      // Auto-repeat do SO não deve reabrir overlays de hold.
      if (entry.hold && resolvedPhase === "down" && event && event.repeat) continue;

      const ctx = { combo, source, phase: resolvedPhase };
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
        if (typeof event.preventDefault === "function") event.preventDefault();
        if (typeof event.stopPropagation === "function") event.stopPropagation();
      }
      return true;
    }
    return false;
  }

  function handleKeydown(event) {
    dispatchCombo(comboFromEvent(event), event, "keydown", "down");
  }

  function handleKeyup(event) {
    dispatchCombo(comboFromEvent(event), event, "keyup", "up");
  }

  // Botões extras do mouse (voltar/avançar/laterais). `auxclick` dispara para
  // botões não primários; ignoramos < 3 dentro de comboFromMouseEvent.
  function handleAuxClick(event) {
    dispatchCombo(comboFromMouseEvent(event), event, "mouse", "down");
  }

  function start() {
    if (started) return;
    started = true;
    bootSnapshotPending = false;
    document.addEventListener("keydown", handleKeydown, true);
    document.addEventListener("keyup", handleKeyup, true);
    document.addEventListener("auxclick", handleAuxClick, true);

    // Recebe combos globais capturados dentro de webviews (processo principal).
    try {
      if (window.DragonShortcuts && typeof window.DragonShortcuts.onGlobalCombo === "function") {
        window.DragonShortcuts.onGlobalCombo((payload) => {
          if (payload && typeof payload === "object") {
            triggerCombo(payload.combo, { phase: payload.phase, source: "webview" });
          } else {
            triggerCombo(payload);
          }
        });
      }
    } catch (_) { /* ignore */ }

    emitChange();
  }

  function stop() {
    if (!started) return;
    started = false;
    document.removeEventListener("keydown", handleKeydown, true);
    document.removeEventListener("keyup", handleKeyup, true);
    document.removeEventListener("auxclick", handleAuxClick, true);
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
    comboFromMouseEvent,
    getGlobalCombos,
    getGlobalHoldCombos,
    triggerCombo,
  };
})();
