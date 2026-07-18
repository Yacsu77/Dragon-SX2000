/**
 * Buscadores (Smart Search) — editor Factory.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  const { Keys, Store, EditorFactory, SmartSearchComponent } = NS;
  if (!Keys || EditorFactory.has(Keys.SMART)) return;

  function render(body, infoEl) {
    let draft = Store.getRecord(Keys.SMART);
    infoEl.textContent = "Buscadores — aparência do painel de busca inteligente";

    body.innerHTML = `
      <div class="customise-factory-controls">
        <section class="customise-factory-panel">
          <h4>Borda animada</h4>
          <div class="customise-factory-field">
            <label for="customiseSmartBorder">Estilo da borda</label>
            <select id="customiseSmartBorder">
              <option value="rgb">RGB (espectro animado)</option>
              <option value="solid">1 cor</option>
            </select>
          </div>
          <div class="customise-factory-field" data-role="border-color-field">
            <label for="customiseSmartBorderColor">Cor da borda</label>
            <input id="customiseSmartBorderColor" type="color" value="${draft.borderColor}" />
          </div>
          <h4>Aparência</h4>
          <div class="customise-factory-field">
            <label for="customiseSmartOpacity">Opacidade do fundo</label>
            <input id="customiseSmartOpacity" type="range" min="40" max="100" value="${draft.backgroundOpacity}" />
            <span class="customise-factory-field-value" data-role="opacity-label">${draft.backgroundOpacity}%</span>
          </div>
          <div class="customise-factory-field">
            <label for="customiseSmartFont">Tamanho da fonte</label>
            <input id="customiseSmartFont" type="range" min="90" max="140" value="${draft.fontScale}" />
            <span class="customise-factory-field-value" data-role="font-label">${draft.fontScale}%</span>
          </div>
          <div class="customise-factory-field">
            <label for="customiseSmartAnimation">Animação de abertura</label>
            <select id="customiseSmartAnimation">
              <option value="descida">Descida (renderização de cima para baixo)</option>
              <option value="none">Sem animação por item</option>
            </select>
          </div>
          <p class="customise-factory-hint">Vale para a busca do topo, do AutoTune e do Shortcuts. Aplica na próxima abertura do painel.</p>
        </section>
      </div>
      <div class="customise-factory-preview">
        <div class="customise-factory-preview-header">Preview em tempo real</div>
        <div class="customise-factory-preview-stage">
          <div class="smart-search-panel customise-smart-preview is-open" data-role="smart-preview">
            <section class="smart-search-section">
              <div class="smart-search-section__title">Sites visitados e acessos</div>
              <span class="smart-search-item"><span class="smart-search-item__main">Netflix</span><span class="smart-search-item__meta">Sessão salva</span></span>
            </section>
            <section class="smart-search-section">
              <div class="smart-search-section__title">Sugestões do Google</div>
              <span class="smart-search-item"><span class="smart-search-item__main">netflix planos</span><span class="smart-search-item__meta">Google</span></span>
              <span class="smart-search-item"><span class="smart-search-item__main">netflix login</span><span class="smart-search-item__meta">Google</span></span>
            </section>
          </div>
        </div>
      </div>
    `;

    const borderSelect = body.querySelector("#customiseSmartBorder");
    const colorField = body.querySelector('[data-role="border-color-field"]');
    const colorInput = body.querySelector("#customiseSmartBorderColor");
    const opacityInput = body.querySelector("#customiseSmartOpacity");
    const fontInput = body.querySelector("#customiseSmartFont");
    const animationSelect = body.querySelector("#customiseSmartAnimation");
    const opacityLabel = body.querySelector('[data-role="opacity-label"]');
    const fontLabel = body.querySelector('[data-role="font-label"]');
    const preview = body.querySelector('[data-role="smart-preview"]');

    borderSelect.value = draft.border;
    animationSelect.value = draft.animation;

    function hexToRgbTriplet(hex) {
      const value = String(hex || "").replace("#", "");
      const int = parseInt(value, 16);
      return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
    }

    function paint() {
      colorField.style.display = draft.border === "solid" ? "" : "none";
      preview.classList.toggle("smart-search-panel--rgb", draft.border === "rgb");
      preview.style.setProperty("--smart-bg-alpha", String(draft.backgroundOpacity / 100));
      preview.style.setProperty("--smart-font-scale", String(draft.fontScale / 100));
      if (draft.border === "solid") {
        preview.style.setProperty("--smart-led-rgb", hexToRgbTriplet(draft.borderColor));
      } else {
        preview.style.removeProperty("--smart-led-rgb");
      }
    }

    function persist(patch) {
      draft = Store.updateRecord(Keys.SMART, { ...draft, ...patch });
      paint();
    }

    borderSelect.addEventListener("change", () => persist({ border: borderSelect.value }));
    colorInput.addEventListener("input", () => persist({ borderColor: colorInput.value }));
    opacityInput.addEventListener("input", () => {
      opacityLabel.textContent = `${opacityInput.value}%`;
      persist({ backgroundOpacity: Number(opacityInput.value) });
    });
    fontInput.addEventListener("input", () => {
      fontLabel.textContent = `${fontInput.value}%`;
      persist({ fontScale: Number(fontInput.value) });
    });
    animationSelect.addEventListener("change", () => persist({ animation: animationSelect.value }));

    paint();
  }

  EditorFactory.register(Keys.SMART, {
    label: "Buscadores",
    render,
  });
})();
