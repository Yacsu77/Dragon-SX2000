/**
 * EditarScreen — tela de ajustes (desempenho/comportamento), acessível pelo
 * botão "Editar" do canto superior direito.
 *
 * Papel de orquestrador: liga os controles da UI ao módulo PerfSettings
 * (fonte de verdade/persistência). Sem lógica de persistência aqui.
 *
 * API: window.EditarScreen = { open, close, focus, isOpen }
 */
(function () {
  const TEMPLATE_PATH = '../Telas/Editar/Editar.html';

  let overlayEl = null;
  let toggleEl = null;
  let warningEl = null;
  let restoreToggleEl = null;
  let restoreWarningEl = null;
  let isBuilt = false;
  let isOpen = false;
  let unsubscribe = null;

  function syncFromSettings() {
    if (!window.PerfSettings) return;

    if (toggleEl) {
      const on = window.PerfSettings.isRenderAllTabs();
      toggleEl.checked = on;
      if (warningEl) warningEl.hidden = !on;
    }

    if (restoreToggleEl && typeof window.PerfSettings.isRestoreSessionTabs === 'function') {
      const on = window.PerfSettings.isRestoreSessionTabs();
      restoreToggleEl.checked = on;
      if (restoreWarningEl) restoreWarningEl.hidden = !on;
    }
  }

  async function ensureBuilt() {
    if (isBuilt) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'editar-screen-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');

    const response = await fetch(TEMPLATE_PATH);
    overlayEl.innerHTML = (await response.text()).trim();

    toggleEl = overlayEl.querySelector('[data-role="toggle-render-all"]');
    warningEl = overlayEl.querySelector('[data-role="render-all-warning"]');
    restoreToggleEl = overlayEl.querySelector('[data-role="toggle-restore-session"]');
    restoreWarningEl = overlayEl.querySelector('[data-role="restore-session-warning"]');

    overlayEl.querySelector('[data-role="close"]').addEventListener('click', close);
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });

    document.addEventListener('keydown', (e) => {
      if (isOpen && e.key === 'Escape') close();
    });

    if (toggleEl) {
      toggleEl.addEventListener('change', () => {
        if (window.PerfSettings) window.PerfSettings.setRenderAllTabs(toggleEl.checked);
        if (warningEl) warningEl.hidden = !toggleEl.checked;
      });
    }

    if (restoreToggleEl) {
      restoreToggleEl.addEventListener('change', () => {
        if (window.PerfSettings && typeof window.PerfSettings.setRestoreSessionTabs === 'function') {
          window.PerfSettings.setRestoreSessionTabs(restoreToggleEl.checked);
        }
        if (restoreWarningEl) restoreWarningEl.hidden = !restoreToggleEl.checked;
      });
    }

    document.body.appendChild(overlayEl);
    isBuilt = true;
  }

  async function open() {
    await ensureBuilt();
    isOpen = true;
    overlayEl.classList.add('is-open');
    overlayEl.setAttribute('aria-hidden', 'false');

    syncFromSettings();
    if (!unsubscribe && window.PerfSettings && typeof window.PerfSettings.onChange === 'function') {
      unsubscribe = window.PerfSettings.onChange(() => { if (isOpen) syncFromSettings(); });
    }
  }

  function close() {
    if (!overlayEl) return;
    isOpen = false;
    overlayEl.classList.remove('is-open');
    overlayEl.setAttribute('aria-hidden', 'true');
  }

  function focus() {
    if (!isOpen) return open();
    return undefined;
  }

  function isOpenScreen() {
    return isOpen;
  }

  window.EditarScreen = { open, close, focus, isOpen: isOpenScreen };
})();
