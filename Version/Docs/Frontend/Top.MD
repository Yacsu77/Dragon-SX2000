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
├── Top.js            ← Orquestra init de todos os submódulos
├── Menu/
│   ├── Menu.html     ← Estrutura do painel menubar
│   ├── Menu.css
│   ├── Menu.js       ← Itens, preview, click Histórico/Favoritos
│   └── Menu.anim.js  ← Abrir/fechar, posicionamento
├── ButtonGo/
│   ├── ButtonGo.css
│   ├── ButtonGo.js   ← goBack(), goForward(), updateNavigationButtons()
│   └── ButtonGo.anim.js ← Estado disabled/hover
└── Search/
    ├── Search.css    ← .address-bar, .address-input
    ├── Search.js     ← URL vs busca, updateAddressBar()
    └── Search.anim.js ← Focus mostra URL; blur mostra domínio
```

---

## IDs HTML (em `Top.html`)

| ID | Módulo |
|----|--------|
| `#menuBtn` | Menu |
| `#backBtn`, `#forwardBtn` | ButtonGo |
| `#addressBar`, `#addressInput` | Search |

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

Array `MENU_ITEMS` — cada item:

```js
{ id: 'historico', label: 'Histórico', preview: 'history' }
{ id: 'favoritos', label: 'Favoritos', action: 'favoritos' }
{ id: 'editar', label: 'Editar', placeholder: '...' }
```

| Campo | Efeito |
|-------|--------|
| `preview: 'history'` | Carrega `MiniHistorico` no painel lateral |
| `action: 'favoritos'` | Click chama `Favoritos.open()` |
| `placeholder` | Texto estático no preview |

**Como adicionar item:** incluir objeto em `MENU_ITEMS` + handler em `handleMenuClick()` se tiver ação.

---

## Search/Search.js

- URL com `http(s)://` ou domínio → `createTab(url)`
- Texto com espaços → `performSearch()` (Google)
- Atualiza barra ao navegar via `app:webview-navigated`

**Mudar motor de busca:** editar `Home/HomeSearch/HomeSearch.js` → `performSearch()` (barra superior usa a mesma função global).

**Mudar placeholder:** `Top/Top.html` → `#addressInput`.

---

## ButtonGo/ButtonGo.js

Chama `webview.goBack()` / `goForward()` no webview ativo. Estado dos botões sincronizado via `app:webview-navigated`.

**Mudar aparência disabled:** `ButtonGo.anim.js` → `setButtonState(btn, enabled)`.

---

## Top.js — ordem de init

```
ButtonGo → NavSearch → MainMenu → TopDownloads → TopArquivos → TopNewTab → ConfigOverview
```

**Adicionar botão na nav:** editar `Top.html` + criar handler em `TopActions/` + registrar em `Top.js`.
