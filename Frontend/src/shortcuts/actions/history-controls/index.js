/**
 * History Controls — atalho Ctrl+H para abrir o Histórico de Navegação.
 */
(function () {
  function openHistoryScreen() {
    if (window.HistoryScreen) {
      if (window.HistoryScreen.isOpen()) {
        window.HistoryScreen.focus();
      } else {
        window.HistoryScreen.open();
      }
      return;
    }

    if (window.MiniHistorico && typeof window.MiniHistorico.openHistoryFullScreen === 'function') {
      window.MiniHistorico.openHistoryFullScreen();
    }
  }

  function tryRegister() {
    if (!window.ShortcutManager) {
      setTimeout(tryRegister, 50);
      return;
    }

    window.ShortcutManager.register({
      id: 'history-open',
      label: 'Abrir histórico',
      description: 'Abre a tela completa de Histórico de Navegação.',
      defaultKeys: 'Ctrl+H',
      category: 'Navegação',
      handler: () => openHistoryScreen(),
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryRegister);
  } else {
    tryRegister();
  }
})();
