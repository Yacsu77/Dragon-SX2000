# NewComponet — Como criar um widget do zero

Este guia mostra o passo a passo completo para criar um novo widget AutoTune chamado **NewWindow** — um botão que abre uma nova janela/aba — desde o arquivo do componente até aparecer no Factory (Stage 1 e Stage 2).

Use o **Share** como referência simples e o **Clock** como referência avançada (plugin Factory).

---

## Visão geral das etapas

| # | Onde | O que fazer |
|---|------|-------------|
| 1 | `AutoTune/NewWindow/index.js` | Criar o widget |
| 2 | `AutoTune/index.css` | Estilos base do widget |
| 3 | `AutoTune/index.js` | Registrar tipo no motor |
| 4 | `Frontend/src/index.html` | Catálogo + scripts + CSS |
| 5 | `Factory/index.js` | Sliders Stage 1 (`CUSTOM_CONFIG`) |
| 6 | Factory UI | Personalizar na Stage 1 e Stage 2 |

---

## Passo 1 — Criar o widget

**Arquivo:** `UserINTer/Tabline/idget/AutoTune/NewWindow/index.js`

**Função desta pasta:** conter a lógica e o HTML do componente. Cada subpasta em `AutoTune/` = um widget independente.

```javascript
window.AutoTuneWidgets = window.AutoTuneWidgets || {};
window.AutoTuneWidgetMeta = window.AutoTuneWidgetMeta || {};

window.AutoTuneWidgetMeta.newwindow = {
  defaultWidth: 200,
  defaultHeight: 90,
  minWidth: 140,
  minHeight: 70
};

window.AutoTuneWidgets.newwindow = function initNewWindowWidget(bodyEl) {
  bodyEl.innerHTML = `
    <p class="autotune-newwindow-hint">Nova janela</p>
    <button type="button" class="autotune-newwindow-btn" data-action="open">
      Abrir nova aba
    </button>
    <span class="autotune-newwindow-status" data-role="status" aria-live="polite"></span>
  `;

  const btn = bodyEl.querySelector('[data-action="open"]');
  const status = bodyEl.querySelector('[data-role="status"]');

  btn.addEventListener("click", () => {
    const url = "https://www.google.com";
    if (typeof window.createTab === "function") {
      window.createTab(url, "Nova aba");
      status.textContent = "Aba criada.";
    } else {
      window.open(url, "_blank");
      status.textContent = "Janela aberta.";
    }
    setTimeout(() => { status.textContent = ""; }, 2000);
  });
};
```

### Regras importantes

- O nome da função em `AutoTuneWidgets.{tipo}` deve ser **igual** ao tipo usado no motor (`newwindow`).
- Use classes com prefixo `autotune-{tipo}-*` — o Factory usa esses seletores na Stage 1.
- O parâmetro `bodyEl` é o `.floating-widget-body` — injete o HTML nele, não crie o wrapper flutuante manualmente.

---

## Passo 2 — Estilos do widget

**Arquivo:** `UserINTer/Tabline/idget/AutoTune/index.css`

**Função:** estilos visuais base (layout interno do widget).

Adicione ao final do arquivo:

```css
/* NewWindow */
.autotune-newwindow-hint {
  margin: 0 0 8px;
  font-size: 11px;
  opacity: 0.7;
}

.autotune-newwindow-btn {
  width: 100%;
  min-height: 36px;
  border: none;
  border-radius: 8px;
  background: rgba(122, 140, 255, 0.35);
  color: #eef2ff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.autotune-newwindow-btn:hover {
  background: rgba(122, 140, 255, 0.5);
}

.autotune-newwindow-status {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.75;
  min-height: 14px;
}
```

> Se o widget tiver muitos estilos, crie `NewWindow/index.css` e linke no `index.html` (como o Music e o Clock).

---

## Passo 3 — Registrar no motor AutoTune

**Arquivo:** `UserINTer/Tabline/idget/AutoTune/index.js`

**Função:** o motor só spawna tipos que conhece.

### 3.1 — Adicionar ao array `TYPES`

```javascript
const TYPES = ["timer", "share", "tasklist", "music", "clock", "newwindow"];
```

### 3.2 — Adicionar título

```javascript
const TITLES = {
  timer: "Timer",
  share: "Share",
  tasklist: "Tasklist",
  music: "Music",
  clock: "Clock",
  newwindow: "NewWindow"
};
```

### 3.3 — Adicionar ao estado vazio

```javascript
function emptyState() {
  return {
    timer: null,
    share: null,
    tasklist: null,
    music: null,
    clock: null,
    newwindow: null
  };
}
```

Sem essas três alterações, o toggle do catálogo não funciona e a posição não é salva.

---

## Passo 4 — Expor no Frontend

**Arquivo:** `Frontend/src/index.html`

**Função:** carregar assets e exibir o widget no catálogo AutoTune.

### 4.1 — Linha no catálogo (dentro de `.autotune-catalog`)

```html
<div class="autotune-catalog-row">
  <div class="autotune-row-text">
    <strong>NewWindow</strong>
    <span>Botao para abrir nova aba</span>
  </div>
  <button
    type="button"
    class="autotune-row-factory-btn"
    data-open-factory="true"
    data-factory-key="autotune-widget-newwindow"
    data-factory-target='[data-widget-type="newwindow"]'
    data-factory-label="AutoTune NewWindow"
    title="Factory do NewWindow"
    aria-label="Factory do NewWindow"
  >
    ⚙
  </button>
  <label class="autotune-panel-toggle">
    <span class="autotune-panel-toggle-label" data-autotune-panel-label="newwindow">Inativo</span>
    <input type="checkbox" data-autotune-panel-toggle="newwindow" />
    <span class="autotune-panel-switch" aria-hidden="true"></span>
  </label>
</div>
```

### 4.2 — Script do widget (antes de `AutoTune/index.js`)

```html
<script src="../../UserINTer/Tabline/idget/AutoTune/NewWindow/index.js"></script>
<script src="../../UserINTer/Tabline/idget/AutoTune/index.js"></script>
```

Ordem obrigatória:

1. Widgets individuais (`NewWindow/index.js`, etc.)
2. `AutoTune/index.js` por último

### 4.3 — Testar na tela

1. Abra o app → aba **AutoTune**
2. Ative o toggle **NewWindow**
3. O widget deve aparecer flutuando na home

---

## Passo 5 — Stage 1 no Factory (sliders globais)

**Arquivo:** `UserINTer/Factory/index.js`

**Função:** adicionar controles visuais específicos do widget no painel "Personalização do componente".

Localize `CUSTOM_CONFIG` e adicione:

```javascript
"autotune-widget-newwindow": [
  {
    id: "newwindowBtnHeight",
    label: "Altura do botao",
    min: 28,
    max: 64,
    value: 36,
    unit: "px",
    selector: ".autotune-newwindow-btn",
    property: "minHeight"
  },
  {
    id: "newwindowBtnRadius",
    label: "Borda do botao",
    min: 0,
    max: 24,
    value: 8,
    unit: "px",
    selector: ".autotune-newwindow-btn",
    property: "borderRadius"
  },
  {
    id: "newwindowHintOpacity",
    label: "Opacidade do subtitulo",
    min: 10,
    max: 100,
    value: 70,
    unit: "%",
    selector: ".autotune-newwindow-hint",
    property: "opacity",
    transform: (n) => String(n / 100)
  }
]
```

### O que acontece automaticamente

- Ao abrir o Factory (⚙), os sliders aparecem na Stage 1.
- Valores são salvos em `autotuneFactorySettings["autotune-widget-newwindow"].custom`.
- Cosméticos **globais** (cor, fundo, tipografia do widget inteiro) vêm do painel "Cosméticos padrão" — já funcionam sem código extra.

### Factory key — deve ser consistente em todos os lugares

```
autotune-widget-newwindow
```

Usada em:

- `data-factory-key` no botão ⚙
- `CUSTOM_CONFIG` no Factory
- `data-factory-key` gerado em `createWidgetElement()` → `autotune-widget-${type}`

---

## Passo 6 — Stage 2 no Factory (CSS livre)

**Nenhum código extra necessário.** A Stage 2 já funciona para qualquer widget com factory key.

### Como usar

1. Ative o widget NewWindow na tela
2. Clique em ⚙ → aba **Stage 2 - CSS/SCSS**
3. Escreva CSS usando o escopo do widget:

```css
[data-factory-scope="autotune-widget-newwindow"] .autotune-newwindow-btn {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4);
  transition: transform 0.15s ease;
}

[data-factory-scope="autotune-widget-newwindow"] .autotune-newwindow-btn:hover {
  transform: scale(1.03);
}

[data-factory-scope="autotune-widget-newwindow"] .autotune-newwindow-hint {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
```

4. O CSS é salvo em `record.css` e injetado via `<style id="factory-style-autotune-widget-newwindow">`.

### Dica: Injetar Estrutura HTML

O botão na Stage 2 cola o HTML atual do widget como referência nos comentários do editor — útil para descobrir classes disponíveis.

---

## Passo 7 (opcional) — Stage 1 avançada com plugin

Se o widget precisar de UI de configuração complexa (como o Clock — múltiplos elementos, posição livre, importação de fontes), crie um plugin:

**Arquivo:** `UserINTer/Tabline/idget/AutoTune/NewWindow/factory.js`

```javascript
window.AutoTuneFactoryPlugins = window.AutoTuneFactoryPlugins || {};

window.AutoTuneFactoryPlugins["autotune-widget-newwindow"] = {
  hideDefaultVisual: false,
  hideDefaultCustom: true,

  renderPanel(container, ctx) {
    container.innerHTML = `<section class="factory-panel">...</section>`;
    // bind eventos → ctx.onUpdate({ meuCampo: valor })
  },

  applyToElement(el, record) {
    // aplicar record.meuCampo no DOM
  },

  applyToPreviewClone(clone, record) {
    this.applyToElement(clone, record);
  },

  destroyPanel() {}
};
```

Carregue o script **antes** de `Factory/index.js` ou junto dos outros scripts do widget (o Factory resolve plugins lazy ao abrir).

Referência completa: `UserINTer/Tabline/idget/AutoTune/Clock/factory.js`.

---

## Resumo do fluxo de dados

```
NewWindow/index.js
    ↓ registra AutoTuneWidgets.newwindow
AutoTune/index.js
    ↓ spawnWidget("newwindow") → createWidgetElement
Frontend/index.html
    ↓ toggle ativa → widget em #floating-cosmetics-root
Factory/index.js
    ↓ CUSTOM_CONFIG + DEFAULT_VISUAL + record.css
localStorage autotuneFactorySettings["autotune-widget-newwindow"]
    ↓ applyPersistedToElement ao spawnar
Widget renderizado com preset salvo
```

---

## Checklist final

- [ ] `UserINTer/Tabline/idget/AutoTune/NewWindow/index.js` criado
- [ ] Classes CSS `autotune-newwindow-*` definidas
- [ ] `TYPES`, `TITLES`, `emptyState()` atualizados em `AutoTune/index.js`
- [ ] Catálogo + script em `Frontend/src/index.html`
- [ ] Entrada em `CUSTOM_CONFIG` em `Factory/index.js`
- [ ] Widget ativa no catálogo e aparece na home
- [ ] Factory Stage 1 mostra sliders customizados
- [ ] Factory Stage 2 aceita CSS com `[data-factory-scope="autotune-widget-newwindow"]`
- [ ] Fechar e reabrir o app restaura posição (`settingsAUTO`) e visual (`autotuneFactorySettings`)

---

## Erros comuns

| Problema | Causa provável |
|----------|----------------|
| Toggle não faz nada | Tipo ausente em `TYPES` ou script não carregado |
| Widget aparece sem estilo salvo | Factory key diferente entre HTML e `CUSTOM_CONFIG` |
| Sliders não aparecem na Stage 1 | Falta entrada em `CUSTOM_CONFIG["autotune-widget-{tipo}"]` |
| CSS Stage 2 não aplica | Seletor sem `[data-factory-scope="..."]` ou widget não estava ativo ao salvar |
| ⚙ abre Factory vazio | Widget não está na tela — ative o toggle antes de abrir o Factory |
