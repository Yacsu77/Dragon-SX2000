# js/ — Scripts transversais

**Caminho:** `Frontend/src/js/`

---

## Responsabilidade

Bootstrap da aplicação, ponte com Dragon Media SDK e integração com API de histórico (API-DSX).

---

## Arquivos

| Arquivo | Função |
|---------|--------|
| `app.js` | Bootstrap: Shell → Browser → Tabline → TopBar → Home → showHome |
| `historyApi.js` | Cliente HTTP para API-DSX (`localhost:3333`) |
| `historyNavigation.js` | Abrir tela de histórico, navegar para URL do histórico |
| `historyTracker.js` | Grava visitas dos webviews na API (debounce) |
| `dragon-media-bridge.js` | Ponte WebSocket com Dragon Media SDK (música/SMTC) |

---

## app.js — ordem de init

```js
Shell.mountAll()
Browser.init()
Tabline.init()
TopBar.init()
Home.init()
lucide.createIcons()
AppShell.showHome()
updateTabsBarVisibility()
```

**Mudar ordem de inicialização:** editar `initApp()` — respeitar dependências (Shell antes de Tabline; TopBar depois do Shell montar `#menuBtn`).

**Adicionar passo global no boot:** inserir chamada em `initApp()` após módulo necessário.

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
| Desligar tracking de histórico | não chamar `trackWebviewHistory` em `Tabs.core.js` |
| Nova integração API | novo arquivo em `js/` + script em `index.html` |
| Tipo de transição no histórico | `setHistoryTransitionType()` antes de navegar (Search já faz) |

---

## Telas relacionadas (fora de js/)

| Tela | Caminho |
|------|---------|
| Histórico fullscreen | `Frontend/Telas/Historico-Navegação/` |
| Mini histórico (menu) | `Frontend/MiniTelas/MiniHistorico-Navegação/` |
| Downloads | `Frontend/Telas/Downloads/` |
| Arquivos | `Frontend/Telas/Arquivos/` |
