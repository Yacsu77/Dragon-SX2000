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
  createTab(googleSearchUrl, `Busca: ${query.trim()}`);
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
