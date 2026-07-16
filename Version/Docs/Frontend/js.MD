# js/ — Scripts transversais

**Caminho:** `Frontend/src/js/`

---

## Responsabilidade

Bootstrap da aplicação, ponte com Dragon Media SDK, integração com API de histórico (API-DSX) e prefetch de conexão.

---

## Arquivos

| `app.js` | Bootstrap: Shell → Browser → CursorControll → Tabline → TopBar → TabGroups → Prefetch → PerfSettings → Home |
| `userApi.js` | Cliente HTTP API-DSX: Users, Favorites, Downloads, Vault, **TabGroups** |
| `connectionPrefetch.js` | `dns-prefetch` + `preconnect` ao digitar na barra (padrão) |
| `historyApi.js` | Cliente HTTP para API-DSX (`localhost:3333`) — histórico |
| `historyNavigation.js` | Abrir tela de histórico, navegar para URL do histórico |
| `historyTracker.js` | Grava visitas dos webviews na API (debounce) |
| `dragon-media-bridge.js` | Ponte WebSocket com Dragon Media SDK (música/SMTC) |

Settings relacionados (fora de `js/`):

- `Frontend/src/settings/perfSettings.js` — ver [`Editar.MD`](./Editar.MD)
- `Frontend/src/settings/chromeLayoutSettings.js` — Layout Topo Global (v1.4)

---

## app.js — ordem de init

```js
Shell.mountAll()
Browser.init()
CursorControll.init()
Tabline.init()
TopBar.init()                 // inclui ChromeLayout
TabGroupsRuntime.init()
TabGroupsRender.init()
TabGroupsRuntime.restoreActiveGroup()
ConnectionPrefetch.init()
PerfSettings.init()
Home.init()
lucide.createIcons()
AppShell.showHome()
updateTabsBarVisibility()
```

**Mudar ordem de inicialização:** editar `initApp()` — respeitar dependências (Shell antes de Tabline; TopBar depois do Shell montar `#menuBtn`; TabGroups após Tabs + Top).

**Adicionar passo global no boot:** inserir chamada em `initApp()` após módulo necessário.

---

## TabGroupsApi (`userApi.js`)

```js
window.TabGroupsApi = {
  list(userId),
  create(body),
  update(id, userId, body),
  remove(id, userId),
  replaceTabs(id, body),   // PUT /tab-groups/:id/tabs
}
```

UI e runtime: [`Tabs.MD`](./Tabs.MD). Schema: [`DB.md`](../../../Backend/API-DSX/Docs/DB.md).

---

## connectionPrefetch.js

Feature **padrão** (sempre ativa):

- Escuta `input` em `#addressInput` (debounce ~220 ms)
- Se o texto parece host/URL → injeta `<link rel="dns-prefetch">` e `<link rel="preconnect">` no `<head>`
- Deduplica por origin; mantém no máximo 6 dicas

```js
window.ConnectionPrefetch = { init(), hint(raw) }
```

**Objetivo:** aquecer DNS/TLS antes do Enter, reduzindo tempo até o primeiro byte.

---

## historyApi.js

Endpoints da API-DSX para histórico de navegação.

**Mudar URL da API:** constantes de base URL no arquivo.

---

## historyTracker.js

Escuta navegação via `setupWebviewNavigation` + eventos do webview.

```js
window.trackWebviewHistory(webview)
window.setHistoryTransitionType('link' | 'search' | 'typed')
```

**Mudar debounce:** `DEBOUNCE_MS` no arquivo.

**Ignorar URLs:** array `blocked` em `shouldSkipUrl()`.

---

## historyNavigation.js

Integração com `Telas/Historico-Navegação/` e `MiniHistorico`.

**Mudar comportamento ao clicar item:** handlers neste arquivo ou na Tela.

---

## dragon-media-bridge.js

Conecta ao SDK de mídia (porta 8974). Usado pelo widget Music do AutoTune.

**Mudar porta/host:** configuração no bridge.

---

## Como mudar comportamento

| Objetivo | Arquivo |
|----------|---------|
| Boot da aplicação | `app.js` |
| Grupos de abas (API) | `userApi.js` → `TabGroupsApi` |
| Prefetch ao digitar | `connectionPrefetch.js` |
| Desligar tracking de histórico | não chamar `trackWebviewHistory` em `Tabs.core.js` |
| Nova integração API | novo arquivo em `js/` + script em `index.html` |
| Tipo de transição no histórico | `setHistoryTransitionType()` antes de navegar (Search já faz) |

---

## Telas relacionadas (fora de js/)

| Tela | Caminho | Doc |
|------|---------|-----|
| Histórico fullscreen | `Frontend/Telas/Historico-Navegação/` | — |
| Mini histórico (menu) | `Frontend/MiniTelas/MiniHistorico-Navegação/` | — |
| Downloads | `Frontend/Telas/Downloads/` | — |
| Arquivos | `Frontend/Telas/Arquivos/` | — |
| Atalhos | `Frontend/Telas/Atalhos/` | [Atalhos.MD](./Atalhos.MD) |
| Mini Atalhos | `Frontend/MiniTelas/MiniAtalhos/` | [Atalhos.MD](./Atalhos.MD) |
| Editar (desempenho) | `Frontend/Telas/Editar/` | [Editar.MD](./Editar.MD) |
