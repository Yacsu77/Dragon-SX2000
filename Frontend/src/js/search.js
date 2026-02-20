/**
 * Lógica de Busca do Navegador
 */

/**
 * Realiza uma busca no Google
 * @param {string} query - Termo de busca
 */
function performSearch(query) {
  if (!query || !query.trim()) return;

  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;
  
  // Verificar se há uma home tab ativa (New Tab)
  const activeTab = document.querySelector('.tab.active');
  const isHomeTab = activeTab && activeTab.dataset.id && activeTab.dataset.id.startsWith('home-tab');
  
  if (isHomeTab) {
    // Se estiver na home tab, converter para uma aba normal com a busca
    const tabId = activeTab.dataset.id;
    convertHomeTabToNormalTab(tabId, googleSearchUrl, `Busca: ${query.trim()}`);
  } else {
    // Usar aba atual se existir webview, senão criar nova
    const activeWebview = document.querySelector('webview.active');
    if (activeWebview) {
      activeWebview.src = googleSearchUrl;
    } else {
      createTab(googleSearchUrl, `Busca: ${query.trim()}`);
    }
  }
}

/**
 * Handler do formulário de busca
 * @param {Event} event - Evento do formulário
 */
function handleSearch(event) {
  event.preventDefault();
  const searchInput = document.getElementById('searchInput');
  const query = searchInput.value.trim();
  
  if (!query) return;

  performSearch(query);
  searchInput.value = '';
}

/**
 * Busca rápida usando links pré-definidos
 * @param {string} query - Termo de busca
 */
function quickSearch(query) {
  const searchInput = document.getElementById('searchInput');
  searchInput.value = query;
  performSearch(query);
}

// Exportar funções para uso global
window.handleSearch = handleSearch;
window.quickSearch = quickSearch;
window.performSearch = performSearch;
