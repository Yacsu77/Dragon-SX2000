/**
 * Animações da barra de endereço (focus: URL completa / blur: domínio).
 */
(function () {
  function bindFocusBlur(addressInput, getFullUrl, getDomainFromUrl) {
    if (!addressInput) return;

    addressInput.addEventListener('focus', () => {
      const fullUrl = getFullUrl();
      if (fullUrl) {
        addressInput.value = fullUrl;
      }
    });

    addressInput.addEventListener('blur', () => {
      const fullUrl = getFullUrl();
      if (fullUrl && getDomainFromUrl) {
        addressInput.value = getDomainFromUrl(fullUrl);
      }
    });
  }

  window.SearchAnim = { bindFocusBlur };
})();
