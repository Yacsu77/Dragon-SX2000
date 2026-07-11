/**
 * Navigation Controls — atalhos de navegação da página ativa.
 *
 * Registrados:
 *   - nav-back      → Voltar        (sem tecla padrão; o usuário mapeia,
 *                                     inclusive um botão extra do mouse)
 *   - nav-forward   → Avançar       (sem tecla padrão)
 *   - page-reload   → Recarregar    (Ctrl+R)
 *
 * Reusa as APIs já existentes, sem duplicar lógica de navegação:
 *   window.ButtonGo.goBack() / goForward()
 *   window.CursorNavigationActions.reload()
 *
 * Todos marcados como `global` para funcionar também dentro de um site
 * (webview) — a captura é feita no processo principal (ver main.js).
 */
(function () {
  function goBack() {
    if (window.ButtonGo && typeof window.ButtonGo.goBack === "function") {
      window.ButtonGo.goBack();
    }
  }

  function goForward() {
    if (window.ButtonGo && typeof window.ButtonGo.goForward === "function") {
      window.ButtonGo.goForward();
    }
  }

  function reload() {
    if (window.CursorNavigationActions && typeof window.CursorNavigationActions.reload === "function") {
      window.CursorNavigationActions.reload();
    }
  }

  function tryRegister() {
    if (!window.ShortcutManager) {
      setTimeout(tryRegister, 50);
      return;
    }
    const SM = window.ShortcutManager;

    SM.register({
      id: "nav-back",
      label: "Voltar",
      description: "Volta para a página anterior da aba ativa.",
      defaultKeys: "", // sem tecla mapeada por padrão
      category: "Navegação",
      allowInInputs: true,
      global: true,
      handler: () => goBack(),
    });

    SM.register({
      id: "nav-forward",
      label: "Avançar",
      description: "Avança para a próxima página da aba ativa.",
      defaultKeys: "", // sem tecla mapeada por padrão
      category: "Navegação",
      allowInInputs: true,
      global: true,
      handler: () => goForward(),
    });

    SM.register({
      id: "page-reload",
      label: "Recarregar",
      description: "Recarrega a página da aba ativa.",
      defaultKeys: "Ctrl+R",
      category: "Navegação",
      allowInInputs: true,
      global: true,
      handler: () => reload(),
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryRegister);
  } else {
    tryRegister();
  }
})();
