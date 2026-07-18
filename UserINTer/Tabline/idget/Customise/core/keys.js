/**
 * Customise — chaves e constantes compartilhadas.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.Keys) return;

  NS.Keys = Object.freeze({
    STORE: "customiseSettings",
    RADIAL: "customise-radial-menu",
    SEARCH: "customise-search-palette",
    CHROME: "dragonsx.chrome.layout",
    SMART: "dragonsx.smart-search",
  });
})();
