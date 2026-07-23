/**
 * Strategy de ações da sidebar — abre painel, widgets, stubs, comandos.
 */
(function () {
  const NS = (window.SidebarNS = window.SidebarNS || {});

  const strategies = {
    stub(item) {
      const message =
        (item.action && item.action.payload && item.action.payload.message) ||
        'Em desenvolvimento';
      return { handled: true, stub: true, message };
    },

    openPanel(item) {
      const url = item.url;
      if (!url) return { handled: false, reason: 'missing-url' };
      if (window.SidePanelHost && typeof window.SidePanelHost.toggle === 'function') {
        window.SidePanelHost.toggle({ url, title: item.label, itemId: item.id });
        return { handled: true };
      }
      return { handled: false, reason: 'panel-unavailable' };
    },

    openWidget(item) {
      const target = item.action && item.action.payload && item.action.payload.target;
      if (!target) return { handled: false, reason: 'missing-target' };

      if (target === 'tema') {
        if (window.DragonTheme && typeof window.DragonTheme.cycle === 'function') {
          window.DragonTheme.cycle();
        }
        return { handled: true };
      }

      if (target === 'customise') {
        if (window.Customise && typeof window.Customise.open === 'function') {
          window.Customise.open();
        } else {
          window.location.hash = 'customise-widget';
        }
        return { handled: true };
      }

      if (target === 'donate') {
        return { handled: true, stub: true, message: 'Em desenvolvimento' };
      }

      window.location.hash = String(target);
      return { handled: true };
    },

    command(item) {
      const name = item.action && item.action.payload && item.action.payload.name;
      if (name === 'switch-user' && window.UserGate?.openSwitcher) {
        window.UserGate.openSwitcher();
        return { handled: true };
      }
      if (name === 'edit-profile' && window.UserGate?.openSwitcher) {
        // Perfil editável via gate até existir editor dedicado.
        window.UserGate.openSwitcher();
        return { handled: true };
      }
      return { handled: false, reason: 'unknown-command' };
    },
  };

  function dispatch(itemOrId) {
    const item =
      typeof itemOrId === 'string'
        ? NS.Store?.getItemById(itemOrId)
        : itemOrId;

    if (!item) return { handled: false, reason: 'not-found' };

    const actionType =
      (item.action && item.action.type) ||
      (item.kind === 'url' ? 'openPanel' : 'stub');

    const strategy = strategies[actionType] || strategies.stub;
    return strategy(item);
  }

  NS.Dispatcher = { dispatch, strategies };
  window.SidebarDispatcher = NS.Dispatcher;
})();
