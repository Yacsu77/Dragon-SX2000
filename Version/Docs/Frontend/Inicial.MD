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
| `js/` + `settings/` | [js.MD](./js.MD) · [Editar.MD](./Editar.MD) |
| `shortcuts/` | [shortcuts.MD](./shortcuts.MD) |
| `Telas/Atalhos` + MiniAtalhos | [Atalhos.MD](./Atalhos.MD) |
| `Telas/Editar` | [Editar.MD](./Editar.MD) |

Documentação relacionada fora desta pasta:

- AutoTune / Factory → [Autotune.md](../Autotune.md), [Factory.md](../Factory.md)
- Regressão manual → [ChecklistRegressao.MD](../ChecklistRegressao.MD)
- Histórico da refatoração → [TaskPlanejamento.MD](../TaskPlanejamento.MD)
- Release notes → [Log v1.4.MD](../../Lançamento/Log%20v1.4.MD) · [Log v1.3.MD](../../Lançamento/Log%20v1.3.MD)
- Lançamento 1.4 → **04/08/2026** em [dragonsx.com.br](https://dragonsx.com.br)

---

## Estrutura de pastas

```
Frontend/src/
├── index.html              ← Shell mínimo
├── core/                   ← Bootstrap, CSS base, AppShell, montagem HTML
├── Top/                    ← Barra superior (menu, voltar/avançar, endereço, Editar)
├── TopActions/             ← Botões direitos (Downloads, Arquivos, Nova aba, Config)
├── Tabs/                   ← Abas + grupos (TabGroups.*) + webviews (partition persistente)
├── settings/               ← perfSettings + chromeLayoutSettings (Layout Topo Global)
├── Tabline/                ← Barra lateral de idgets
├── Home/                   ← Área da home tab (transparente / wallpaper)
├── Browser/                ← Container webview + eventos + modo perf-render-all
├── Favoritos/              ← CRUD de favoritos (localStorage)
├── Wallpaper/              ← Markup do painel Wallpaper (lógica em UserINTer/)
├── js/                     ← Bootstrap, userApi (TabGroupsApi), histórico, media bridge
└── shortcuts/              ← Atalhos globais (teclado + mouse + webview)

Frontend/Telas/
├── Historico-Navegação/ · Downloads/ · Arquivos/
├── Atalhos/                ← Gestão de atalhos
└── Editar/                 ← Preferências de desempenho

Frontend/MiniTelas/
├── MiniHistorico-Navegação/
└── MiniAtalhos/
```

---

## Responsabilidades por camada

| Camada | Responsabilidade |
|--------|------------------|
| **Shell** (`index.html` + `core/Shell.js`) | Mount points vazios; carrega fragmentos HTML antes do bootstrap |
| **AppShell** | Alterna home ↔ navegador; emite `app:home-shown` / `app:browser-shown` |
| **Top + TopActions** | Interação do usuário na barra superior |
| **Tabs** | CRUD de abas, grupos (snapshots), webviews, drag, many-tabs, LED |
| **ChromeLayout** | Layout Topo Global: busca, botões, Music, bordas, opacidade da aba |
| **Tabline** | Idgets laterais; carrega scripts de `UserINTer/Tabline/idget/` |
| **Home + Browser** | Área principal: wallpaper (home) ou webview (navegação) |
| **Favoritos / Telas** | Features fullscreen (Favoritos em `src/`; Downloads/Arquivos/Atalhos/Editar em `Frontend/Telas/`) |
| **js/ + settings/** | Serviços transversais (histórico API, TabGroupsApi, prefetch, Layout Topo Global, desempenho) |
| **shortcuts/** | Atalhos globais (teclado, mouse extras, sync com webviews) |

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
| `chrome-layout:changed` | `chromeLayoutSettings.js` | settings | ChromeLayout, Music minimal |
| `tab-groups:changed` | `TabGroups.runtime` | `{ groups, activeGroupId }` | TabGroups.render |
| `tab-groups:active-changed` | `TabGroups.runtime` | `{ activeGroupId, group }` | UI / sync |

Exemplo:

```js
document.addEventListener('app:tab-changed', (e) => {
  const { tabId, isHomeTab } = e.detail;
});
```

---

## Ordem de bootstrap (`js/app.js`)

```
1. Shell.mountAll()
2. Browser.init()
3. CursorControll.init()
4. Tabline.init()
5. TopBar.init()            → ChromeLayout, Menu, ButtonGo, Search, TopActions, #editarBtn
6. TabGroupsRuntime.init() + TabGroupsRender.init() + restoreActiveGroup()
7. ConnectionPrefetch.init()
8. PerfSettings.init()
9. Home.init()
10. lucide.createIcons()
11. AppShell.showHome()
12. updateTabsBarVisibility()
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
| Grupos de abas | `Tabs/TabGroups.*` + API `/tab-groups` |
| Layout Topo Global / Music no Top | `settings/chromeLayoutSettings.js`, `Top/ChromeLayout.js`, Customise |
| Drag ou animação de abas | `Tabs/Tabs.reorder.js`, `Tabs/Tabs.anim.js` |
| Many-tabs / LED / opacidade | `Tabs/Tabs.visibility.js` + Customize Abas |
| Idgets laterais | `Tabline/Tabline.html`, `Tabline/Tabline.js` |
| Botão Downloads / Arquivos / Config | `TopActions/<Nome>/` |
| Preferências de desempenho | `Telas/Editar/` + `settings/perfSettings.js` |
| Gestão de atalhos (UI) | `Telas/Atalhos/` |
| Favoritos | `Favoritos/Favoritos.js` |
| Atalhos de teclado/mouse | `shortcuts/actions/` ou `shortcuts/overlays/` |
| Prefetch ao digitar | `js/connectionPrefetch.js` |
| Tema claro/escuro | `UserINTer/Tabline/idget/Tema/index.js` |
| Widgets flutuantes | `UserINTer/Tabline/idget/AutoTune/` |

---

## Regra de layout importante

Elementos que precisam **preencher a janela** (`flex: 1`) devem ser **filhos diretos** de `body` (layout em coluna). Exemplo: `#browser.browser-container` — não envolver em `#browserMount` sem CSS de flex equivalente.
