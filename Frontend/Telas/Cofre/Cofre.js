/**
 * Gerenciador de senhas (Cofre) — lista só o nome dos sites e permanece trancado.
 * Reveal/salvar/autofill ficam no sistema de senhas da barra.
 */
(function () {
  const TEMPLATE_PATH = '../Telas/Cofre/Cofre.html';
  const CSS_HREF = '../Telas/Cofre/Cofre.css';

  let overlayEl = null;
  let isOpen = false;
  let isBuilt = false;

  function userId() {
    return window.UserSession?.getActiveUserId?.() || null;
  }

  function ensureCss() {
    if (document.querySelector(`link[href="${CSS_HREF}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    document.head.appendChild(link);
  }

  async function ensureBuilt() {
    if (isBuilt) return;
    ensureCss();

    overlayEl = document.createElement('div');
    overlayEl.className = 'cofre-screen-overlay';
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

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  async function renderList() {
    const list = overlayEl.querySelector('[data-role="list"]');
    const empty = overlayEl.querySelector('[data-role="empty"]');
    list.innerHTML = '';

    let sites = [];
    try {
      if (window.PasswordVaultAdapter?.listSites) {
        sites = await window.PasswordVaultAdapter.listSites();
      } else {
        const uid = userId();
        const items = uid ? await window.VaultApi.list(uid) : [];
        const map = new Map();
        (items || []).forEach((item) => {
          let site = item.origin || '';
          try {
            site = new URL(item.origin).hostname.replace(/^www\./i, '');
          } catch (_) { /* keep */ }
          if (!map.has(site)) map.set(site, true);
        });
        sites = Array.from(map.keys()).map((site) => ({ site }));
      }
    } catch (_) {
      sites = [];
    }

    if (!sites.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    sites.forEach((entry) => {
      const li = document.createElement('li');
      li.className = 'cofre-screen__item cofre-screen__item--site';
      li.innerHTML = `<strong>${escapeHtml(entry.site)}</strong>`;
      list.appendChild(li);
    });
  }

  async function open() {
    await ensureBuilt();
    // Sempre trancado visualmente — sem painel de revelar/editar.
    await renderList();
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

  document.addEventListener('user:changed', () => {
    if (isOpen) renderList().catch(() => {});
  });

  window.CofreScreen = { open, close };
})();
