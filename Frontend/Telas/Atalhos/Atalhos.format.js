/**
 * AtalhosFormat — utilitário de apresentação de combos.
 *
 * Responsabilidade única: converter o combo canônico do ShortcutManager
 * ("Ctrl+Space", "Ctrl+Mouse3", "") em partes legíveis para exibição.
 * Não conhece DOM nem estado — apenas transforma strings.
 */
(function () {
  const TOKEN_LABELS = {
    Ctrl: "Ctrl",
    Shift: "Shift",
    Alt: "Alt",
    Meta: "Meta",
    Space: "Espaço",
    Escape: "Esc",
    Enter: "Enter",
    Plus: "+",
    Minus: "−",
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    Tab: "Tab",
  };

  // MouseEvent.button: 3 = voltar, 4 = avançar, demais = laterais.
  const MOUSE_LABELS = {
    Mouse3: "Mouse ◄",
    Mouse4: "Mouse ►",
  };

  function labelForToken(token) {
    if (MOUSE_LABELS[token]) return MOUSE_LABELS[token];
    if (/^Mouse[0-9]+$/.test(token)) return "Mouse " + token.slice(5);
    return TOKEN_LABELS[token] || token;
  }

  /**
   * Divide o combo em tokens legíveis. Ex.: "Ctrl+Space" → ["Ctrl", "Espaço"].
   * Combo vazio → [].
   * @param {string} combo
   * @returns {string[]}
   */
  function toTokens(combo) {
    if (!combo || typeof combo !== "string") return [];
    return combo.split("+").filter(Boolean).map(labelForToken);
  }

  /**
   * Texto plano do combo. Ex.: "Ctrl + Espaço". Vazio → placeholder.
   * @param {string} combo
   * @param {string} [emptyText]
   * @returns {string}
   */
  function humanize(combo, emptyText = "Não definido") {
    const tokens = toTokens(combo);
    return tokens.length ? tokens.join(" + ") : emptyText;
  }

  function isEmpty(combo) {
    return !combo || !combo.trim();
  }

  window.AtalhosFormat = { toTokens, humanize, isEmpty, labelForToken };
})();
