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

  // Atualizar botões de navegação
  updateNavigationButtons();
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
    
    // Mostrar URL completa quando focar
    addressInput.addEventListener('focus', () => {
      if (fullUrl) {
        addressInput.value = fullUrl;
      }
    });
    
    // Mostrar apenas domínio quando perder o foco
    addressInput.addEventListener('blur', () => {
      if (fullUrl) {
        addressInput.value = getDomainFromUrl(fullUrl);
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

  // Atualizar estado dos botões de navegação
  updateNavigationButtons();

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

/**
 * Atualiza o estado dos botões de navegação (voltar/avançar)
 */
function updateNavigationButtons() {
  const backBtn = document.getElementById('backBtn');
  const forwardBtn = document.getElementById('forwardBtn');
  const activeWebview = document.querySelector('webview.active');

  if (activeWebview) {
    // Habilitar/desabilitar botão voltar
    if (backBtn) {
      if (activeWebview.canGoBack()) {
        backBtn.classList.remove('disabled');
        backBtn.style.opacity = '1';
        backBtn.style.cursor = 'pointer';
      } else {
        backBtn.classList.add('disabled');
        backBtn.style.opacity = '0.5';
        backBtn.style.cursor = 'not-allowed';
      }
    }

    // Habilitar/desabilitar botão avançar
    if (forwardBtn) {
      if (activeWebview.canGoForward()) {
        forwardBtn.classList.remove('disabled');
        forwardBtn.style.opacity = '1';
        forwardBtn.style.cursor = 'pointer';
      } else {
        forwardBtn.classList.add('disabled');
        forwardBtn.style.opacity = '0.5';
        forwardBtn.style.cursor = 'not-allowed';
      }
    }
  } else {
    // Se não há webview ativo, desabilitar ambos os botões
    if (backBtn) {
      backBtn.classList.add('disabled');
      backBtn.style.opacity = '0.5';
      backBtn.style.cursor = 'not-allowed';
    }
    if (forwardBtn) {
      forwardBtn.classList.add('disabled');
      forwardBtn.style.opacity = '0.5';
      forwardBtn.style.cursor = 'not-allowed';
    }
  }
}

/**
 * Configura listeners de navegação para um webview
 * @param {HTMLElement} webview - Elemento webview
 */
function setupWebviewNavigation(webview) {
  if (!webview) return;

  // Atualizar botões quando a navegação começar
  webview.addEventListener('did-start-navigation', () => {
    updateNavigationButtons();
  });

  // Atualizar botões e barra de endereço quando a navegação terminar
  webview.addEventListener('did-finish-load', () => {
    updateNavigationButtons();
    updateAddressBar();
  });

  // Atualizar quando a URL mudar (incluindo navegação no histórico)
  webview.addEventListener('did-navigate', (e) => {
    updateNavigationButtons();
    updateAddressBar();
  });

  webview.addEventListener('did-navigate-in-page', (e) => {
    updateNavigationButtons();
    updateAddressBar();
  });
}

/**
 * Extrai apenas o domínio de uma URL
 */
function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return url;
  }
}

/**
 * Armazena a URL completa para restaurar quando focar
 */
let fullUrl = '';

/**
 * Atualiza a barra de endereço com a URL atual do webview ativo
 */
function updateAddressBar() {
  const activeWebview = document.querySelector('webview.active');
  const addressInput = document.getElementById('addressInput');
  
  if (activeWebview && addressInput) {
    try {
      const url = activeWebview.getURL();
      if (url && url !== 'about:blank') {
        fullUrl = url;
        // Se não está focado, mostrar apenas o domínio
        if (document.activeElement !== addressInput) {
          addressInput.value = getDomainFromUrl(url);
        } else {
          addressInput.value = url;
        }
      }
    } catch (e) {
      // Ignorar erros ao obter URL
    }
  }
}

// Exportar funções para uso global
window.showHome = showHome;
window.showBrowser = showBrowser;
window.updateNavigationButtons = updateNavigationButtons;
window.setupWebviewNavigation = setupWebviewNavigation;
window.updateAddressBar = updateAddressBar;