/**
 * Barra de endereço do topo (URL vs busca).
 */
(function () {
  let fullUrl = '';

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

    if (!activeWebview || !addressInput) return;

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
    const { url } = e.detail || {};
    if (!url || url === 'about:blank') return;

    const addressInput = document.getElementById('addressInput');
    if (!addressInput) return;

    fullUrl = url;
    if (document.activeElement !== addressInput) {
      addressInput.value = getDomainFromUrl(url);
    } else {
      addressInput.value = url;
    }
  }

  function init() {
    const addressBar = document.getElementById('addressBar');
    const addressInput = document.getElementById('addressInput');

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

    if (window.SearchAnim) {
      window.SearchAnim.bindFocusBlur(addressInput, getFullUrl, getDomainFromUrl);
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
