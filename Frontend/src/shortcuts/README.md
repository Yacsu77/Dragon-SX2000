# DSX — Shortcuts

Sistema de atalhos globais do navegador **DSX**. Centraliza registro, persistência de bindings, atalhos **globais** (dentro de webviews), botões extras de mouse e a UI de gestão (`Telas/Atalhos`).

---

## Versão e downloads

| | |
|---|---|
| **Versão do log** | **v1.3.0 Beta** |
| **Executáveis** | [GitHub Releases](https://github.com/Yacsu77/Dragon-SX2000/releases) |

Documentação: [`Version/Docs/Frontend/shortcuts.MD`](../../../Version/Docs/Frontend/shortcuts.MD) · [`Atalhos.MD`](../../../Version/Docs/Frontend/Atalhos.MD) · [`Log v1.3.MD`](../../../Version/Lançamento/Log%20v1.3.MD)

---

## Estrutura

```
Frontend/src/shortcuts/
├── README.md
├── index.js                           # Bootstrap: ShortcutManager.start()
├── core/
│   └── ShortcutManager.js             # Registry, parse, teclado+mouse, sync global
├── overlays/
│   └── search-palette/                # Ctrl+Space
│       ├── index.js
│       └── index.css
└── actions/
    ├── tab-controls/                  # Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+Shift+Tab
    ├── history-controls/              # Ctrl+H
    └── navigation-controls/           # nav-back, nav-forward, Ctrl+R
```

Convenção:
- `overlays/<nome>/` — atalhos com UI flutuante (`index.js` + `index.css`)
- `actions/<nome>/` — só disparam ação (`index.js`)

Cada arquivo chama `window.ShortcutManager.register({ ... })` no load.

---

## Atalhos disponíveis

| ID | Default | Categoria | Flags | O que faz |
|----|---------|-----------|-------|-----------|
| `search-palette` | `Ctrl+Space` | Navegação | `allowInInputs`, `global` | Paleta de busca flutuante |
| `tab-new` | `Ctrl+T` | Abas | `allowInInputs`, `global` | Nova aba (home) |
| `tab-close` | `Ctrl+W` | Abas | `allowInInputs`, `global` | Fecha aba ativa |
| `tab-next` | `Ctrl+Tab` | Abas | `global` | Próxima aba |
| `tab-prev` | `Ctrl+Shift+Tab` | Abas | `global` | Aba anterior |
| `history-open` | `Ctrl+H` | Navegação | `allowInInputs`, `global` | Tela de histórico |
| `nav-back` | *(vazio)* | Navegação | `allowInInputs`, `global` | Voltar — mapear na Tela de Atalhos |
| `nav-forward` | *(vazio)* | Navegação | `allowInInputs`, `global` | Avançar — mapear na Tela de Atalhos |
| `page-reload` | `Ctrl+R` | Navegação | `allowInInputs`, `global` | Recarrega a aba ativa |

> Bindings vazios (`""`) = atalho desabilitado até o usuário mapear.

---

## Combos

Formato canônico: **`Ctrl+Shift+Alt+Meta+Tecla`**.

Exemplos: `Ctrl+Space`, `Ctrl+Shift+K`, `Alt+ArrowLeft`, `F5`, `Ctrl+Plus`, `Mouse3`, `Ctrl+Mouse4`.

- `normalizeCombo()` aceita variações (`ctrl+space`, `control+space`, `mouse3`).
- Botões de mouse **≥ 3** viram `MouseN`. Esquerdo (0), central (1), direito (2) e scroll **não** são atalhos.

---

## API pública (`window.ShortcutManager`)

```js
ShortcutManager.register({
  id: "meu-atalho",
  label: "Nome amigável",
  description: "Explicação.",
  defaultKeys: "Ctrl+Shift+K",
  category: "Navegação",
  allowInInputs: true,   // dispara em inputs
  global: true,          // funciona dentro de sites (webview)
  handler: (event, ctx) => { /* ctx.source: keydown | mouse | webview */ },
});

ShortcutManager.getAll();
ShortcutManager.setBinding(id, keys);
ShortcutManager.resetBinding(id);
ShortcutManager.onChange(fn);

ShortcutManager.normalizeCombo("ctrl + space"); // → "Ctrl+Space"
ShortcutManager.comboFromEvent(keyboardEvent);
ShortcutManager.comboFromMouseEvent(mouseEvent); // button < 3 → ""
ShortcutManager.getGlobalCombos();
ShortcutManager.triggerCombo("Ctrl+Space");
```

### Schema (`ShortcutEntry`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `string` | Identificador único |
| `label` / `description` | `string` | UI |
| `defaultKeys` / `keys` | `string` | Combo; `""` = desabilitado |
| `handler` | `function` | Callback |
| `allowInInputs` | `boolean` | Dispara em campos editáveis |
| `global` | `boolean` | Interceptado no main dentro de webviews |
| `category` | `string` | Grupo na Tela de Atalhos |

---

## Atalhos globais (webview)

1. `start()` / `emitChange()` → `DragonShortcuts.setGlobalCombos(getGlobalCombos())`
2. Main guarda o set por janela (`shortcuts:set-global-combos`)
3. Em cada webview anexado: `before-input-event` — se o combo for global, `preventDefault` + `shortcuts:global-combo`
4. Renderer: `triggerCombo(combo)`

Bridge: `preload.js` → `window.DragonShortcuts`.

No Windows/Linux o menu padrão do Electron é removido (`Menu.setApplicationMenu(null)`) para não roubar `Ctrl+R` / `Ctrl+W`.

---

## Persistência

Chave **`dragonsx.shortcuts.bindings`** em `localStorage`:

```json
{ "search-palette": "Ctrl+K", "nav-back": "Mouse3" }
```

Só overrides (diferentes do `defaultKeys`) são salvos.

---

## Tela de configuração (implementada)

- **Tela cheia:** `Frontend/Telas/Atalhos/` — lista, Editar, captura teclado/mouse, conflito
- **Mini preview:** `Frontend/MiniTelas/MiniAtalhos/` — 3 principais no menu
- Entrada: Menu → Atalhos

Ver [`Atalhos.MD`](../../../Version/Docs/Frontend/Atalhos.MD).

---

## Como adicionar um novo atalho

1. Pasta em `overlays/` ou `actions/`
2. `register({ …, global: true })` se precisar funcionar em sites
3. Script em `index.html` **antes** de `shortcuts/index.js`
4. Atualizar a tabela acima

Não edite `core/ShortcutManager.js` para adicionar atalhos — ele é genérico.

---

## Regras de UX

- Sem `allowInInputs`, atalhos são ignorados em inputs (exceto globais vindos do webview via `triggerCombo`).
- Overlays: Esc / backdrop cancelam sem ação; toggle no mesmo atalho.
- z-index de overlays de atalho ≥ 9000.

---

## Debugging

```js
console.table(window.ShortcutManager.getAll());
window.ShortcutManager.setBinding("nav-back", "Mouse3");
window.SearchPalette.toggle();
```

---

## Licença

ISC — DSX / Pedro Henrique Carneichuk Rosa
