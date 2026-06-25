# AutoTune — Onde fica cada coisa

O **AutoTune** é o sistema de widgets flutuantes do Dragon-SX2000. Eles aparecem sobre a interface (principalmente na home) e podem ser arrastados, redimensionados e personalizados no Factory.

---

## Mapa de pastas

```
UserINTer/Tabline/idget/AutoTune/
├── catalog.html      ← Catálogo do painel (montado por core/Shell.js)
├── index.js          ← Motor: spawn, drag, resize, persistência de posição
├── index.css         ← Estilos dos widgets flutuantes + painel AutoTune
├── index.html        ← Página de teste local (opcional)
├── Timer/index.js    ← Widget Timer (Pomodoro)
├── Share/index.js    ← Widget Share (busca rápida)
├── Tasklist/index.js ← Widget Tasklist
├── Music/index.js    ← Widget Music (+ Music/index.css)
└── Clock/            ← Widget Clock (config, fonts, render, factory, index)
    ├── config.js
    ├── fonts.js
    ├── render.js
    ├── index.js
    ├── factory.js
    └── index.css

Frontend/src/
├── index.html        ← Shell mínimo; `#floating-cosmetics-root` + mount points
├── core/Shell.js     ← Monta background, top, tabs, wallpaper, catalog.html
├── core/manifest.css ← Agregador CSS único
├── Wallpaper/Wallpaper.html
└── js/app.js         ← Bootstrap da aplicação

UserINTer/Factory/
├── index.js          ← Editor visual (Stage 1 e Stage 2)
└── index.css
```

---

## O que cada arquivo faz

### `AutoTune/index.js` — Motor principal

Responsabilidades:

- Registrar tipos de widget em `TYPES` e `TITLES`
- Criar elementos `.floating-widget` e chamar `window.AutoTuneWidgets[tipo](bodyEl)`
- Salvar posição/tamanho/ativo em `localStorage` → chave `settingsAUTO`
- Drag, resize, colisão entre widgets, fusão Timer+Tasklist
- Expor `window.AutoTuneEngine`

### `AutoTune/{Widget}/index.js` — Widget individual

Cada widget registra sua função de init:

```javascript
window.AutoTuneWidgets = window.AutoTuneWidgets || {};

window.AutoTuneWidgets.timer = function initTimerWidget(bodyEl) {
  bodyEl.innerHTML = `...`;
  // lógica do widget
};
```

Opcionalmente, metadados de tamanho:

```javascript
window.AutoTuneWidgetMeta = window.AutoTuneWidgetMeta || {};

window.AutoTuneWidgetMeta.timer = {
  defaultWidth: 230,
  defaultHeight: 180
};
```

### `AutoTune/index.css` — Estilos compartilhados

Contém:

- Overlay do painel AutoTune (`.autotune-overlay`, catálogo, toggles)
- Chrome dos widgets flutuantes (`.floating-widget`, resize handle)
- Estilos específicos por widget (`.autotune-timer-*`, `.autotune-share-*`, etc.)

Widgets com muitos estilos podem ter CSS próprio (ex.: `Music/index.css`, `Clock/index.css`).

### `Frontend/src/index.html` — Ponto de entrada

Três coisas obrigatórias para um widget aparecer:

1. **Container na página**

```html
<div id="floating-cosmetics-root" aria-live="polite"></div>
```

2. **Linha no catálogo AutoTune** (toggle + botão Factory)

3. **Scripts carregados na ordem correta**

```html
<script src="../../UserINTer/Factory/index.js"></script>
<!-- widgets individuais -->
<script src="../../UserINTer/Tabline/idget/AutoTune/Timer/index.js"></script>
<!-- ... -->
<script src="../../UserINTer/Tabline/idget/AutoTune/index.js"></script>
```

O motor (`AutoTune/index.js`) deve ser o **último** script AutoTune.

---

## Persistência de posição (`settingsAUTO`)

Separada das configurações visuais do Factory.

```json
{
  "timer": {
    "id": "timer-1718123456789",
    "x": 120,
    "y": 80,
    "w": 230,
    "h": 180,
    "active": true
  },
  "share": null,
  "clock": {
    "id": "clock-1718123456790",
    "x": 400,
    "y": 100,
    "w": 240,
    "h": 140,
    "active": false
  }
}
```

| Campo | Significado |
|-------|-------------|
| `active: true` | Widget visível na tela |
| `active: false` | Widget oculto, posição preservada |
| `null` | Nunca foi usado |

---

## Como um widget chega na tela

```
1. Usuário abre #autotune-widget (aba AutoTune na Tabline)
   ↳ markup em UserINTer/Tabline/idget/AutoTune/catalog.html (montado por Shell.js)
2. Ativa o toggle do widget desejado
3. setPanelTypeActive() → spawnWidget()
4. createWidgetElement() cria .floating-widget
5. AutoTuneWidgets[tipo](bodyEl) monta o conteúdo
6. applyPersistedToElement() aplica preset do Factory
7. Widget é appendado em #floating-cosmetics-root
```

### Estrutura DOM gerada

```html
<div
  class="floating-widget"
  data-widget-id="timer-123"
  data-widget-type="timer"
  data-factory-key="autotune-widget-timer"
  data-factory-scope="autotune-widget-timer"
  style="left: 120px; top: 80px; width: 230px; height: 180px;"
>
  <div class="floating-widget-body">
    <!-- conteúdo do widget -->
  </div>
  <div class="floating-widget-resize"></div>
</div>
```

---

## Registro no motor — `AutoTune/index.js`

Para cada novo tipo, altere **três lugares**:

```javascript
const TYPES = ["timer", "share", "tasklist", "music", "clock"];

const TITLES = {
  timer: "Timer",
  share: "Share",
  tasklist: "Tasklist",
  music: "Music",
  clock: "Clock"
};

function emptyState() {
  return {
    timer: null,
    share: null,
    tasklist: null,
    music: null,
    clock: null
  };
}
```

Sem isso, o motor ignora o tipo na restauração e nos toggles.

---

## Catálogo no `Frontend/src/index.html`

Cada widget precisa de uma linha no catálogo:

```html
<div class="autotune-catalog-row">
  <div class="autotune-row-text">
    <strong>Clock</strong>
    <span>Relogio personalizavel</span>
  </div>
  <button
    type="button"
    class="autotune-row-factory-btn"
    data-open-factory="true"
    data-factory-key="autotune-widget-clock"
    data-factory-target='[data-widget-type="clock"]'
    data-factory-label="AutoTune Clock"
  >
    ⚙
  </button>
  <label class="autotune-panel-toggle">
    <span class="autotune-panel-toggle-label" data-autotune-panel-label="clock">Inativo</span>
    <input type="checkbox" data-autotune-panel-toggle="clock" />
    <span class="autotune-panel-switch" aria-hidden="true"></span>
  </label>
</div>
```

| Atributo | Deve coincidir com |
|----------|-------------------|
| `data-autotune-panel-toggle` | tipo em `TYPES` |
| `data-factory-key` | `autotune-widget-{tipo}` |
| `data-factory-target` | `[data-widget-type="{tipo}"]` |

---

## Visibilidade na home

Por padrão, widgets só aparecem na **página inicial**. O `app.js` chama:

```javascript
window.setAutoTuneHomeVisible(true/false);
```

Widgets marcados como persistentes em `PERSISTENT_TYPES` (ex.: `music`) ignoram essa regra.

Para tornar um widget persistente em todas as telas:

```javascript
const PERSISTENT_TYPES = new Set(["music", "clock"]);
```

E no `createWidgetElement`:

```javascript
if (PERSISTENT_TYPES.has(type)) {
  wrap.classList.add("floating-widget--persistent");
}
```

---

## Widget vs Idget (Wallpaper, Tema)

| Tipo | Onde fica | Como aparece |
|------|-----------|--------------|
| **AutoTune widget** | `AutoTune/{Nome}/` | Flutuante em `#floating-cosmetics-root` |
| **Idget (painel)** | `Tabline/idget/Wallpaper/` | Painel lateral/overlay próprio, não usa AutoTune engine |

Wallpaper e Tema **não** passam pelo catálogo AutoTune. São carregados separadamente no `index.html`.

---

## Checklist — widget aparece na tela

- [ ] `window.AutoTuneWidgets.{tipo}` registrado
- [ ] Tipo adicionado em `TYPES`, `TITLES` e `emptyState()`
- [ ] Script incluído no `Frontend/src/index.html`
- [ ] CSS incluído (se houver arquivo próprio)
- [ ] Linha no catálogo com toggle e botão ⚙
- [ ] `#floating-cosmetics-root` presente no HTML
- [ ] `AutoTune/index.js` carregado por último entre os scripts AutoTune

---

## Referências úteis

| API | Local |
|-----|-------|
| `window.AutoTuneEngine.spawnWidget(type, root, layout)` | `AutoTune/index.js` |
| `window.AutoTuneFactory.applyPersistedToElement(el)` | `Factory/index.js` |
| `window.setAutoTuneHomeVisible(bool)` | `AutoTune/index.js` |
