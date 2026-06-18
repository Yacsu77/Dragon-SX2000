# Factory — Guia de funcionamento

O **Factory** é o editor visual do Dragon-SX2000. Ele permite personalizar widgets AutoTune em duas etapas:

- **Stage 1 — Visual:** sliders, cores, tipografia e controles customizados por componente.
- **Stage 2 — CSS/SCSS:** editor de CSS bruto, injetado no `<head>` com escopo por componente.

---

## Onde fica o código

| Arquivo | Função |
|---------|--------|
| `UserINTer/Factory/index.js` | Motor do Factory: overlay, controles, persistência, aplicação de estilos |
| `UserINTer/Factory/index.css` | Estilos da interface do Factory (modal, sliders, preview) |
| `Frontend/src/index.html` | Carrega o Factory antes dos widgets AutoTune |

---

## Como o Factory abre

1. O usuário clica no botão ⚙ de um widget no catálogo AutoTune.
2. O botão possui estes atributos `data-*`:

```html
<button
  type="button"
  class="autotune-row-factory-btn"
  data-open-factory="true"
  data-factory-key="autotune-widget-timer"
  data-factory-target='[data-widget-type="timer"]'
  data-factory-label="AutoTune Timer"
>
  ⚙
</button>
```

3. O Factory resolve o elemento alvo com `data-factory-target` (ou o `.floating-widget` mais próximo).
4. A **factory key** identifica o preset salvo. Para AutoTune, o padrão é:

```
autotune-widget-{tipo}
```

Exemplos: `autotune-widget-timer`, `autotune-widget-clock`.

---

## Persistência (localStorage)

Todas as configurações ficam em uma única chave:

```
autotuneFactorySettings
```

Estrutura de cada registro:

```json
{
  "autotune-widget-timer": {
    "visual": {
      "primaryColor": "#7a8cff",
      "intensity": 60,
      "objectOpacity": 100,
      "backgroundOpacity": 85,
      "textOpacity": 100,
      "borderRadius": 14,
      "minWidth": 160,
      "minHeight": 100,
      "fontFamily": "inherit",
      "fontSize": 13,
      "fontWeight": 500,
      "backgroundEnabled": true,
      "borderEnabled": true
    },
    "custom": {
      "timerDisplaySize": 32,
      "timerButtonsGap": 6
    },
    "css": "/* CSS da Stage 2 */",
    "clock": { }
  }
}
```

- `visual` — cosméticos globais da Stage 1 (painel "Cosméticos padrão").
- `custom` — sliders específicos do componente (painel "Personalização do componente").
- `css` — texto do editor da Stage 2.
- Campos extras (ex.: `clock`) — usados por plugins avançados.

---

## Stage 1 — Cosméticos globais

Definidos em `DEFAULT_VISUAL` dentro de `UserINTer/Factory/index.js`:

```javascript
const DEFAULT_VISUAL = {
  primaryColor: "#7a8cff",
  intensity: 60,
  objectOpacity: 100,
  backgroundOpacity: 85,
  textOpacity: 100,
  borderRadius: 14,
  minWidth: 160,
  minHeight: 100,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 500,
  backgroundEnabled: true,
  borderEnabled: true
};
```

Esses valores são aplicados **no elemento raiz** do widget (`.floating-widget`) pela função `applyVisualStyles()`.

### O que cada controle faz

| Controle | Propriedade CSS aplicada |
|----------|--------------------------|
| Cor principal | `backgroundColor`, `border`, `boxShadow` |
| Intensidade | intensidade da borda e do brilho |
| Transparência do objeto | `opacity` do widget inteiro |
| Transparência do fundo | alpha do `backgroundColor` |
| Transparência das letras | alpha do `color` |
| Arredondamento | `borderRadius` |
| Tamanho mínimo | `minWidth`, `minHeight` |
| Tipografia | `fontFamily`, `fontSize`, `fontWeight` |
| Ativar fundo / bordas | toggles de `backgroundColor` e `border` |

---

## Stage 1 — Personalização por componente (`CUSTOM_CONFIG`)

Para adicionar sliders globais a **um widget específico**, edite o objeto `CUSTOM_CONFIG` em `UserINTer/Factory/index.js`:

```javascript
const CUSTOM_CONFIG = {
  "autotune-widget-share": [
    {
      id: "shareInputHeight",
      label: "Altura do campo de busca",
      min: 28,
      max: 56,
      value: 34,
      unit: "px",
      selector: ".autotune-share-input",
      property: "minHeight"
    },
    {
      id: "shareHintOpacity",
      label: "Opacidade do subtitulo",
      min: 10,
      max: 100,
      value: 65,
      unit: "%",
      selector: ".autotune-share-hint",
      property: "opacity",
      transform: (n) => String(n / 100)
    }
  ]
};
```

### Campos do schema

| Campo | Descrição |
|-------|-----------|
| `id` | Chave salva em `record.custom[id]` |
| `label` | Texto exibido no painel |
| `min` / `max` / `value` | Range do slider |
| `unit` | Sufixo exibido (`px`, `%`, etc.) |
| `selector` | Seletor CSS **dentro** do widget |
| `property` | Propriedade CSS inline aplicada |
| `transform` | (opcional) converte o número antes de aplicar |

A função `applyCustomStyles()` percorre o schema e aplica `node.style[property] = valor` em todos os elementos que batem com `selector`.

### Passo a passo para adicionar um slider global a um widget

1. Crie classes CSS estáveis no HTML do widget (ex.: `.autotune-meu-btn`).
2. Adicione uma entrada em `CUSTOM_CONFIG["autotune-widget-meuTipo"]`.
3. Use a mesma factory key do botão ⚙ (`autotune-widget-meuTipo`).
4. Abra o Factory → Stage 1 → o slider aparece em "Personalização do componente".
5. Ao mover o slider, o valor é salvo automaticamente em `autotuneFactorySettings`.

---

## Stage 1 — Plugins avançados

Widgets complexos (como o **Clock**) não usam apenas `CUSTOM_CONFIG`. Eles registram um plugin:

```javascript
window.AutoTuneFactoryPlugins["autotune-widget-clock"] = {
  hideDefaultVisual: true,
  hideDefaultCustom: true,
  renderPanel(container, ctx) { /* UI customizada */ },
  applyToElement(el, record) { /* aplica config no DOM */ },
  applyToPreviewClone(clone, record) { /* preview em tempo real */ },
  destroyPanel() { /* limpa ao fechar */ }
};
```

Quando um plugin existe para a factory key:

- O painel padrão ("Cosméticos padrão" / "Personalização do componente") pode ser ocultado.
- O plugin renderiza sua própria UI em `#factoryPluginPanel`.
- Persistência usa campos extras no record (ex.: `record.clock`).

Referência completa: `UserINTer/Tabline/idget/AutoTune/Clock/factory.js`.

---

## Stage 2 — CSS/SCSS

Na Stage 2, o usuário escreve CSS livre. O Factory:

1. Salva o texto em `record.css`.
2. Injeta um `<style id="factory-style-{key}">` no `<head>`.
3. Adiciona `data-factory-scope` no elemento alvo para escopo.

Seletor de escopo gerado:

```css
[data-factory-scope="autotune-widget-timer"] {
  /* seu CSS aqui */
}
```

O botão **"Injetar Estrutura HTML"** cola o HTML atual do widget como comentário de referência no editor.

### Exemplo de CSS na Stage 2

```css
[data-factory-scope="autotune-widget-share"] .autotune-share-copy {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  letter-spacing: 0.04em;
}

[data-factory-scope="autotune-widget-share"] .autotune-share-input:focus {
  outline: 2px solid rgba(99, 102, 241, 0.5);
}
```

---

## API pública (`window.AutoTuneFactory`)

```javascript
window.AutoTuneFactory.open({ trigger, target, key, label });
window.AutoTuneFactory.close();
window.AutoTuneFactory.applyAllPersisted();
window.AutoTuneFactory.applyPersistedToElement(el);
```

| Método | Quando usar |
|--------|-------------|
| `open()` | Abrir o Factory programaticamente |
| `close()` | Fechar o overlay |
| `applyAllPersisted()` | Reaplicar todos os presets ao carregar a página |
| `applyPersistedToElement(el)` | Reaplicar preset ao spawnar um widget novo |

O engine AutoTune chama `applyPersistedToElement` automaticamente em `spawnWidget()`.

---

## Fluxo resumido

```
Usuário clica ⚙
       ↓
openFactory() lê autotuneFactorySettings[key]
       ↓
Stage 1: applyVisualStyles + applyCustomStyles (ou plugin)
Stage 2: applyCssForKey(record.css)
       ↓
Preview clona o widget vivo em tempo real
       ↓
Qualquer alteração → updateRecord() → localStorage
       ↓
Ao reabrir o app → applyAllPersisted() restaura tudo
```

---

## Checklist rápido — ligar um widget ao Factory

- [ ] Widget visível na tela com `data-factory-key="autotune-widget-{tipo}"`
- [ ] Botão ⚙ no catálogo com a mesma `data-factory-key`
- [ ] Entrada em `CUSTOM_CONFIG` (Stage 1 simples) **ou** plugin em `AutoTuneFactoryPlugins` (Stage 1 avançada)
- [ ] Classes CSS previsíveis no HTML do widget para selectors
- [ ] (Opcional) CSS customizado na Stage 2 usando `[data-factory-scope]`
