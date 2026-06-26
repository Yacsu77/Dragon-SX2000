# Tabs/ — Sistema de abas

**Caminho:** `Frontend/src/Tabs/`

---

## Responsabilidade

Criar, fechar, ativar e reordenar abas; associar webviews; home tabs; ícones; visibilidade da barra; animações.

Dividido em 5 arquivos JS + CSS/HTML.

---

## Estrutura

```
Tabs/
├── Tabs.html           ← Barra de abas (montada em #tabsRoot)
├── Tabs.css            ← Estilo glass, drag, ghost, .many-tabs
├── Tabs.state.js       ← Estado compartilhado (tabCount, currentActiveTab)
├── Tabs.core.js        ← CRUD, webview, home tab, CustomEvents
├── Tabs.anim.js        ← animateTabTransition, efeitos drag
├── Tabs.reorder.js     ← setupTabDragAndDrop (drag-and-drop)
└── Tabs.visibility.js  ← Barra hidden, ponto "+", .many-tabs
```

---

## API pública (globais legados + namespaces)

```js
window.TabsState = { tabCount, currentActiveTab, DEFAULT_TAB_ICON }
window.TabsCore = { createTab, activateTab, closeTab, createNewTab, createHomeTab, activateHomeTab, updateTabIcon, convertHomeTabToNormalTab }

// Globais (atalhos e integrações):
window.createTab(url, title?, icon?)
window.activateTab(tabId)
window.closeTab(tabId)
window.createNewTab()
window.createHomeTab()
window.activateHomeTab(tabId)
window.convertHomeTabToNormalTab(tabId, url, title?)
window.updateTabIcon(tabId, faviconUrl)
window.updateTabsBarVisibility()
```

---

## CustomEvents emitidos (`Tabs.core.js`)

| Evento | detail |
|--------|--------|
| `app:tab-changed` | `{ tabId, isHomeTab }` |
| `app:tab-created` | `{ tabId, isHomeTab }` |
| `app:tab-closed` | `{ tabId }` |

---

## Tabs.state.js

Estado mínimo compartilhado. **Não** colocar lógica aqui.

**Mudar ícone padrão da home tab:** `DEFAULT_TAB_ICON`.

---

## Tabs.core.js

| Função | Comportamento |
|--------|---------------|
| `createTab(url, title, icon)` | Nova aba + webview + ativa |
| `createHomeTab()` | Aba "New Tab" sem webview; ativa home |
| `activateTab(tabId)` | Mostra webview; chama `showBrowser()` |
| `activateHomeTab(tabId)` | Chama `showHome()` |
| `closeTab(tabId)` | Remove aba e webview; se última, `showHome()` |
| `convertHomeTabToNormalTab(tabId, url, title)` | Home tab vira aba normal com URL (busca) |

Webviews appendados em `#browser`. Listeners: favicon, título, `setupWebviewNavigation`, `trackWebviewHistory`.

**Mudar título truncado:** buscar `substring(0, 25)` em `Tabs.core.js`.

**Mudar ícones emoji por hostname:** função `hostnameIcon()`.

**Mudar fluxo ao fechar última aba:** bloco `closeTab()` quando `remainingTabs.length === 0`.

---

## Tabs.anim.js

`animateTabTransition({ currentIndex, targetIndex, tabs, onComplete })` — animação liquid glass ao trocar aba distante.

**Mudar duração/curva:** editar keyframes e timeouts em `Tabs.anim.js`.

**Desativar animação:** em `activateTab` / `activateHomeTab`, chamar `finishActivate*` direto sem `TabsAnim.animateTabTransition`.

---

## Tabs.reorder.js

Drag-and-drop completo: placeholder, ghost, reordena DOM + webviews.

**Mudar sensibilidade do drag:** thresholds dentro de `setupTabDragAndDrop`.

---

## Tabs.visibility.js

| Função | Comportamento |
|--------|---------------|
| `updateTabsBarVisibility()` | Esconde `.tabs-bar` se só 1 home tab; aplica `.many-tabs` |
| `updateLastTabDot()` | Insere botão "+" (`.new-tab-dot`) em cada aba |
| Listener `resize` | Recalcula `.many-tabs` |

**Mudar quando esconder a barra:** condição em `updateTabsBarVisibility()` (linha com `home-tab`).

**Mudar limiar de 15%:** cálculo `activeTabPercentage < 15` em `updateTabsBarVisibility`.

---

## Tabs.html

```html
<div class="tabs-bar">
  <div class="tabs" id="tabs"></div>
</div>
```

Abas criadas dinamicamente dentro de `#tabs`.

---

## Atalhos relacionados

`shortcuts/actions/tab-controls/` → Ctrl+T, Ctrl+W, Ctrl+Tab.
