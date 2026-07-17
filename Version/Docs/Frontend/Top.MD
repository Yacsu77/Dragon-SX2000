# Top/ — Barra superior

**Caminho:** `Frontend/src/Top/`

---

## Responsabilidade

Barra de navegação: menu, voltar/avançar, barra de endereço, Music inline e botões da direita. Orquestrada por `Top.js` + `ChromeLayout.js`.

---

## Estrutura

```
Top/
├── Top.html            ← Markup da nav (grid: esquerda | busca | direita)
├── Top.css             ← .nav-bar grid 1fr | busca | 1fr; slots de Music
├── Top.js              ← Orquestra init + botão Editar
├── ChromeLayout.js     ← Aplica Layout Topo Global (busca, botões, Music, bordas)
├── Menu/
├── ButtonGo/
└── Search/
```

**Preferências:** `Frontend/src/settings/chromeLayoutSettings.js` → chave `dragonsx.chrome.layout`

**Customise:** `UserINTer/Tabline/idget/Customise/` → item **Layout Topo Global**  
Detalhes da arquitetura: [`Customise.md`](../Customise.md)

---

## Layout (v1.4)

```
.nav-bar  (display: grid)
├── .nav-side--left
│   ├── .nav-left          (#menuBtn, #backBtn, #forwardBtn)
│   └── #navMusicSlotLeft  (Music quando position=left)
├── .nav-center            (#addressBar — sempre no centro)
└── .nav-side--right
    ├── #navMusicSlotRight (Music quando position=right)
    └── .nav-right         (botões de ação)
```

| Token / dataset | Função |
|-----------------|--------|
| `--nav-search-width` | Largura da busca (`260–820px`) |
| `--nav-music-gap` | Espaço simétrico busca ↔ Music ↔ botões |
| `body[data-music-position]` | `left` \| `right` \| `bottom` |
| `body[data-right-slot]` | Sempre `right` (v1.4) |

A coluna do meio do grid é `minmax(0, var(--nav-search-width))`, então o slider do Customise altera o tamanho real da busca.

---

## IDs HTML (em `Top.html`)

| ID | Módulo |
|----|--------|
| `#menuBtn` | Menu |
| `#backBtn`, `#forwardBtn` | ButtonGo |
| `#addressBar`, `#addressInput` | Search |
| `#navMusicSlotLeft`, `#navMusicSlotRight` | AutoTune Music minimal |
| `#downloadBtn`, `#arquivosBtn`, `#newTabBtn`, `#configBtn` | TopActions |
| `#editarBtn` | Tela Editar (`EditarScreen.open`) |

Ordem dos botões da direita: `rightOrder` em `ChromeLayoutSettings` (arraste no Customise).

---

## API pública

```js
window.TopBar = { init() }
window.ChromeLayout = { init(), apply(), getSettings() }
window.ChromeLayoutSettings = { read(), write(), update(), reset(), DEFAULTS }
window.MainMenu = { open(), close(), toggle(), init() }
window.ButtonGo = { init(), goBack(), goForward(), updateNavigationButtons() }
window.NavSearch = { init(), handleAddressBar(), updateAddressBar(), clearAddressBar(), getDomainFromUrl() }
```

---

## CustomEvents

| Evento | Quem escuta / emite |
|--------|---------------------|
| `chrome-layout:changed` | Emitido por settings; `ChromeLayout.apply` + Music `reposition` |
| `app:webview-navigated`, `app:tab-changed` | ButtonGo, Search |

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

---

## Search/Search.js

- URL com `http(s)://` ou domínio → `createTab(url)`
- Texto com espaços → `performSearch()` (Google)
- `updateAddressBar()`: sem webview ativa → `clearAddressBar()` (Home sempre limpa)
- `onWebviewNavigated`: ignora se não for o `webview.active` (evita URL fantasma)

**Largura:** controlada por `--nav-search-width` (Customise → Busca).

**Prefetch ao digitar:** `js/connectionPrefetch.js` escuta `#addressInput`.

---

## Top.js — ordem de init

```
ChromeLayout → ButtonGo → NavSearch → MainMenu → TopDownloads → TopArquivos → TopNewTab → ConfigOverview
→ #editarBtn → EditarScreen.open()
```

**Adicionar botão na nav:** editar `Top.html` + handler em `TopActions/` + incluir em `rightOrder` / `rightItems` do Layout Topo Global.

---

## Ver também

- [`Log v1.4.MD`](../../Lançamento/Log%20v1.4.MD) — release notes
- [`Autotune.md`](../Autotune.md) — Music minimal e posições
