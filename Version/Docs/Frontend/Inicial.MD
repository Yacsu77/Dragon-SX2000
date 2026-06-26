# Frontend — Documentação modular

Guia de referência do código em `Frontend/src/` após a refatoração v1.2.

---

## Mapa da documentação

| Pasta / arquivo | Documento |
|-----------------|-----------|
| Visão geral (este arquivo) | [Inicial.MD](./Inicial.MD) |
| `index.html` | [index.MD](./index.MD) |
| `core/` | [core.MD](./core.MD) |
| `Top/` | [Top.MD](./Top.MD) |
| `TopActions/` | [TopActions.MD](./TopActions.MD) |
| `Tabs/` | [Tabs.MD](./Tabs.MD) |
| `Tabline/` | [Tabline.MD](./Tabline.MD) |
| `Home/` | [Home.MD](./Home.MD) |
| `Browser/` | [Browser.MD](./Browser.MD) |
| `Favoritos/` | [Favoritos.MD](./Favoritos.MD) |
| `Wallpaper/` | [Wallpaper.MD](./Wallpaper.MD) |
| `js/` | [js.MD](./js.MD) |
| `shortcuts/` | [shortcuts.MD](./shortcuts.MD) |

Documentação relacionada fora desta pasta:

- AutoTune / Factory → [Autotune.md](../Autotune.md), [Factory.md](../Factory.md)
- Regressão manual → [ChecklistRegressao.MD](../ChecklistRegressao.MD)
- Histórico da refatoração → [TaskPlanejamento.MD](../TaskPlanejamento.MD)

---

## Estrutura de pastas

```
Frontend/src/
├── index.html              ← Shell mínimo (~65 linhas)
├── core/                   ← Bootstrap, CSS base, AppShell, montagem HTML
├── Top/                    ← Barra superior (menu, voltar/avançar, endereço)
├── TopActions/             ← Botões direitos (Downloads, Arquivos, Nova aba, Config)
├── Tabs/                   ← Sistema de abas + webviews
├── Tabline/                ← Barra lateral de idgets
├── Home/                   ← Área da home tab (transparente / wallpaper)
├── Browser/                ← Container webview + eventos de navegação
├── Favoritos/              ← CRUD de favoritos (localStorage)
├── Wallpaper/              ← Markup do painel Wallpaper (lógica em UserINTer/)
├── js/                     ← Bootstrap (app.js), histórico, media bridge
└── shortcuts/              ← Atalhos globais de teclado
```

---

## Responsabilidades por camada

| Camada | Responsabilidade |
|--------|------------------|
| **Shell** (`index.html` + `core/Shell.js`) | Mount points vazios; carrega fragmentos HTML antes do bootstrap |
| **AppShell** | Alterna home ↔ navegador; emite `app:home-shown` / `app:browser-shown` |
| **Top + TopActions** | Interação do usuário na barra superior |
| **Tabs** | CRUD de abas, webviews, drag, animações, visibilidade da barra |
| **Tabline** | Idgets laterais; carrega scripts de `UserINTer/Tabline/idget/` |
| **Home + Browser** | Área principal: wallpaper (home) ou webview (navegação) |
| **Favoritos / Telas** | Features fullscreen (Favoritos em `src/`; Downloads/Arquivos em `Frontend/Telas/`) |
| **js/** | Serviços transversais (histórico API, tracker, bootstrap) |
| **shortcuts/** | Atalhos globais desacoplados por overlay |

---

## Padrão de módulo

Cada feature segue:

```
Modulo/
├── Modulo.html     ← markup (fetch) ou montado pelo Shell
├── Modulo.css      ← estilos estáticos
├── Modulo.js       ← lógica, estado, API pública
└── Modulo.anim.js  ← opcional: transições, RAF, classes temporárias
```

API exposta em `window.NomeModulo = { init(), ... }`.

---

## Event bus (CustomEvents)

Comunicação entre módulos via `document`:

| Evento | Emitido por | `detail` | Escutado por |
|--------|-------------|----------|--------------|
| `app:tab-changed` | `Tabs.core.js` | `{ tabId, isHomeTab }` | ButtonGo, Search, Config |
| `app:tab-created` | `Tabs.core.js` | `{ tabId, isHomeTab }` | Config |
| `app:tab-closed` | `Tabs.core.js` | `{ tabId }` | Config |
| `app:home-shown` | `AppShell.js` | `{}` | AutoTune, HomeSearch.anim |
| `app:browser-shown` | `AppShell.js` | `{}` | AutoTune, ButtonGo, Search |
| `app:webview-navigated` | `Browser.js` | `{ url, canGoBack, canGoForward, webview }` | ButtonGo, Search |

Exemplo:

```js
document.addEventListener('app:tab-changed', (e) => {
  const { tabId, isHomeTab } = e.detail;
});
```

---

## Ordem de bootstrap (`js/app.js`)

```
1. Shell.mountAll()     → background, top, tabs, wallpaper, autotune catalog
2. Browser.init()
3. Tabline.init()       → tabline + scripts UserINTer (Wallpaper, Tema, AutoTune…)
4. TopBar.init()        → Menu, ButtonGo, Search, TopActions
5. Home.init()
6. lucide.createIcons()
7. AppShell.showHome()
8. updateTabsBarVisibility()
```

Ordem de scripts no `index.html`: ver [index.MD](./index.MD).

---

## Como alterar comportamento (guia rápido)

| Quero mudar… | Onde editar |
|--------------|-------------|
| Alternar home / navegador | `core/AppShell.js` |
| Botão do menu ou itens | `Top/Menu/Menu.js` → array `MENU_ITEMS` |
| Barra de endereço / busca | `Top/Search/Search.js` |
| Nova aba, fechar, ativar | `Tabs/Tabs.core.js` |
| Drag ou animação de abas | `Tabs/Tabs.reorder.js`, `Tabs/Tabs.anim.js` |
| Esconder barra com 1 home tab | `Tabs/Tabs.visibility.js` |
| Idgets laterais | `Tabline/Tabline.html`, `Tabline/Tabline.js` |
| Botão Downloads / Arquivos / Config | `TopActions/<Nome>/` |
| Favoritos | `Favoritos/Favoritos.js` |
| Atalhos de teclado | `shortcuts/actions/` ou `shortcuts/overlays/` |
| Tema claro/escuro | `UserINTer/Tabline/idget/Tema/index.js` |
| Widgets flutuantes | `UserINTer/Tabline/idget/AutoTune/` |

---

## Regra de layout importante

Elementos que precisam **preencher a janela** (`flex: 1`) devem ser **filhos diretos** de `body` (layout em coluna). Exemplo: `#browser.browser-container` — não envolver em `#browserMount` sem CSS de flex equivalente.
