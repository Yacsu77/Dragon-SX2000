# Tabline/ — Barra lateral de idgets

**Caminho:** `Frontend/src/Tabline/`

---

## Responsabilidade

Barra lateral esquerda (Wallpaper, Tema, Customise, Donate, AutoTune): markup, hover, tooltip, carregamento dos scripts de `UserINTer/Tabline/idget/`.

---

## Estrutura

```
Tabline/
├── Tabline.html        ← #sideTabs, .tab-item, links #wallpaper-widget / #autotune-widget
├── Tabline.css         ← .side-tabs, hover pill, theme toggler
├── Tabline.js          ← Montagem, active state, carga dinâmica de scripts
└── Tabline.anim.js     ← Hover --hover-y, tooltip
```

---

## API pública

```js
window.Tabline = { init() }
window.TablineAnim = { init() }
```

---

## Tabline.js — scripts carregados dinamicamente

Array `WIDGET_SCRIPTS` (ordem importa):

1. Wallpaper/index.js
2. Tema/index.js
3. AutoTune/Timer, Tasklist, Share, Music, Clock/*
4. AutoTune/index.js (motor)

**Adicionar novo idget:**

1. Criar pasta em `UserINTer/Tabline/idget/MeuIdget/`
2. Adicionar item em `Tabline.html`
3. Incluir script em `WIDGET_SCRIPTS` em `Tabline.js`

**Remover idget:** retirar do HTML e do array `WIDGET_SCRIPTS`.

---

## Tabline.html — idgets

| Item | data-idget | Ação |
|------|------------|------|
| Wallpaper | `wallpaper` | Link `#wallpaper-widget` |
| Tema | `tema` | `#temaTabBtn` — ciclo claro/escuro/sistema |
| Customise | `customise` | Placeholder |
| Donate | `donate` | Placeholder |
| AutoTune | `autotune` | Link `#autotune-widget` |

Ícones Lucide via `data-lucide` — renderizados após `lucide.createIcons()` no init.

---

## Tabline.anim.js

- `--hover-y` na pill `.tabs-hover`
- Tooltip `#tabsTooltip` posicionado à direita do item
- Esconde hover/tooltip em `mouseleave` da `.tabs-list`

**Mudar offset do tooltip:** constante `+ 12` em `showTooltip()`.

**Mudar largura da barra ao hover:** `Tabline.css` → `.edge-hitbox`, `.side-tabs`.

---

## Tabline.js — active state

Click em `.tab-item` alterna classe `.active` (visual apenas; links usam hash).

---

## Documentação dos idgets (fora desta pasta)

| Iget | Documento |
|------|-------------|
| AutoTune | [Autotune.md](../Autotune.md) |
| Factory | [Factory.md](../Factory.md) |
| Novo widget | [NewComponet.md](../NewComponet.md) |

---

## Como mudar comportamento

| Objetivo | Arquivo |
|----------|---------|
| Novo botão lateral | `Tabline.html` + `Tabline.css` + script UserINTer |
| Ordem de carregamento widgets | `Tabline.js` → `WIDGET_SCRIPTS` |
| Animação de entrada da barra | `Tabline.css` → `.side-tabs` transform |
| Desabilitar tooltip | `Tabline.anim.js` → comentar `showTooltip` |
