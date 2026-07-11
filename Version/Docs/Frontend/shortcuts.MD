# shortcuts/ — Atalhos globais de teclado e mouse

**Caminho:** `Frontend/src/shortcuts/`

---

## Responsabilidade

Sistema de atalhos desacoplado. Cada ação ou overlay registra-se no `ShortcutManager`. Combos podem ser **globais** (funcionam dentro de webviews via processo principal) e incluir **botões extras do mouse**.

UI de gestão: [`Atalhos.MD`](./Atalhos.MD).

---

## Estrutura

```
shortcuts/
├── README.md
├── index.js                    ← ShortcutManager.start() no boot
├── core/
│   └── ShortcutManager.js      ← Registry, parse, persistência, teclado + mouse, sync global
├── overlays/
│   └── search-palette/         ← Ctrl+Space (paleta flutuante)
│       ├── index.js
│       └── index.css
└── actions/
    ├── tab-controls/           ← Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+Shift+Tab
    ├── history-controls/       ← Ctrl+H
    └── navigation-controls/    ← Voltar/Avançar (sem tecla), Ctrl+R
```

---

## Atalhos registrados

| ID | Default | Flags | Ação |
|----|---------|-------|------|
| `search-palette` | `Ctrl+Space` | `allowInInputs`, `global` | Paleta de busca |
| `tab-new` | `Ctrl+T` | `allowInInputs`, `global` | Nova aba |
| `tab-close` | `Ctrl+W` | `allowInInputs`, `global` | Fechar aba |
| `tab-next` | `Ctrl+Tab` | `global` | Próxima aba |
| `tab-prev` | `Ctrl+Shift+Tab` | `global` | Aba anterior |
| `history-open` | `Ctrl+H` | `allowInInputs`, `global` | Histórico |
| `nav-back` | `""` | `allowInInputs`, `global` | Voltar (mapear) |
| `nav-forward` | `""` | `allowInInputs`, `global` | Avançar (mapear) |
| `page-reload` | `Ctrl+R` | `allowInInputs`, `global` | Recarregar |

---

## API pública

```js
window.ShortcutManager = {
  register({ id, label, description, defaultKeys, category, allowInInputs, global, handler }),
  unregister(id),
  getAll(),
  setBinding(id, keys),
  resetBinding(id),
  onChange(fn),
  start(),
  stop(),
  normalizeCombo(raw),
  comboFromEvent(keyboardEvent),
  comboFromMouseEvent(mouseEvent),  // botões ≥ 3 → "Mouse3", "Ctrl+Mouse4", …
  getGlobalCombos(),
  triggerCombo(combo),              // disparo vindo do main (webview)
}
```

### Flags importantes

| Flag | Efeito |
|------|--------|
| `allowInInputs` | Dispara mesmo com foco em input/textarea/contenteditable |
| `global` | Combo enviado ao main; interceptado em webviews via `before-input-event` |

### Combos de mouse

Formato: `MouseN` ou `Ctrl+MouseN` (N ≥ 3). Botões 0/1/2 e scroll **não** são atalhos.

---

## Pipeline global (webview)

```
Renderer: ShortcutManager.syncGlobalCombos()
  → DragonShortcuts.setGlobalCombos([...])
  → IPC shortcuts:set-global-combos

Main: guestWebContents.before-input-event
  → se combo ∈ set → preventDefault + send shortcuts:global-combo

Renderer: DragonShortcuts.onGlobalCombo → triggerCombo(combo)
```

---

## Ordem de carregamento (index.html)

```
shortcuts/core/ShortcutManager.js
shortcuts/overlays/search-palette/index.js
shortcuts/actions/tab-controls/index.js
shortcuts/actions/history-controls/index.js
shortcuts/actions/navigation-controls/index.js
shortcuts/index.js   ← por último; chama start()
```

---

## Como adicionar novo atalho

1. Criar `shortcuts/actions/meu-modulo/index.js` (ou overlay)
2. `ShortcutManager.register({ …, global: true, allowInInputs: true })` se precisar funcionar em sites/inputs
3. Script em `index.html` **antes** de `shortcuts/index.js`
4. Atualizar tabela neste doc e no `README.md` interno

> Não editar `shortcuts/index.js` para novos atalhos.

---

## Como mudar comportamento

| Objetivo | Onde |
|----------|------|
| Editar bindings na UI | `Telas/Atalhos/` ([Atalhos.MD](./Atalhos.MD)) |
| Desativar todos | não chamar `start()` |
| Conflito de teclas | `AtalhosCapture` + `getAll()` |
| Menu Electron Win/Linux | `main.js` → `setupApplicationMenu()` (null para não roubar Ctrl+R/W) |

---

## README interno

Detalhes e debugging: `Frontend/src/shortcuts/README.md`.
