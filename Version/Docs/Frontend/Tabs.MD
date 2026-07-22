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
├── Tabs.core.js           ← CRUD, webview, snapshots, activate com crossfade
├── Tabs.anim.js           ← Efeitos cosméticos / drag da barra
├── Tabs.reorder.js        ← Drag-and-drop de abas (+ limiar Janelas)
├── Tabs.visibility.js     ← Barra hidden, "+", algoritmo many-tabs (7+)
├── TabWarmth.js           ← deferLoad, hydrate, discard frio (P4)
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
| Aba ativa | Largura via `--many-active-tab-width` ≈ `floor(containerWidth / 5)` |
| Inativas | `--many-inactive-tab-width` (resto do espaço) |
| Troca | Sem animar width (evita hitch com paint do webview); feedback só background/opacity |
| LED | Elemento `.tab-led-ring` (não usa `::before` dos separadores) |
| Switch conteúdo | `body.janelas-content-switching` → aba ativa sólida (sem backdrop-filter) |

Opacidade da ativa e LED: `ChromeLayoutSettings` (`activeTabOpacity`, `activeTabLedBorder`).

---

## Tabs.core.js

| Função | Comportamento |
|--------|---------------|
| `buildWebview(url, tabId, opts)` | `partition="persist:dragon"`; `deferLoad` → `about:blank` + `pendingSrc` |
| `activateTab` / `activateHomeTab` | Chrome na hora; webview crossfade (~320ms); hydrate no frame seguinte |
| Conteúdo↔conteúdo | Nova opaca por baixo; anterior `.is-leaving` some por cima |
| Split | Sem leave/blur residual nos painéis |
| Snapshots | Helpers usados pelo `TabGroups.runtime` e por Janelas (detach/transfer) |

---

## TabWarmth.js (v1.4 · P4)

| API | Papel |
|-----|--------|
| `hydrateWebview` / `hydrateTab` | Carrega `pendingSrc` / `discardedUrl` |
| `warmDeferredQueue` | Fila sequencial pós-restauração |
| `maybeDiscardCold` | `about:blank` em abas frias quando há > `MAX_WARM` (8) |
| `markActive` | Timestamp para política de discard |

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

`body.perf-render-all` — ver [`Editar.MD`](./Editar.MD). Default **off**; com muitas abas o custo sobe rápido.

**Perf P2:** blur de aba só na **barra** + **aba ativa** (inativas são sólido); `body.perf-window-idle` pausa LED; RGB pausa só com `perf-window-hidden`.

**Perf P3:** `activateTab` usa refs da aba/webview ativa; `capturePage` no switch deferido (~320ms) e só se cache frio.

**Perf P4 (TabWarmth):** `deferLoad` + fila; discard frio (>8). Crossfade de tela só com opacity (sem `filter:blur` no guest — isso travava a barra).

## Ver também

- [`Janelas.MD`](./Janelas.MD) — Multijanelas, detach, transfer, split, `tabTransition`
- [`Browser.MD`](./Browser.MD) — CSS de crossfade de webviews
- [`core.MD`](./core.MD) — AppShell New Tab ↔ browser
- [`Log v1.4.MD`](../../Lançamento/Log%20v1.4.MD)
- [`Top.MD`](./Top.MD) — Layout Topo Global
