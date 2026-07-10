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
├── Browser.css         ← Layout flex; fundo opaco; modo perf-render-all
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

## Browser.css — layout e desempenho

```css
.browser-container {
  flex: 1; min-height: 0;
  background: var(--content-bg); /* evita wallpaper “vazando” ao carregar */
}
.browser-container.active { display: flex; flex-direction: column; }
webview { display: none; background: var(--content-bg); }
webview.active { display: flex; flex: 1; min-height: 0; }
```

### Modo opcional `perf-render-all`

Quando `body` tem a classe `perf-render-all` (`PerfSettings`):

- Webviews inativos ficam `position: absolute; opacity: 0` (ainda renderizados)
- Ativo: `opacity: 1; z-index: 1`
- Troca de aba sem `display: none` → sem repaint; mais CPU/RAM

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

`showBrowser()` adiciona `.active` em `#browser` → container visível e expande.

`showHome()` remove `.active` → container oculto (`display: none`).
