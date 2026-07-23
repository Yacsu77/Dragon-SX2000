/**
 * Search Palette — editor Factory.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  const { Keys, Store, EditorFactory, Utils, SearchPaletteComponent, SearchPreview } = NS;
  if (!Keys || EditorFactory.has(Keys.SEARCH)) return;

  function render(body, infoEl) {
    let draft = Store.getRecord(Keys.SEARCH);
    infoEl.textContent = "Search Palette — aparência da barra (Ctrl+Espaço)";

    const safePlaceholder = Utils.escapeAttr(draft.placeholder || SearchPaletteComponent.DEFAULTS.placeholder);

    body.innerHTML = `
      <div class="customise-factory-controls">
        <section class="customise-factory-panel">
          <h4>Aparência</h4>
          <div class="customise-factory-field">
            <label for="customiseSearchColor">Cor de destaque</label>
            <input id="customiseSearchColor" type="color" value="${draft.color}" />
          </div>
          <div class="customise-factory-field">
            <label for="customiseSearchWidth">Largura</label>
            <input id="customiseSearchWidth" type="range" min="420" max="760" value="${draft.width}" />
            <span class="customise-factory-field-value" data-role="width-label">${draft.width}px</span>
          </div>
          <div class="customise-factory-field">
            <label for="customiseSearchOpacity">Opacidade do fundo</label>
            <input id="customiseSearchOpacity" type="range" min="40" max="100" value="${draft.backgroundOpacity}" />
            <span class="customise-factory-field-value" data-role="opacity-label">${draft.backgroundOpacity}%</span>
          </div>
          <div class="customise-factory-field">
            <label for="customiseSearchPlaceholder">Placeholder</label>
            <input id="customiseSearchPlaceholder" type="text" value="${safePlaceholder}" maxlength="80" />
          </div>
          <p class="customise-factory-hint">Atalho padrão: Ctrl + Espaço. Alterações aplicam na próxima abertura da paleta.</p>
        </section>
      </div>
      <div class="customise-factory-preview">
        <div class="customise-factory-preview-header">Preview em tempo real</div>
        <div class="customise-factory-preview-stage customise-factory-preview-stage--search">
          <div class="customise-factory-preview-search" data-role="preview-search">
            <div class="customise-factory-preview-search-shell">
              <div class="customise-factory-preview-search-form">
                <span class="customise-factory-preview-search-icon" aria-hidden="true">⌕</span>
                <span class="customise-factory-preview-search-placeholder" data-role="preview-placeholder">${safePlaceholder}</span>
                <span class="customise-factory-preview-search-btn">Buscar</span>
              </div>
              <div class="customise-factory-preview-search-hint">Enter para buscar · Esc para fechar</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const colorInput = body.querySelector("#customiseSearchColor");
    const widthInput = body.querySelector("#customiseSearchWidth");
    const opacityInput = body.querySelector("#customiseSearchOpacity");
    const placeholderInput = body.querySelector("#customiseSearchPlaceholder");
    const widthLabel = body.querySelector('[data-role="width-label"]');
    const opacityLabel = body.querySelector('[data-role="opacity-label"]');

    function persist() {
      draft = Store.updateRecord(Keys.SEARCH, {
        color: draft.color,
        width: draft.width,
        backgroundOpacity: draft.backgroundOpacity,
        placeholder: draft.placeholder,
      });
      SearchPreview.paint(body, draft);
    }

    colorInput.addEventListener("input", () => {
      draft.color = colorInput.value;
      persist();
    });
    widthInput.addEventListener("input", () => {
      draft.width = Number(widthInput.value);
      widthLabel.textContent = `${draft.width}px`;
      persist();
    });
    opacityInput.addEventListener("input", () => {
      draft.backgroundOpacity = Number(opacityInput.value);
      opacityLabel.textContent = `${draft.backgroundOpacity}%`;
      persist();
    });
    placeholderInput.addEventListener("input", () => {
      draft.placeholder = placeholderInput.value.trim() || SearchPaletteComponent.DEFAULTS.placeholder;
      persist();
    });

    SearchPreview.paint(body, draft);
  }

  EditorFactory.register(Keys.SEARCH, {
    label: "Search Palette",
    render,
  });
})();
