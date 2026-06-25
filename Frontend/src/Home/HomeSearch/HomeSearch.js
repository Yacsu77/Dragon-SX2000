/**
 * Busca da página inicial (Google).
 */
(function () {
  const TEMPLATE_PATH = 'Home/HomeSearch/HomeSearch.html';

  let isBuilt = false;

  function performSearch(query) {
    if (!query || !query.trim()) return;

    if (typeof window.setHistoryTransitionType === 'function') {
      window.setHistoryTransitionType('search');
    }

    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;
    const activeTab = document.querySelector('.tab.active');
    const isHomeTab = activeTab && activeTab.dataset.id && activeTab.dataset.id.startsWith('home-tab');

    if (isHomeTab) {
      const tabId = activeTab.dataset.id;
      if (typeof window.convertHomeTabToNormalTab === 'function') {
        window.convertHomeTabToNormalTab(tabId, googleSearchUrl, `Busca: ${query.trim()}`);
      }
    } else {
      const activeWebview = document.querySelector('webview.active');
      if (activeWebview) {
        activeWebview.src = googleSearchUrl;
      } else if (typeof window.createTab === 'function') {
        window.createTab(googleSearchUrl, `Busca: ${query.trim()}`);
      }
    }
  }

  function handleSearch(event) {
    event.preventDefault();
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const query = searchInput.value.trim();
    if (!query) return;

    performSearch(query);
    searchInput.value = '';
  }

  function quickSearch(query) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = query;
    performSearch(query);
  }

  async function ensureBuilt() {
    if (isBuilt) return;

    const mount = document.getElementById('homeSearchMount');
    if (!mount) return;

    const response = await fetch(TEMPLATE_PATH);
    mount.innerHTML = (await response.text()).trim();

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
      searchForm.addEventListener('submit', handleSearch);
    }

    isBuilt = true;
  }

  async function init() {
    await ensureBuilt();
    if (window.HomeSearchAnim) window.HomeSearchAnim.bind();
  }

  window.HomeSearch = { init, ensureBuilt, performSearch, quickSearch, handleSearch };
  window.performSearch = performSearch;
  window.handleSearch = handleSearch;
  window.quickSearch = quickSearch;
})();
