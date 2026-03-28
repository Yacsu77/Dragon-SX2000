/**
 * Conteúdo do cosmético Share (copiar URL da barra de endereço).
 * @param {HTMLElement} bodyEl - .floating-widget-body
 */
window.AutoTuneWidgets = window.AutoTuneWidgets || {};

window.AutoTuneWidgets.share = function initShareWidget(bodyEl) {
  bodyEl.innerHTML = `
    <p class="autotune-share-hint">Link atual</p>
    <div class="autotune-share-url" data-role="url" title="">—</div>
    <button type="button" class="autotune-share-copy" data-action="copy">Copiar link</button>
    <span class="autotune-share-status" data-role="status" aria-live="polite"></span>
  `;

  const urlEl = bodyEl.querySelector('[data-role="url"]');
  const statusEl = bodyEl.querySelector('[data-role="status"]');

  function readUrl() {
    const input = document.getElementById("addressInput");
    if (input && input.value.trim()) return input.value.trim();
    return "";
  }

  function refresh() {
    const u = readUrl();
    urlEl.textContent = u || "Nenhum link na barra";
    urlEl.title = u;
  }

  refresh();
  const input = document.getElementById("addressInput");
  if (input) {
    input.addEventListener("input", refresh);
    input.addEventListener("change", refresh);
  }
  window.addEventListener("focusin", refresh);

  bodyEl.addEventListener("click", (e) => {
    if (!e.target.closest('[data-action="copy"]')) return;
    const u = readUrl();
    if (!u) {
      statusEl.textContent = "Nada para copiar.";
      return;
    }
    navigator.clipboard.writeText(u).then(
      () => {
        statusEl.textContent = "Copiado.";
        setTimeout(() => {
          statusEl.textContent = "";
        }, 2000);
      },
      () => {
        statusEl.textContent = "Nao foi possivel copiar.";
      }
    );
  });
};
