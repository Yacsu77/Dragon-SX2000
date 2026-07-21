# Janelas/ — Multijanelas, split e layouts

**Caminho runtime:** `Frontend/src/Janelas/`  
**Caminho Customise:** `UserINTer/Tabline/idget/Customise/components/janelas/`  
**Namespace:** `window.JanelasNS` / API pública `window.Janelas`

---

## Visão

Permitir ao usuário trabalhar com **várias janelas OS**, **transferir abas entre elas**, **dividir uma janela em dois painéis** (esquerda/direita) e **personalizar layouts/animações** no Customise — sem duplicar a lógica de `Tabs.core` (snapshots, create/activate/close).

---

## O que já existe (reutilizar)

| Peça | Onde | Uso em Janelas |
|------|------|----------------|
| Snapshots de aba | `Tabs.core` → `getTabSnapshot` / `createTabFromSnapshot` | Detach, transfer, split |
| Drag de abas | `Tabs.reorder.js` | Estender com limiar Y → detach / transfer |
| Nova janela OS | `main.js` + `DragonCursorControl.createWindow` | Abrir janela com snapshot pendente |
| Menu de aba | `CursorControll/contexts/tabContext.js` | Ação **Dividir** (E/D) |
| Customise Factory | `Customise/components/*` | Editor Janela / Multi / Geral |
| Hover preview (grupos) | `TabGroups.render.js` | Referência UX — **não** reutilizar DOM; módulo próprio |

Cada `BrowserWindow` carrega o app inteiro (`index.html`). Estado de abas é **por janela**. Cross-window = IPC + snapshots.

---

## Princípios SOLID

| Princípio | Como aplicamos |
|-----------|----------------|
| **S** — Single Responsibility | Um módulo = uma preocupação (preview, detach, split, layout, animação, bridge) |
| **O** — Open/Closed | Novos layouts/animações via registry; sem `if` gigante em `index.js` |
| **L** — Liskov | Layouts e animações implementam o mesmo contrato (`apply` / `play`) |
| **I** — Interface Segregation | APIs pequenas: preview só hover; bridge só IPC; split só painéis |
| **D** — Dependency Inversion | Store/defaults no core; UI e Electron atrás de adapters/bridge |

`Tabs.core` continua dono do ciclo de vida da aba. Janelas **orquestra**; não reimplementa webview/CRUD.

---

## Estrutura de pastas

```
Frontend/src/Janelas/
├── core/
│   ├── types.js              ← Eventos, constantes, limiares
│   ├── defaults.js           ← Seed de preferências (layouts, anim, bordas)
│   ├── store.js              ← Estado runtime (split, panes) + persist settings
│   └── bus.js                ← CustomEvents tipados (janelas:*)
├── preview/
│   └── TabPreview.js         ← Mini visualizador (hover ≥ 1s)
├── drag/
│   ├── DetachThreshold.js    ← Limiar Y para “modo nova janela”
│   ├── DetachController.js   ← Soltar abaixo do limiar → nova BrowserWindow
│   └── TransferController.js ← Drop em outra janela (mesma zona de abas)
├── split/
│   ├── SplitHost.js          ← Dois painéis no mesmo #browser
│   ├── SplitDivider.js       ← Bolinha central → hover X → fechar split
│   └── SplitActions.js       ← Menu “Dividir” esquerda/direita
├── layouts/
│   ├── LayoutRegistry.js     ← register / apply por id
│   ├── WindowStandard.js     ← Janela padrão (atual)
│   ├── WindowFloating.js     ← Arredondada + gap + fundo transparente
│   ├── MultiStandard.js      ← Split 50/50 padrão
│   └── MultiFloating.js      ← Split + gap + bordas arredondadas + divisor
├── animations/
│   ├── AnimationRegistry.js  ← none | flip | file-drop
│   ├── FlipTransition.js     ← Giro ≤ 1s (direção por índice da aba)
│   └── FileDropTransition.js ← Nova aba “desce” como arquivo
├── bridge/
│   └── WindowBridge.js       ← IPC create / move-tab / list / focus
├── Janelas.css               ← Classes de layout / preview / divider
└── index.js                  ← Init + API pública window.Janelas

UserINTer/.../Customise/components/janelas/
├── defaults.js               ← Adapter + seed (espelha core/defaults)
├── preview.js                ← Mini preview no editor Factory
└── editor.js                 ← Abas: Janela | Multi janela | Geral
```

---

## Features (especificação)

### 1 — Mini visualizador de aba (hover)

| Regra | Detalhe |
|-------|---------|
| Trigger | Cursor parado ≥ **0.5s** sobre uma aba |
| Conteúdo | Miniatura / snapshot visual do webview daquela aba |
| Não mostrar | Aba já **selecionada** (ativa no painel atual) |
| Cancelar | Botão direito → fecha o preview imediatamente |
| Sair | `mouseleave` ou início de drag |

**Módulo:** `preview/TabPreview.js` + `preview/ThumbnailCache.js`  
**Captura:** `webview.capturePage()` — cache da aba ativa (refresh ~2.5s + ao navegar); sob demanda com classe `janelas-capturing` se não houver cache. Home tabs: cartão sintético (sem webview).

**Status:** ✅ Fase 1 implementada (2026-07-20). Hover: `PREVIEW_HOVER_MS = 500`.

### 2 — Abrir nova janela arrastando aba para baixo

| Regra | Detalhe |
|-------|---------|
| Limiar | Constante Y abaixo da barra de abas (`DETACH_Y_THRESHOLD` = 72px em `types.js`) |
| Feedback | Ao cruzar o limiar, o ghost vira **quadrado** + miniatura (`janelas-detach-ghost`) |
| Drop | Soltar no modo detach → `WindowBridge.createWithTab(snapshot)` → fecha aba na origem (se for a última, fecha a janela OS) |
| Dentro do limiar | Comportamento atual de reorder (`Tabs.reorder`) |
| Boot destino | `Janelas.applyPendingTab()` no `mountWorkspace` **antes** do SessionTabs/TabGroups restore |

**Integração:** `Tabs.reorder.js` chama `DetachController.onDragMove` / `onDragEnd`.  
**IPC:** `janelas:create-with-tab` / `janelas:consume-pending-tab` via `DragonJanelas` (preload).

**Status:** ✅ Fase 2 implementada (2026-07-20).

### 3 — Transferir aba entre janelas OS

| Regra | Detalhe |
|-------|---------|
| Zona | Drop na faixa de abas da janela destino (acima do limiar de detach) |
| Payload | Snapshot via IPC (`janelas:move-tab` → `janelas:receive-tab`) |
| Destino | `createTabFromSnapshot` + foco; origem `closeTab` (ou fecha janela se última) |
| Feedback | Ghost com borda azul (`janelas-transfer-ghost`) ao pairar sobre a barra destino |
| Prioridade | Transfer > Detach > Reorder |

**Pré-requisito Electron:** bounds da barra reportados (`janelas:report-tabs-bounds`) + `screen.getCursorScreenPoint()` no main.

**Status:** ✅ Fase 3 implementada (2026-07-20).

### 4 — Multijanela no mesmo BrowserWindow (split)

| Regra | Detalhe |
|-------|---------|
| Entrada | Menu direito da aba → **Dividir** → Esquerda \| Direita |
| Modelo | Dois slots: `leftTabId` / `rightTabId`; um é o **foco** (onde cliques de aba atuam) |
| Clique em outra aba | Troca só o painel **focado**; o outro permanece |
| Fechar split | Bolinha no meio → hover vira X; cursor “pointer”; ao fechar, permanece a aba da **esquerda** |
| Home / grupos | Definir na implementação: split incompatível com home-only; grupos continuam por janela |

**Status:** ✅ Fase 4 implementada (2026-07-20). Menu da aba: “Dividir — lado esquerdo/direito”; bolinha central fecha o split (mantém aba esquerda).

### 5 — Customise (Janela / Multi / Geral)

#### 5.1 Abas do editor

| Aba | Opções |
|-----|--------|
| **Janela** | Padrão · Flutuante (bordas arredondadas + espaçamento + fundo transparente) |
| **Multi janela** | Padrão (split E/D) · Flutuantes (gap + divisor + arredondadas + fundo transparente) |
| **Geral** | Bordas entre janela · Animada · RGB · Animação de transição de abas |

#### Animações de transição de aba (`animations/`)

| Id | Comportamento |
|----|----------------|
| `none` | Comportamento atual |
| `flip` | Giro ≤ **1s**; direção pela posição relativa (aba destino à direita → giro direita, e vice-versa) |
| `file-drop` | Conteúdo da nova aba desce de cima como arquivo |

Hook: interceptar / envolver `activateTab` via `AnimationRegistry.play({ fromId, toId })` — sem reescrever `Tabs.core`.

---

## Estado (`core/store.js`)

```js
// Preferências (persistidas — chave dragonsx.janelas)
{
  version: 1,
  windowLayout: 'standard' | 'floating',
  multiLayout: 'standard' | 'floating',
  borders: boolean,
  bordersAnimated: boolean,
  bordersRgb: boolean,
  tabTransition: 'none' | 'flip' | 'file-drop',
}

// Runtime (só memória, por janela)
{
  mode: 'single' | 'split',
  focusPane: 'left' | 'right',
  leftTabId: string | null,
  rightTabId: string | null,
}
```

Eventos (`core/bus.js` / CustomEvent):

| Evento | Quando |
|--------|--------|
| `janelas:settings-changed` | Preferências gravadas |
| `janelas:split-opened` | Entrou em split |
| `janelas:split-closed` | Saiu do split (fica left) |
| `janelas:pane-focused` | Mudou painel ativo |
| `janelas:detach-armed` | Drag cruzou limiar Y |
| `janelas:preview-show` / `hide` | Mini visualizador |

---

## Bridge Electron (fase cross-window)

Estender preload (ex.: `DragonJanelas` ou ampliar `DragonCursorControl`):

| Método | Canal | Função |
|--------|-------|--------|
| `createWithTab(snapshot)` | `janelas:create-with-tab` | Nova BrowserWindow + pending snapshot ✅ |
| `consumePendingTab()` | `janelas:consume-pending-tab` | Destino aplica snapshot ✅ |
| `reportTabsBounds(bounds)` | `janelas:report-tabs-bounds` | Zona de drop da barra ✅ |
| `resolveDropTarget()` | `janelas:resolve-drop-target` | Cursor → janela destino ✅ |
| `moveTab(toWebContentsId, snapshot)` | `janelas:move-tab` | Transferência ✅ |
| `onReceiveTab(cb)` | `janelas:receive-tab` | Destino cria aba ✅ |

Preload: `window.DragonJanelas`. Boot: `Janelas.applyPendingTab()` em `app.js` / `mountWorkspace`.

---

## Ordem de implementação (fases)

| Fase | Entrega | Depende |
|------|---------|---------|
| **0** | Pastas + defaults + store + docs + API vazia | — ✅ |
| **1** | TabPreview (hover 0.5s) | Fase 0 ✅ |
| **2** | DetachThreshold + DetachController + IPC create-with-tab | Fase 0–1 ✅ |
| **3** | TransferController + list/move IPC | Fase 2 ✅ |
| **4** | SplitHost + Divider + menu Dividir | Fase 0 ✅ |
| **5** | LayoutRegistry + 4 layouts + CSS | Fase 4 (multi) / Fase 0 (janela) ✅ |
| **6** | AnimationRegistry (flip, file-drop) | Fase 0 |
| **7** | Customise editor (3 abas) + catalog row | Fases 5–6 |

Fases 4 e 1 podem avançar em paralelo após a fase 0.

---

## Integração com arquivos existentes (não duplicar)

| Arquivo | Mudança esperada |
|---------|------------------|
| `Tabs.reorder.js` | Hooks: notificar Y; modo detach; não reinventar reorder |
| `Tabs.core.js` | Opcional: evento antes/depois de `activateTab` para animações |
| `tabContext.js` | Ações Dividir → `SplitActions` |
| `main.js` / `preload.js` | Registry + canais `janelas:*` |
| `index.html` | Scripts `Janelas/**` após Tabs |
| `Customise/catalog.html` | Linha “Janelas” |
| `Tabline.js` | Incluir scripts do componente Customise |
| `Customise/core/keys.js` | `JANELAS: 'dragonsx.janelas'` |

---

## API pública (`window.Janelas`)

```js
Janelas.init()
Janelas.getSettings()
Janelas.updateSettings(patch)
Janelas.getSplitState()
Janelas.splitTab(tabId, side)      // 'left' | 'right'
Janelas.closeSplit()               // mantém aba esquerda
Janelas.focusPane(side)
Janelas.showTabPreview(tabId)      // uso interno / testes
Janelas.hideTabPreview()
Janelas.NS                         // JanelasNS
```

---

## Critérios de aceite (por feature)

1. Hover 0.5s em aba inativa → preview; ativa → não; RMB → some.  
2. Arrastar aba abaixo do limiar → ghost quadrado; soltar → nova janela com aquela aba.  
3. Arrastar aba para a barra de outra janela → aba some na origem e aparece no destino.  
4. Dividir E/D; clique troca só o lado focado; bolinha/X fecha e deixa a esquerda.  
5. Customise altera layout/animação em tempo real sem reload completo.

---

## Histórico de mudanças

| Data | Mudança |
|------|---------|
| 2026-07-20 | Fase 0: estrutura SOLID, defaults/store/bus, docs e stubs de módulos |
| 2026-07-20 | Fase 1: TabPreview + ThumbnailCache (hover; RMB/drag cancelam; sem preview na ativa) |
| 2026-07-20 | Preview hover 1s → 0.5s (`PREVIEW_HOVER_MS`) |
| 2026-07-20 | Fase 2: detach por drag (limiar Y, ghost miniatura, IPC `janelas:create-with-tab`) |
| 2026-07-20 | Fix drag: Y livre + aba original oculta (sem fantasma duplicado) |
| 2026-07-20 | Fase 3: transferir aba entre janelas OS (`move-tab` / `receive-tab`) |
| 2026-07-20 | Nova janela herda usuário + sessão limpa (só aba pendente); shield no drag; feedback transfer; Fase 4 split |
| 2026-07-20 | Split: marca na aba focada; ghost OS entre monitores; pause capturePage no drag; Fase 5 layouts |
