/**
 * AtalhosScreen — tela cheia de gerenciamento de atalhos.
 *
 * Papel de orquestrador (Facade): junta as camadas especializadas
 *   - ShortcutManager  → fonte de dados / persistência dos bindings
 *   - AtalhosRender    → renderização da lista (view)
 *   - AtalhosCapture   → captura da nova combinação (retângulo central)
 *
 * Mantém apenas o ciclo de vida da tela (build/open/close/focus) e a
 * ligação entre essas camadas — sem lógica de view nem de captura.
 *
 * API pública: window.AtalhosScreen = { open, close, focus, isOpen }
 */
(function () {
  const TEMPLATE_PATH = '../Telas/Atalhos/Atalhos.html';

  let overlayEl = null;
  let listEl = null;
  let isBuilt = false;
  let isOpen = false;
  let unsubscribe = null;

  function refresh() {
    if (!listEl || !window.ShortcutManager) return;
    const shortcuts = window.ShortcutManager.getAll();
    window.AtalhosRender.render(listEl, shortcuts, { onEdit: openEditor });
  }

  function findConflict(combo, selfId) {
    if (!combo || !window.ShortcutManager) return null;
    const match = window.ShortcutManager
      .getAll()
      .find((s) => s.id !== selfId && s.keys && s.keys === combo);
    return match ? (match.label || match.id) : null;
  }

  function openEditor(shortcut) {
    if (!window.AtalhosCapture) return;
    window.AtalhosCapture.open(shortcut, {
      getConflict: findConflict,
      onApply: (value) => {
        if (window.ShortcutManager) {
          window.ShortcutManager.setBinding(shortcut.id, value);
        }
        refresh();
      },
    });
  }

  async function ensureBuilt() {
    if (isBuilt) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'atalhos-screen-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');

    const response = await fetch(TEMPLATE_PATH);
    overlayEl.innerHTML = (await response.text()).trim();

    listEl = overlayEl.querySelector('[data-role="list"]');
    overlayEl.querySelector('[data-role="close"]').addEventListener('click', close);

    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });

    document.addEventListener('keydown', (e) => {
      if (isOpen && e.key === 'Escape' && !(window.AtalhosCapture && window.AtalhosCapture.isOpen)) {
        close();
      }
    });

    document.body.appendChild(overlayEl);
    isBuilt = true;
  }

  async function open() {
    await ensureBuilt();
    isOpen = true;
    overlayEl.classList.add('is-open');
    overlayEl.setAttribute('aria-hidden', 'false');

    refresh();
    // Mantém a lista sincronizada caso um binding mude por outra via.
    if (!unsubscribe && window.ShortcutManager && typeof window.ShortcutManager.onChange === 'function') {
      unsubscribe = window.ShortcutManager.onChange(() => { if (isOpen) refresh(); });
    }
  }

  function close() {
    if (!overlayEl) return;
    isOpen = false;
    overlayEl.classList.remove('is-open');
    overlayEl.setAttribute('aria-hidden', 'true');
    if (window.AtalhosCapture) window.AtalhosCapture.close();
  }

  function focus() {
    if (!isOpen) return open();
    return undefined;
  }

  function isOpenScreen() {
    return isOpen;
  }

  window.AtalhosScreen = {
    open,
    close,
    focus,
    isOpen: isOpenScreen,
  };
})();
