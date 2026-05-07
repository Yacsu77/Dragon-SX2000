/**
 * Tab Controls — atalhos sem UI para gerenciar abas
 *
 * Registrados:
 *   - Ctrl+T          → abrir nova aba (home tab)
 *   - Ctrl+W          → fechar aba ativa
 *   - Ctrl+Tab        → próxima aba (com wrap-around)
 *   - Ctrl+Shift+Tab  → aba anterior (com wrap-around)
 *
 * Reusa as APIs globais expostas por `Frontend/src/js/tabs.js`:
 *   window.createNewTab(), window.closeTab(id), window.activateTab(id)
 *
 * Próxima/anterior é resolvida lendo a ordem visual do DOM (`.tabs .tab`),
 * o que respeita reordenações feitas pelo usuário no futuro.
 */
(function () {
  function getTabsInOrder() {
    return Array.from(document.querySelectorAll(".tabs .tab"));
  }

  function getActiveTabId() {
    const active = document.querySelector(".tabs .tab.active");
    return active ? active.dataset.id : null;
  }

  function openNewTab() {
    if (typeof window.createNewTab === "function") {
      window.createNewTab();
    } else if (typeof window.createTab === "function") {
      window.createTab("about:blank", "Nova Aba");
    }
  }

  function closeActiveTab() {
    const id = getActiveTabId();
    if (!id) return;
    if (typeof window.closeTab === "function") {
      window.closeTab(id);
    }
  }

  function cycleTab(direction) {
    const tabs = getTabsInOrder();
    if (tabs.length === 0) return;

    const activeId = getActiveTabId();
    let currentIndex = tabs.findIndex((t) => t.dataset.id === activeId);
    if (currentIndex === -1) currentIndex = 0;

    const nextIndex = ((currentIndex + direction) % tabs.length + tabs.length) % tabs.length;
    const nextId = tabs[nextIndex] && tabs[nextIndex].dataset.id;
    if (!nextId || nextId === activeId) return;

    if (typeof window.activateTab === "function") {
      window.activateTab(nextId);
    }
  }

  function tryRegister() {
    if (!window.ShortcutManager) {
      setTimeout(tryRegister, 50);
      return;
    }
    const SM = window.ShortcutManager;

    SM.register({
      id: "tab-new",
      label: "Nova aba",
      description: "Abre uma nova aba na página inicial.",
      defaultKeys: "Ctrl+T",
      category: "Abas",
      handler: () => openNewTab(),
    });

    SM.register({
      id: "tab-close",
      label: "Fechar aba",
      description: "Fecha a aba atualmente ativa.",
      defaultKeys: "Ctrl+W",
      category: "Abas",
      handler: () => closeActiveTab(),
    });

    SM.register({
      id: "tab-next",
      label: "Próxima aba",
      description: "Alterna para a próxima aba (com retorno ao início).",
      defaultKeys: "Ctrl+Tab",
      category: "Abas",
      // allowInInputs: false (padrão) — Tab dentro de input deve funcionar
      // como navegação de campo, não como troca de aba.
      handler: () => cycleTab(1),
    });

    SM.register({
      id: "tab-prev",
      label: "Aba anterior",
      description: "Alterna para a aba anterior (com retorno ao fim).",
      defaultKeys: "Ctrl+Shift+Tab",
      category: "Abas",
      handler: () => cycleTab(-1),
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryRegister);
  } else {
    tryRegister();
  }
})();
