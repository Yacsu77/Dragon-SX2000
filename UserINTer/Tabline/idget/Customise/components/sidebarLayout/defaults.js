/**
 * Barra Lateral — adapter sobre SidebarNS.Store (fonte de verdade).
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  const { Keys, SettingsAdapterRegistry, RuntimeAdapter } = NS;
  if (!Keys || SettingsAdapterRegistry.has(Keys.SIDEBAR)) return;

  function read() {
    if (window.SidebarNS?.Store?.getState) {
      return window.SidebarNS.Store.getState();
    }
    return window.SidebarNS?.createDefaults?.() || { version: 1, items: [] };
  }

  function update(patch) {
    let next = read();
    if (patch && typeof patch === "object") {
      if (Array.isArray(patch.items)) {
        next = window.SidebarNS.Store.setState({ ...next, ...patch, items: patch.items });
      } else {
        next = window.SidebarNS.Store.setState({ ...next, ...patch });
      }
    }
    RuntimeAdapter.notifyKey(Keys.SIDEBAR);
    return next;
  }

  SettingsAdapterRegistry.register(Keys.SIDEBAR, {
    read,
    update,
  });

  NS.SidebarLayoutComponent = {
    EDITABLE: Object.freeze(["llm", "chats"]),
    SECTION_LABELS: Object.freeze({
      llm: "IA / LLM",
      chats: "Chats",
      tools: "Ferramentas",
      widgets: "Widgets",
      footer: "Conta",
    }),
    LUCIDE_OPTIONS: Object.freeze([
      "bot",
      "sparkles",
      "message-circle",
      "hash",
      "camera",
      "globe",
      "brain",
      "messages-square",
      "send",
      "radio",
    ]),
  };
})();
