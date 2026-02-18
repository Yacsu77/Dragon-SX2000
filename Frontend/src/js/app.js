/**
 * Aplicação Principal do Navegador
 * Inicializa e gerencia o estado geral da aplicação
 */

/**
 * Mostra a página inicial
 */
function showHome() {
  document.getElementById('homePage').classList.remove('hidden');
  document.getElementById('browser').classList.remove('active');
  window.currentActiveTab = null;
}

/**
 * Mostra o container do navegador
 */
function showBrowser() {
  document.getElementById('homePage').classList.add('hidden');
  document.getElementById('browser').classList.add('active');
}

/**
 * Inicializa a aplicação
 */
function initApp() {
  // Event listeners
  const searchForm = document.getElementById('searchForm');
  const newTabBtn = document.getElementById('newTabBtn');
  const quickLinks = document.querySelectorAll('.quick-link');

  // Formulário de busca
  if (searchForm) {
    searchForm.addEventListener('submit', handleSearch);
  }

  // Botão de nova aba
  if (newTabBtn) {
    newTabBtn.addEventListener('click', createNewTab);
  }

  // Links rápidos
  quickLinks.forEach(link => {
    link.addEventListener('click', () => {
      const query = link.getAttribute('data-query');
      if (query) {
        quickSearch(query);
      }
    });
  });

  // Focar no input quando a página carregar
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.focus();
  }

  // Mostrar página inicial por padrão
  showHome();
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Exportar funções para uso global
window.showHome = showHome;
window.showBrowser = showBrowser;
