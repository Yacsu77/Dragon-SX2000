window.AutoTuneWidgets = window.AutoTuneWidgets || {};

window.AutoTuneWidgets.share = function initShareWidget(bodyEl) {
  bodyEl.innerHTML = `
    <p class="autotune-share-hint">Pesquisa rapida</p>
    <div class="autotune-share-search-wrap" data-role="searchWrap">
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
    </div>
    <span class="autotune-share-status" data-role="status" aria-live="polite"></span>
  `;

  const formEl = bodyEl.querySelector('[data-role="searchForm"]');
  const inputEl = bodyEl.querySelector('[data-role="queryInput"]');
  const statusEl = bodyEl.querySelector('[data-role="status"]');
  const wrapEl = bodyEl.querySelector('[data-role="searchWrap"]');
  // Sem onNavigate: navega na aba atual (padrão do SmartSearch).
  const smartController = window.SmartSearch?.attach?.(inputEl, {
    mount: wrapEl,
  });

  function runSearch(rawValue) {
    const query = String(rawValue || "").trim();
    if (!query) return;

    if (smartController) smartController.submit();
    else window.SmartSearch?.navigate?.(query);

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
