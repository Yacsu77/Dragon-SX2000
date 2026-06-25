/**
 * Menu principal com mini visualizadores (estilo Menubar).
 */
(function () {
  const TEMPLATE_PATH = 'Top/Menu/Menu.html';

  const MENU_ITEMS = [
    { id: 'editar', label: 'Editar', placeholder: 'Ferramentas de edição em breve.' },
    { id: 'historico', label: 'Histórico', preview: 'history' },
    { id: 'favoritos', label: 'Favoritos', action: 'favoritos' },
    { id: 'atalhos', label: 'Atalhos', placeholder: 'Lista de atalhos personalizados em breve.' },
    { id: 'sobre', label: 'Sobre', placeholder: 'Dragon SX2000 — Navegue com estilo e velocidade.' },
  ];

  let rootEl = null;
  let previewEl = null;
  let isOpen = false;
  let activePreviewId = null;
  let isBuilt = false;

  async function ensureBuilt() {
    if (isBuilt) return;

    const response = await fetch(TEMPLATE_PATH);
    const panelHtml = (await response.text()).trim();

    rootEl = document.createElement('div');
    rootEl.className = 'main-menu';
    rootEl.setAttribute('aria-hidden', 'true');
    rootEl.innerHTML = panelHtml;

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

    isBuilt = true;
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

    if (item.id === 'favoritos' && window.Favoritos && typeof window.Favoritos.loadPreview === 'function') {
      previewEl.innerHTML = '';
      const panel = await window.Favoritos.loadPreview();
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
      return;
    }

    if (item.id === 'favoritos') {
      if (window.Favoritos && typeof window.Favoritos.open === 'function') {
        window.Favoritos.open();
        close();
      }
    }
  }

  async function open() {
    await ensureBuilt();
    isOpen = true;
    if (window.MenuAnim) window.MenuAnim.open(rootEl);
    showPlaceholder('Passe o mouse sobre uma opção para ver a pré-visualização.');
  }

  function close() {
    if (!rootEl) return;
    isOpen = false;
    if (window.MenuAnim) window.MenuAnim.close(rootEl);
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
})();
