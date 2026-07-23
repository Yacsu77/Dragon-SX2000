# Browser/ — Área de navegação (webview)

**Caminho:** `Frontend/src/Browser/`

---

## Responsabilidade

Container `#browser` onde webviews são inseridos por `Tabs.core.js`. Centraliza listeners de navegação e emite `app:webview-navigated`.

---

## Estrutura

```
Browser/
├── Browser.html        ← <div class="browser-container" id="browser"> (fallback fetch)
├── Browser.css         ← Layout flex; fundo opaco; crossfade; modo perf-render-all
└── Browser.js          ← init(), setupWebviewNavigation()
```

No `index.html`, `#browser` já existe como filho direto de `body` (necessário para `flex: 1`).

---

## API pública

```js
window.Browser = { init(), setupWebviewNavigation(webview) }
window.setupWebviewNavigation  // legado
```

---

## CustomEvents emitidos

| Evento | detail | Quando |
|--------|--------|--------|
| `app:webview-navigated` | `{ url, canGoBack, canGoForward, webview }` | did-start-navigation, did-finish-load, did-navigate, did-navigate-in-page |

Escutado por: `Top/ButtonGo`, `Top/Search`, `js/historyTracker.js`.

> **Nota (v1.3):** `Top/Search` só aplica a URL se `detail.webview` for o `webview.active` — evita URL fantasma na Home.

---

## Browser.css — layout e troca de tela (v1.4)

```css
.browser-container {
  flex: 1; min-height: 0;
  background: var(--content-bg);
}
.browser-container.active { display: flex; flex-direction: column; }
```

### Crossfade padrão (conteúdo ↔ conteúdo)

- Webviews empilhados com `position: absolute` quando o browser está `.active`
- Inativos: `opacity: 0`
- Ativo: `opacity: 1; z-index: 1`
- Ao trocar: anterior `.active.is-leaving` (z-index 2) some em ~320ms; a nova já está opaca por baixo
- **Sem** `filter: blur()` no `<webview>` (custo GPU alto / hitch na barra)
- **Sem** baixar opacity do container `#browser` no flip (causava “piscar”)

### Split / multi-floating

Regras com `!important` forçam `opacity: 1` e `filter: none` em `.janelas-pane-visible` — evita painel preso em blur residual.

### Modo opcional `perf-render-all`

Quando `body` tem a classe `perf-render-all` (`PerfSettings`):

- Mesmo empilhamento por opacity (todas pintadas)
- Mais CPU/RAM

Controlado pela Tela Editar — ver [`Editar.MD`](./Editar.MD).

**Não envolver `#browser` em wrapper sem flex** — quebra altura do webview.

---

## Browser.js

`setupWebviewNavigation(webview)` — registra listeners no webview criado por `Tabs.core.js`.

**Adicionar listener global de navegação:** estender `emitNavigated()` ou adicionar listener em `setupWebviewNavigation`.

**Mudar quem recebe eventos:** outros módulos escutam `app:webview-navigated` (preferível a editar Browser.js).

---

## Integração com Tabs

`Tabs.core.js` → `buildWebview()` + `attachWebviewListeners()`:

```js
const webview = buildWebview(url, tabId); // partition persist:dragon
document.getElementById('browser').appendChild(webview);
setupWebviewNavigation(webview);
trackWebviewHistory(webview);
```

**Mudar permissões / partição:** `buildWebview()` em `Tabs.core.js`.

---

## AppShell

`showBrowser()` / `showHome()` — ver [`core.MD`](./core.MD): crossfade New Tab ↔ conteúdo via `body.surface-crossfade`.

---

## Ver também

- [`Tabs.MD`](./Tabs.MD) · [`Janelas.MD`](./Janelas.MD) · [`Log v1.4.MD`](../../Lançamento/Log%20v1.4.MD)
