/**
 * Menu principal com mini visualizadores (estilo Menubar).
 */
(function () {
  const MENU_ITEMS = [
    { id: 'editar', label: 'Editar', placeholder: 'Ferramentas de edição em breve.' },
    { id: 'historico', label: 'Histórico', preview: 'history' },
    { id: 'favoritos', label: 'Favoritos', placeholder: 'Seus favoritos aparecerão aqui em breve.' },
    { id: 'atalhos', label: 'Atalhos', placeholder: 'Lista de atalhos personalizados em breve.' },
    { id: 'sobre', label: 'Sobre', placeholder: 'Dragon SX2000 — Navegue com estilo e velocidade.' },
  ];

  let rootEl = null;
  let previewEl = null;
  let isOpen = false;
  let activePreviewId = null;

  function buildMenu() {
    if (rootEl) return;

    rootEl = document.createElement('div');
    rootEl.className = 'main-menu';
    rootEl.setAttribute('aria-hidden', 'true');
    rootEl.innerHTML = `
      <div class="main-menu__panel" role="menubar">
        <ul class="main-menu__list" data-role="menu-list"></ul>
        <div class="main-menu__preview" data-role="preview">
          <div class="main-menu__preview-placeholder" data-role="preview-placeholder">
            Passe o mouse sobre uma opção para ver a pré-visualização.
          </div>
        </div>
      </div>
    `;

    const listEl = rootEl.querySelector('[data-role="menu-list"]');
    previewEl = rootEl.querySelector('[data-role="preview"]');

    MENU_ITEMS.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'main-menu__item';
      li.setAttribute('role', 'none');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'main-menu__trigger';
      btn.setAttribute('role', 'menuitem');
      btn.textContent = item.label;
      btn.dataset.menuId = item.id;

      btn.addEventListener('mouseenter', () => showPreview(item));
      btn.addEventListener('focus', () => showPreview(item));
      btn.addEventListener('click', () => handleMenuClick(item));

      li.appendChild(btn);
      listEl.appendChild(li);
    });

    document.body.appendChild(rootEl);

    document.addEventListener('click', (e) => {
      if (!isOpen) return;
      const menuBtn = document.getElementById('menuBtn');
      if (rootEl.contains(e.target) || (menuBtn && menuBtn.contains(e.target))) return;
      close();
    });

    document.addEventListener('keydown', (e) => {
      if (isOpen && e.key === 'Escape') close();
    });
  }

  function showPlaceholder(text) {
    previewEl.innerHTML = `<div class="main-menu__preview-placeholder">${text}</div>`;
  }

  async function showPreview(item) {
    activePreviewId = item.id;

    if (item.preview === 'history' && window.MiniHistorico) {
      previewEl.innerHTML = '';
      const panel = await window.MiniHistorico.load();
      if (activePreviewId === item.id && panel) {
        previewEl.appendChild(panel);
      }
      return;
    }

    showPlaceholder(item.placeholder || 'Em breve.');
  }

  function handleMenuClick(item) {
    if (item.id === 'historico') {
      if (window.HistoryScreen) window.HistoryScreen.open();
      close();
    }
  }

  function positionMenu() {
    const menuBtn = document.getElementById('menuBtn');
    if (!menuBtn || !rootEl) return;

    const rect = menuBtn.getBoundingClientRect();
    rootEl.style.setProperty('--menu-top', `${rect.bottom + 8}px`);
    rootEl.style.setProperty('--menu-left', `${rect.left}px`);
  }

  function open() {
    buildMenu();
    positionMenu();
    isOpen = true;
    rootEl.classList.add('is-open');
    rootEl.setAttribute('aria-hidden', 'false');
    showPlaceholder('Passe o mouse sobre uma opção para ver a pré-visualização.');
  }

  function close() {
    if (!rootEl) return;
    isOpen = false;
    rootEl.classList.remove('is-open');
    rootEl.setAttribute('aria-hidden', 'true');
    activePreviewId = null;
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function init() {
    const menuBtn = document.getElementById('menuBtn');
    if (!menuBtn) return;
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });
  }

  window.MainMenu = { open, close, toggle, init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
