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
├── Browser.css         ← Layout flex; webview 100% altura
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

---

## Browser.css — layout crítico

```css
.browser-container { flex: 1; min-height: 0; }
.browser-container.active { display: flex; flex-direction: column; }
webview.active { flex: 1; min-height: 0; }
```

**Não envolver `#browser` em wrapper sem flex** — quebra altura do webview (bug conhecido pós-Fase 7).

---

## Browser.js

`setupWebviewNavigation(webview)` — registra listeners no webview criado por `Tabs.core.js`.

**Adicionar listener global de navegação:** estender `emitNavigated()` ou adicionar listener em `setupWebviewNavigation`.

**Mudar quem recebe eventos:** outros módulos escutam `app:webview-navigated` (preferível a editar Browser.js).

---

## Integração com Tabs

`Tabs.core.js` → `attachWebviewListeners()`:

```js
document.getElementById('browser').appendChild(webview);
setupWebviewNavigation(webview);
trackWebviewHistory(webview);
```

**Mudar permissões webview:** atributos no `document.createElement('webview')` em `Tabs.core.js`.

---

## AppShell

`showBrowser()` adiciona `.active` em `#browser` → container visível e expande.

`showHome()` remove `.active` → container oculto (`display: none`).
