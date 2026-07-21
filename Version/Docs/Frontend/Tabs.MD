# Tabs/ — Sistema de abas

**Caminho:** `Frontend/src/Tabs/`

---

## Responsabilidade

Criar, fechar, ativar e reordenar abas; associar webviews; home tabs; ícones; visibilidade da barra; **grupos de abas** (v1.4).

---

## Estrutura

```
Tabs/
├── Tabs.html              ← Barra + slot de grupos (#tabGroupsBtn / #tabGroupsPanel)
├── Tabs.css               ← Glass, many-tabs, LED, painel de grupos
├── Tabs.state.js          ← Estado compartilhado (tabCount, currentActiveTab)
├── Tabs.core.js           ← CRUD, webview, snapshots para grupos
├── Tabs.anim.js           ← Transições cosméticas da barra
├── Tabs.reorder.js        ← Drag-and-drop de abas
├── Tabs.visibility.js     ← Barra hidden, "+", algoritmo many-tabs (7+)
├── TabGroups.state.js     ← Lista de grupos + activeGroupId
├── TabGroups.service.js   ← Chamadas TabGroupsApi + upsert local
├── TabGroups.runtime.js   ← Switch/create/delete; salva snapshot do grupo ativo
└── TabGroups.render.js    ← Painel UI (nome, cor, hover 5 abas, reorder)
```

---

## API pública

```js
window.TabsState = { tabCount, currentActiveTab, DEFAULT_TAB_ICON }
window.TabsCore = { createTab, activateTab, closeTab, createNewTab, createHomeTab, … }
window.TabsVisibility = { updateTabsBarVisibility, scheduleVisibilityUpdate, … }
window.TabGroupsState = { getGroups, getActiveGroup, setGroups, upsertGroup, … }
window.TabGroupsRuntime = { init, createGroup, switchToGroup, updateGroup, deleteGroup, … }
window.TabGroupsRender = { init, render, setPanelOpen }

// Globais legados:
window.createTab / activateTab / closeTab / createNewTab / createHomeTab / updateTabsBarVisibility
```

---

## CustomEvents

| Evento | detail |
|--------|--------|
| `app:tab-changed` | `{ tabId, isHomeTab }` |
| `app:tab-created` | `{ tabId, isHomeTab }` |
| `app:tab-closed` | `{ tabId }` |
| `tab-groups:changed` | `{ groups, activeGroupId }` |
| `tab-groups:active-changed` | `{ activeGroupId, group }` |

---

## Grupos de abas (v1.4)

| Comportamento | Detalhe |
|---------------|---------|
| Isolamento | Por `user_id` na API-DSX (`/tab-groups`) |
| Ativo | Só o grupo ativo tem webviews no DOM |
| Inativos | Snapshot (url, title, favicon, is_home, active, position) |
| UI | Botão ▦ à esquerda; painel compacto; hover lista 5 abas |
| Reorder | Arraste de cards → `updateGroup({ position })` |
| SessionTabs | Desabilitado quando o runtime de grupos está ativo |

Backend: tabelas `tab_groups` / `tab_group_tabs` — ver [`DB.md`](../../../Backend/API-DSX/Docs/DB.md).

---

## Tabs.visibility.js — many-tabs

| Regra | Detalhe |
|-------|---------|
| Limiar | `tabs.length >= 7` |
| Aba ativa | Largura alvo = `floor(containerWidth / 5)` (como se houvesse 5 abas) |
| Inativas | Dividem o espaço restante (sem teto artificial) |
| LED | Elemento `.tab-led-ring` (não usa `::before` dos separadores) |

Opacidade da ativa e LED: `ChromeLayoutSettings` (`activeTabOpacity`, `activeTabLedBorder`).

---

## Tabs.core.js

| Função | Comportamento |
|--------|---------------|
| `buildWebview(url, tabId)` | `partition="persist:dragon"` |
| `activateTab` / `activateHomeTab` | Conteúdo troca na hora; animação só na barra |
| Snapshots | Helpers usados pelo `TabGroups.runtime` ao trocar de grupo |

---

## Tabs.html

```html
<div class="tabs-bar">
  <div class="tab-groups-slot">…</div>
  <div class="tabs" id="tabs"></div>
</div>
```

---

## Atalhos relacionados

`shortcuts/actions/tab-controls/` → Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+Shift+Tab.

## Desempenho opcional

`body.perf-render-all` — ver [`Editar.MD`](./Editar.MD).

## Ver também

- [`Janelas.MD`](./Janelas.MD) — Multijanelas, detach, transfer, split (integra com snapshots / reorder)
- [`Log v1.4.MD`](../../Lançamento/Log%20v1.4.MD)
- [`Top.MD`](./Top.MD) — Layout Topo Global
