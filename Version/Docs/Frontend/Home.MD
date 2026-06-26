# Home/ — Página inicial (home tab)

**Caminho:** `Frontend/src/Home/`

---

## Responsabilidade

Área principal quando uma **home tab** está ativa. Hoje é **transparente** — o wallpaper/vídeo de fundo fica visível. Busca e navegação ficam na barra superior (`Top/Search`).

Subpasta `HomeSearch/` mantém lógica de busca Google reutilizada pela barra de endereço.

---

## Estrutura

```
Home/
├── Home.html           ← Vazio (comentário); área transparente
├── Home.css            ← .home-page flex:1, background transparent
├── Home.js             ← Monta template, init
└── HomeSearch/
    ├── HomeSearch.html ← Form de busca (legado; não montado na home)
    ├── HomeSearch.css
    ├── HomeSearch.js   ← performSearch(), convertHomeTabToNormalTab
    └── HomeSearch.anim.js ← Foco na barra de endereço em app:home-shown
```

---

## API pública

```js
window.Home = { init(), ensureBuilt() }
window.HomeSearch = { init(), performSearch(), quickSearch(), handleSearch() }
window.performSearch / window.handleSearch / window.quickSearch  // globais
window.HomeSearchAnim = { focusAddressBar() }
```

---

## Comportamento atual

1. `AppShell.showHome()` remove `.hidden` de `#homePage`
2. `#homePage` ocupa `flex: 1` com fundo transparente
3. Vídeo em `.background` (montado pelo Shell) aparece atrás
4. Widgets AutoTune em `#floating-cosmetics-root` visíveis via `setAutoTuneHomeVisible(true)`

---

## HomeSearch/HomeSearch.js

`performSearch(query)`:

1. Monta URL Google: `https://www.google.com/search?q=...`
2. Se aba ativa é home tab → `convertHomeTabToNormalTab(tabId, url, title)`
3. Senão → navega webview ativo ou `createTab()`

**Mudar motor de busca:** alterar URL em `performSearch()`.

**Restaurar busca central na home:** repopular `Home.html` com form + quick-links; chamar `HomeSearch.init()` em `Home.js` (como na Fase 3).

---

## HomeSearch.anim.js

Escuta `app:home-shown` → foca `#addressInput` na barra superior.

**Desativar auto-foco:** remover listener em `HomeSearch.anim.js`.

---

## Como mudar comportamento

| Objetivo | Arquivo |
|----------|---------|
| Cor de fundo na home (em vez de transparente) | `Home.css` → `.home-page` background |
| Bloquear pointer-events na home | `Home.css` → `pointer-events: none` (já ativo) |
| Quick-links na home | `Home.html` + handlers em `Home.js` |
| Lógica ao mostrar home | `core/AppShell.js` ou listener `app:home-shown` |

---

## CustomEvents

| Evento | Reação |
|--------|--------|
| `app:home-shown` | HomeSearch.anim foca barra de endereço |
