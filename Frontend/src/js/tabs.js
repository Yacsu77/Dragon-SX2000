/**
 * Gerenciamento de Abas do Navegador
 */

let tabCount = 0;
let currentActiveTab = null;

/**
 * Cria uma nova aba
 * @param {string} url - URL para carregar na aba
 * @param {string} title - Título opcional da aba
 * @returns {string} ID da aba criada
 */
function createTab(url, title = null) {
  tabCount++;
  const tabId = "tab-" + tabCount;
  const displayTitle = title || (url.includes('google.com/search') ? 'Busca' : 'Nova Aba');

  // Criar botão da aba
  const tabButton = document.createElement("div");
  tabButton.classList.add("tab");
  tabButton.dataset.id = tabId;
  
  const titleSpan = document.createElement("span");
  titleSpan.textContent = displayTitle;
  tabButton.appendChild(titleSpan);

  // Botão de fechar
  const closeBtn = document.createElement("span");
  closeBtn.classList.add("tab-close");
  closeBtn.innerHTML = "×";
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    closeTab(tabId);
  };
  tabButton.appendChild(closeBtn);

  tabButton.onclick = () => activateTab(tabId);
  document.getElementById("tabs").appendChild(tabButton);

  // Criar webview
  const webview = document.createElement("webview");
  webview.src = url;
  webview.dataset.id = tabId;

  // Atualizar título quando a página carregar
  webview.addEventListener('page-title-updated', (e) => {
    if (e.title) {
      const titleText = e.title.length > 30 ? e.title.substring(0, 30) + '...' : e.title;
      titleSpan.textContent = titleText;
    }
  });

  document.getElementById("browser").appendChild(webview);
  activateTab(tabId);
  return tabId;
}

/**
 * Ativa uma aba específica
 * @param {string} tabId - ID da aba a ser ativada
 */
function activateTab(tabId) {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.remove("active");
  });

  document.querySelectorAll("webview").forEach(view => {
    view.classList.remove("active");
  });

  const tab = document.querySelector(`.tab[data-id="${tabId}"]`);
  const webview = document.querySelector(`webview[data-id="${tabId}"]`);
  
  if (tab && webview) {
    tab.classList.add("active");
    webview.classList.add("active");
    currentActiveTab = tabId;
    showBrowser();
  }
}

/**
 * Fecha uma aba
 * @param {string} tabId - ID da aba a ser fechada
 */
function closeTab(tabId) {
  const tab = document.querySelector(`.tab[data-id="${tabId}"]`);
  const webview = document.querySelector(`webview[data-id="${tabId}"]`);
  
  if (tab) tab.remove();
  if (webview) webview.remove();

  // Se fechou a aba ativa, mostrar home ou ativar outra
  if (currentActiveTab === tabId) {
    const remainingTabs = document.querySelectorAll('.tab');
    if (remainingTabs.length > 0) {
      const firstTabId = remainingTabs[0].dataset.id;
      activateTab(firstTabId);
    } else {
      showHome();
    }
  }
}

/**
 * Cria uma nova aba vazia (Google)
 */
function createNewTab() {
  createTab('https://google.com');
  showBrowser();
}

// Exportar funções para uso global
window.createTab = createTab;
window.activateTab = activateTab;
window.closeTab = closeTab;
window.createNewTab = createNewTab;
