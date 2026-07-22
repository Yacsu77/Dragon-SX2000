/**
 * Barra de endereço do topo (URL vs busca).
 */
(function () {
  let fullUrl = '';
  let smartController = null;

  function getDomainFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  }

  function getFullUrl() {
    return fullUrl;
  }

  function clearAddressBar() {
    fullUrl = '';
    const addressInput = document.getElementById('addressInput');
    if (addressInput) addressInput.value = '';
  }

  function handleAddressBar() {
    const addressInput = document.getElementById('addressInput');
    if (!addressInput) return;
    if (smartController) {
      smartController.submit();
      return;
    }

    const input = addressInput.value.trim();
    if (!input) return;

    let url = input;

    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      if (input.includes('.') && !input.includes(' ')) {
        url = 'https://' + input;
        if (typeof window.setHistoryTransitionType === 'function') {
          window.setHistoryTransitionType('typed');
        }
      } else {
        if (typeof window.setHistoryTransitionType === 'function') {
          window.setHistoryTransitionType('search');
        }
        if (typeof window.performSearch === 'function') {
          window.performSearch(input);
        }
        addressInput.value = '';
        return;
      }
    } else if (typeof window.setHistoryTransitionType === 'function') {
      window.setHistoryTransitionType('typed');
    }

    if (typeof window.createTab === 'function') {
      window.createTab(url);
    }
    addressInput.value = '';
  }

  function updateAddressBar() {
    const activeWebview = document.querySelector('webview.active');
    const addressInput = document.getElementById('addressInput');

    if (!addressInput) return;

    // Aba Home/principal (sem webview ativa): a barra deve ficar sempre
    // limpa e disponível para pesquisa.
    if (!activeWebview) {
      clearAddressBar();
      return;
    }

    try {
      const url = activeWebview.getURL();
      if (url && url !== 'about:blank') {
        fullUrl = url;
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

  function onWebviewNavigated(e) {
    const { url, webview } = e.detail || {};
    if (!url || url === 'about:blank') return;

    // Ignorar navegações de abas em segundo plano. Só a webview ativa pode
    // atualizar a barra; caso contrário, a última aba aberta acabava
    // sobrescrevendo a URL da aba Home/principal ao terminar de carregar.
    const activeWebview = document.querySelector('webview.active');
    if (!activeWebview) return;
    if (webview && webview !== activeWebview) return;

    const addressInput = document.getElementById('addressInput');
    if (!addressInput) return;

    fullUrl = url;
    if (document.activeElement !== addressInput) {
      addressInput.value = getDomainFromUrl(url);
    } else {
      addressInput.value = url;
    }
  }

  function reloadActivePage() {
    const reloadBtn = document.getElementById('addressReloadBtn');
    const activeWebview = document.querySelector('webview.active');
    if (!activeWebview || typeof activeWebview.reload !== 'function') return;
    try {
      activeWebview.reload();
      if (reloadBtn) {
        reloadBtn.classList.remove('is-spinning');
        void reloadBtn.offsetWidth;
        reloadBtn.classList.add('is-spinning');
        setTimeout(() => reloadBtn.classList.remove('is-spinning'), 700);
      }
    } catch (_) {
      /* ignore */
    }
  }

  function init() {
    const addressBar = document.getElementById('addressBar');
    const addressInput = document.getElementById('addressInput');
    const reloadBtn = document.getElementById('addressReloadBtn');

    if (addressBar) {
      addressBar.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddressBar();
      });
    }

    if (reloadBtn) {
      reloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        reloadActivePage();
      });
    }

    if (window.SearchAnim) {
      window.SearchAnim.bindFocusBlur(addressInput, getFullUrl, getDomainFromUrl);
    }
    if (addressInput && window.SmartSearch) {
      smartController = window.SmartSearch.attach(addressInput, {
        mount: document.querySelector('.nav-search-wrap') || addressBar,
        // O painel abre abaixo da barra de abas, nunca por cima dela.
        avoid: '#tabsRoot',
      });
    }

    document.addEventListener('app:webview-navigated', onWebviewNavigated);
    document.addEventListener('app:tab-changed', () => updateAddressBar());
  }

  window.NavSearch = {
    init,
    handleAddressBar,
    updateAddressBar,
    clearAddressBar,
    getDomainFromUrl,
  };

  window.handleAddressBar = handleAddressBar;
  window.updateAddressBar = updateAddressBar;
})();
