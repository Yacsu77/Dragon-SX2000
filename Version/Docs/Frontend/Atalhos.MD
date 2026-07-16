# Atalhos — Tela de gerenciamento e Mini preview

**Caminhos:**
- `Frontend/Telas/Atalhos/`
- `Frontend/MiniTelas/MiniAtalhos/`

---

## Responsabilidade

UI para listar, editar e persistir bindings de atalhos registrados no `ShortcutManager`. A mini-tela mostra apenas os 3 atalhos principais no preview do menu.

A lógica de registro/disparo permanece em `Frontend/src/shortcuts/` — esta pasta é só a camada de apresentação.

---

## Estrutura 

```
Telas/Atalhos/
├── Atalhos.html           ← Markup da tela
├── Atalhos.css            ← Overlay, lista, retângulo de captura
├── Atalhos.format.js      ← AtalhosFormat — combo → texto legível
├── Atalhos.render.js      ← AtalhosRender — DOM da lista (view pura)
├── Atalhos.capture.js     ← AtalhosCapture — retângulo central de captura
└── Atalhos.js             ← AtalhosScreen — orquestra (Facade)

MiniTelas/MiniAtalhos/
├── MiniAtalhos.html
├── MiniAtalhos.css
└── MiniAtalhos.js         ← window.MiniAtalhos
```

| Módulo | Responsabilidade |
|--------|------------------|
| `AtalhosFormat` | Transforma `"Ctrl+Space"` / `"Mouse3"` em rótulos (`"Ctrl + Espaço"`, `"Mouse ◄"`) |
| `AtalhosRender` | Agrupa por `category` e monta linhas com botão Editar; não persiste |
| `AtalhosCapture` | Modal: captura teclado ou botão mouse ≥ 3; conflito; Aplicar/Remover/Restaurar |
| `AtalhosScreen` | Ciclo open/close + liga `ShortcutManager` ↔ Render ↔ Capture |
| `MiniAtalhos` | Lista `search-palette`, `tab-new`, `tab-close` + “Ver todos” |

---

## API pública

```js
window.AtalhosScreen = { open(), close(), focus(), isOpen() }
window.MiniAtalhos = { load(), openFullScreen(), getRoot() }
window.AtalhosFormat = { toTokens(), humanize(), isEmpty(), labelForToken() }
window.AtalhosRender = { render(container, shortcuts, { onEdit }) }
window.AtalhosCapture = { open(shortcut, { onApply, getConflict }), close(), isOpen }
```

---

## Fluxo de edição

1. Usuário clica **Editar** na linha do atalho
2. `AtalhosCapture.open(shortcut, …)` exibe o retângulo
3. Próximo `keydown` ou `auxclick` (botão ≥ 3) vira combo canônico
4. Se outro atalho já usa o combo → aviso e Aplicar desabilitado
5. **Aplicar** → `ShortcutManager.setBinding(id, combo)` → `onChange` → lista atualiza

---

## Integração com o Menu

Em `Top/Menu/Menu.js`:

| Evento | Comportamento |
|--------|---------------|
| Hover em “Atalhos” | `MiniAtalhos.load()` no painel de preview |
| Clique em “Atalhos” | `AtalhosScreen.open()` + fecha o menu |

---

## Como mudar comportamento

| Objetivo | Onde |
|----------|------|
| Quais 3 atalhos na mini | `MiniAtalhos.js` → `MAIN_IDS` |
| Rótulos de Mouse/teclas | `Atalhos.format.js` → `TOKEN_LABELS` / `MOUSE_LABELS` |
| Visual da captura | `Atalhos.css` → `.atalhos-capture*` |
| Validação de conflito | `Atalhos.js` → `findConflict()` |

---

## Documentação relacionada

- [`shortcuts.MD`](./shortcuts.MD) — registry e atalhos globais
- [`Log v1.4.MD`](../../Lançamento/Log%20v1.4.MD) · [`Log v1.3.MD`](../../Lançamento/Log%20v1.3.MD) — release notes
