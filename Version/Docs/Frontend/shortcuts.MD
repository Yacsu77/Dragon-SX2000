# shortcuts/ — Atalhos globais de teclado

**Caminho:** `Frontend/src/shortcuts/`

---

## Responsabilidade

Sistema de atalhos de teclado desacoplado. Cada ação ou overlay registra-se no `ShortcutManager` sem editar um arquivo central monolítico.

---

## Estrutura

```
shortcuts/
├── README.md
├── index.js                    ← ShortcutManager.start() no boot
├── core/
│   └── ShortcutManager.js      ← Registro, listener global, snapshot
├── overlays/
│   └── search-palette/         ← Paleta de busca (Ctrl+K ou similar)
│       ├── index.js
│       └── index.css
└── actions/
    ├── tab-controls/           ← Ctrl+T, Ctrl+W, Ctrl+Tab
    │   └── index.js
    └── history-controls/       ← Atalhos de histórico
        └── index.js
```

---

## API pública

```js
window.ShortcutManager = {
  register({ id, keys, handler, description, group }),
  start(),
  getSnapshot()  // lista para futura UI de config
}
```

---

## Ordem de carregamento (index.html)

```
shortcuts/core/ShortcutManager.js
shortcuts/overlays/search-palette/index.js
shortcuts/actions/tab-controls/index.js
shortcuts/actions/history-controls/index.js
shortcuts/index.js   ← por último; chama start()
```

---

## tab-controls/index.js

| Atalho | Ação |
|--------|------|
| Ctrl+T | `createNewTab()` |
| Ctrl+W | `closeTab(currentActiveTab)` |
| Ctrl+Tab | Próxima aba |

Depende de APIs globais de `Tabs.core.js`.

**Mudar combinação:** editar `keys` no `register()`.

**Adicionar atalho de aba:** novo `register()` neste arquivo ou nova pasta em `actions/`.

---

## history-controls/index.js

Atalhos relacionados a voltar/avançar ou histórico (ver arquivo para combinações atuais).

---

## search-palette/

Overlay de busca rápida. Registra próprio atalho no load.

**Mudar UI:** `overlays/search-palette/index.css` + `index.js`.

---

## Como adicionar novo atalho

1. Criar `shortcuts/actions/meu-modulo/index.js`:

```js
(function () {
  window.ShortcutManager.register({
    id: 'meu-atalho',
    keys: 'ctrl+shift+m',
    description: 'Minha ação',
    group: 'Geral',
    handler: () => { /* ... */ },
  });
})();
```

2. Adicionar `<script src="shortcuts/actions/meu-modulo/index.js">` em `index.html` **antes** de `shortcuts/index.js`.

> Não editar `shortcuts/index.js` para novos atalhos (conforme README interno).

---

## Como mudar comportamento

| Objetivo | Onde |
|----------|------|
| Desativar todos os atalhos | não chamar `ShortcutManager.start()` |
| Conflito de teclas | revisar `register()` em cada action/overlay |
| Listar atalhos na UI | `ShortcutManager.getSnapshot()` |
| Ignorar atalhos em inputs | lógica em `ShortcutManager.js` |

---

## README interno

Detalhes adicionais em `Frontend/src/shortcuts/README.md`.
