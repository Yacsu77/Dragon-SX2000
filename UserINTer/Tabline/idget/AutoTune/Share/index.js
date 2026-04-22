window.AutoTuneWidgets = window.AutoTuneWidgets || {};

window.AutoTuneWidgets.share = function initShareWidget(bodyEl) {
  bodyEl.innerHTML = `
    <p class="autotune-share-hint">Pesquisa rapida</p>
    <form class="autotune-share-search" data-role="searchForm">
      <input
        type="text"
        class="autotune-share-input"
        data-role="queryInput"
        placeholder="Buscar na web..."
        autocomplete="off"
      />
      <button type="submit" class="autotune-share-copy" data-action="search">Buscar</button>
    </form>
    <span class="autotune-share-status" data-role="status" aria-live="polite"></span>
  `;

  const formEl = bodyEl.querySelector('[data-role="searchForm"]');
  const inputEl = bodyEl.querySelector('[data-role="queryInput"]');
  const statusEl = bodyEl.querySelector('[data-role="status"]');

  function toSearchUrl(query) {
    return `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;
  }

  function looksLikeUrl(value) {
    return value.includes(".") && !value.includes(" ");
  }

  function normalizeUrl(value) {
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return `https://${value}`;
  }

  function runSearch(rawValue) {
    const query = String(rawValue || "").trim();
    if (!query) return;

    if (looksLikeUrl(query)) {
      if (typeof window.createTab === "function") {
        window.createTab(normalizeUrl(query));
        statusEl.textContent = "Abrindo URL em nova aba...";
      } else {
        window.open(normalizeUrl(query), "_blank");
        statusEl.textContent = "Abrindo URL...";
      }
    } else {
      if (typeof window.createTab === "function") {
        window.createTab(toSearchUrl(query), `Busca: ${query}`);
        statusEl.textContent = "Busca aberta em nova aba.";
      } else if (typeof window.performSearch === "function") {
        window.performSearch(query);
        statusEl.textContent = "Buscando...";
      } else {
        window.open(toSearchUrl(query), "_blank");
        statusEl.textContent = "Busca aberta.";
      }
    }

    inputEl.value = "";
    setTimeout(() => {
      statusEl.textContent = "";
    }, 2200);
  }

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch(inputEl.value);
  });
};
