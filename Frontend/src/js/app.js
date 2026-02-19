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
  
  // Atualizar visibilidade da barra de abas
  if (typeof updateTabsBarVisibility === 'function') {
    updateTabsBarVisibility();
  }
  
  // Limpar barra de endereço
  const addressInput = document.getElementById('addressInput');
  if (addressInput) {
    addressInput.value = '';
  }
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
  const addressInput = document.getElementById('addressInput');
  const addressBar = document.getElementById('addressBar');
  const quickLinks = document.querySelectorAll('.quick-link');
  const backBtn = document.getElementById('backBtn');
  const forwardBtn = document.getElementById('forwardBtn');

  // Formulário de busca na página inicial
  if (searchForm) {
    searchForm.addEventListener('submit', handleSearch);
  }

  // Botão de nova aba
  if (newTabBtn) {
    newTabBtn.addEventListener('click', createNewTab);
  }


  // Barra de endereço
  if (addressBar) {
    addressBar.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAddressBar();
    });
  }

  if (addressInput) {
    addressInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddressBar();
      }
    });
  }

  // Botões de navegação
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const activeWebview = document.querySelector('webview.active');
      if (activeWebview && activeWebview.canGoBack()) {
        activeWebview.goBack();
      }
    });
  }

  if (forwardBtn) {
    forwardBtn.addEventListener('click', () => {
      const activeWebview = document.querySelector('webview.active');
      if (activeWebview && activeWebview.canGoForward()) {
        activeWebview.goForward();
      }
    });
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
  
  // Esconder barra de abas inicialmente
  if (typeof updateTabsBarVisibility === 'function') {
    setTimeout(() => updateTabsBarVisibility(), 100);
  }
}

/**
 * Processa a entrada da barra de endereço
 */
function handleAddressBar() {
  const addressInput = document.getElementById('addressInput');
  const input = addressInput.value.trim();
  
  if (!input) return;

  let url = input;
  
  // Se não começa com http:// ou https://, tratar como busca
  if (!input.startsWith('http://') && !input.startsWith('https://')) {
    // Verificar se parece uma URL (contém ponto e não tem espaços)
    if (input.includes('.') && !input.includes(' ')) {
      url = 'https://' + input;
    } else {
      // É uma busca
      performSearch(input);
      addressInput.value = '';
      return;
    }
  }

  // Criar nova aba com a URL
  createTab(url);
  addressInput.value = '';
}

// Exportar função
window.handleAddressBar = handleAddressBar;

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Exportar funções para uso global
window.showHome = showHome;
window.showBrowser = showBrowser;
