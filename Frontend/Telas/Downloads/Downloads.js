/**
 * Tela placeholder de Downloads.
 */
(function () {
  const TEMPLATE_PATH = '../Telas/Downloads/Downloads.html';

  let overlayEl = null;
  let isOpen = false;
  let isBuilt = false;

  async function ensureBuilt() {
    if (isBuilt) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'downloads-screen-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');

    const response = await fetch(TEMPLATE_PATH);
    overlayEl.innerHTML = (await response.text()).trim();

    overlayEl.querySelector('[data-role="close"]').addEventListener('click', close);
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });

    document.addEventListener('keydown', (e) => {
      if (isOpen && e.key === 'Escape') close();
    });

    document.body.appendChild(overlayEl);
    isBuilt = true;
  }

  async function open() {
    await ensureBuilt();
    isOpen = true;
    overlayEl.classList.add('is-open');
    overlayEl.setAttribute('aria-hidden', 'false');
  }

  function close() {
    if (!overlayEl) return;
    isOpen = false;
    overlayEl.classList.remove('is-open');
    overlayEl.setAttribute('aria-hidden', 'true');
  }

  window.DownloadsScreen = { open, close };
})();
