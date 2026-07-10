# Top/ — Barra superior

**Caminho:** `Frontend/src/Top/`

---

## Responsabilidade

Barra de navegação: menu, voltar/avançar, barra de endereço. Orquestrada por `Top.js`.

---

## Estrutura

```
Top/
├── Top.html          ← Markup da nav (montado em #topRoot pelo Shell)
├── Top.css           ← .nav-bar, .nav-btn, .nav-left/right/center
├── Top.js            ← Orquestra init + botão Editar
├── Menu/
│   ├── Menu.html     ← Estrutura do painel menubar
│   ├── Menu.css
│   ├── Menu.js       ← Itens, preview, click Histórico/Favoritos/Atalhos/Editar
│   └── Menu.anim.js  ← Abrir/fechar, posicionamento
├── ButtonGo/
│   ├── ButtonGo.css
│   ├── ButtonGo.js   ← goBack(), goForward(), updateNavigationButtons()
│   └── ButtonGo.anim.js ← Estado disabled/hover
└── Search/
    ├── Search.css    ← .address-bar, .address-input
    ├── Search.js     ← URL vs busca, updateAddressBar() (só webview ativa)
    └── Search.anim.js ← Focus mostra URL; blur mostra domínio
```

---

## IDs HTML (em `Top.html`)

| ID | Módulo |
|----|--------|
| `#menuBtn` | Menu |
| `#backBtn`, `#forwardBtn` | ButtonGo |
| `#addressBar`, `#addressInput` | Search |
| `#downloadBtn`, `#arquivosBtn`, `#newTabBtn`, `#configBtn` | TopActions |
| `#editarBtn` | Tela Editar (`EditarScreen.open`) |

---

## API pública

```js
window.TopBar = { init() }
window.MainMenu = { open(), close(), toggle(), init() }
window.ButtonGo = { init(), goBack(), goForward(), updateNavigationButtons() }
window.NavSearch = { init(), handleAddressBar(), updateAddressBar(), clearAddressBar(), getDomainFromUrl() }
// Legado:
window.handleAddressBar, window.updateAddressBar, window.updateNavigationButtons
```

---

## CustomEvents escutados

| Módulo | Eventos |
|--------|---------|
| ButtonGo | `app:webview-navigated`, `app:tab-changed` |
| Search | `app:webview-navigated`, `app:tab-changed` |

---

## Menu/Menu.js

### Itens do menu

Array `MENU_ITEMS`:

```js
{ id: 'editar', label: 'Editar', placeholder: '…' }           // click → EditarScreen
{ id: 'historico', label: 'Histórico', preview: 'history' }  // MiniHistorico + HistoryScreen
{ id: 'favoritos', label: 'Favoritos', action: 'favoritos' }
{ id: 'atalhos', label: 'Atalhos', preview: 'shortcuts' }    // MiniAtalhos + AtalhosScreen
{ id: 'sobre', label: 'Sobre', placeholder: '…' }
```

| Campo / id | Efeito |
|------------|--------|
| `preview: 'history'` | `MiniHistorico.load()` |
| `preview: 'shortcuts'` | `MiniAtalhos.load()` |
| `id: 'editar'` (click) | `EditarScreen.open()` |
| `id: 'atalhos'` (click) | `AtalhosScreen.open()` |
| `id: 'historico'` (click) | `HistoryScreen.open()` |
| `action: 'favoritos'` | `Favoritos.open()` |

**Como adicionar item:** incluir objeto em `MENU_ITEMS` + handler em `handleMenuClick()` / `showPreview()`.

---

## Search/Search.js

- URL com `http(s)://` ou domínio → `createTab(url)`
- Texto com espaços → `performSearch()` (Google)
- `updateAddressBar()`: sem webview ativa → `clearAddressBar()` (Home sempre limpa)
- `onWebviewNavigated`: ignora se não for o `webview.active` (evita URL fantasma)

**Mudar motor de busca:** `Home/HomeSearch/HomeSearch.js` → `performSearch()`.

**Mudar placeholder:** `Top/Top.html` → `#addressInput`.

**Prefetch ao digitar:** `js/connectionPrefetch.js` escuta `#addressInput` (feature padrão).

---

## ButtonGo/ButtonGo.js

Chama `webview.goBack()` / `goForward()` no webview ativo. Estado sincronizado via `app:webview-navigated`.

Usado também por `shortcuts/actions/navigation-controls/` (`nav-back` / `nav-forward`).

**Mudar aparência disabled:** `ButtonGo.anim.js` → `setButtonState(btn, enabled)`.

---

## Top.js — ordem de init

```
ButtonGo → NavSearch → MainMenu → TopDownloads → TopArquivos → TopNewTab → ConfigOverview
→ #editarBtn → EditarScreen.open()
```

**Adicionar botão na nav:** editar `Top.html` + handler em `TopActions/` ou direto em `Top.js` + script em `index.html`.
