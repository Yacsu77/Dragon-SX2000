/**
 * MiniAtalhos — pré-visualização de atalhos no menu principal.
 *
 * Responsabilidade única: listar apenas os 3 atalhos principais e oferecer
 * um atalho para abrir a tela completa (AtalhosScreen). Reusa o ShortcutManager
 * como fonte de dados e o AtalhosFormat para exibir os combos.
 */
(function () {
  const TEMPLATE_PATH = '../MiniTelas/MiniAtalhos/MiniAtalhos.html';

  // Os 3 atalhos principais exibidos na pré-visualização (em ordem).
  const MAIN_IDS = ['search-palette', 'tab-new', 'tab-close'];

  let rootEl = null;
  let listEl = null;
  let isBuilt = false;

  function fmtKeys(keys) {
    return window.AtalhosFormat ? window.AtalhosFormat.humanize(keys) : (keys || 'Não definido');
  }

  async function ensureBuilt() {
    if (isBuilt && rootEl && rootEl.isConnected) return;
    isBuilt = false;
    rootEl = null;

    const response = await fetch(TEMPLATE_PATH);
    const html = await response.text();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html.trim();
    rootEl = wrapper.firstElementChild;

    listEl = rootEl.querySelector('[data-role="list"]');

    rootEl.querySelector('[data-role="open-full"]').addEventListener('click', () => {
      openFullScreen();
      if (window.MainMenu) window.MainMenu.close();
    });

    isBuilt = true;
  }

  function getMainShortcuts() {
    if (!window.ShortcutManager) return [];
    const all = window.ShortcutManager.getAll();
    const byId = new Map(all.map((s) => [s.id, s]));
    return MAIN_IDS.map((id) => byId.get(id)).filter(Boolean);
  }

  function render(shortcuts) {
    listEl.innerHTML = '';
    shortcuts.forEach((s) => {
      const li = document.createElement('li');
      li.className = 'mini-atalhos__item';
      const empty = window.AtalhosFormat && window.AtalhosFormat.isEmpty(s.keys);
      li.innerHTML = `
        <span class="mini-atalhos__item-label">${s.label || s.id}</span>
        <span class="mini-atalhos__item-keys${empty ? ' mini-atalhos__item-keys--empty' : ''}">${fmtKeys(s.keys)}</span>
      `;
      listEl.appendChild(li);
    });
  }

  async function load() {
    await ensureBuilt();
    render(getMainShortcuts());
    return rootEl;
  }

  function openFullScreen() {
    if (window.AtalhosScreen && typeof window.AtalhosScreen.open === 'function') {
      window.AtalhosScreen.open();
    }
  }

  function getRoot() {
    return rootEl;
  }

  window.MiniAtalhos = { load, openFullScreen, getRoot };
})();
