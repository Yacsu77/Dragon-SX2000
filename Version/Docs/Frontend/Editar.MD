# Editar — Preferências de desempenho

**Caminho:** `Frontend/Telas/Editar/`

---

## Responsabilidade

Tela de ajustes acessível pelo botão **Editar** no canto superior direito da nav (`#editarBtn`) e pelo item “Editar” do menu principal. Hoje expõe a opção opcional de manter todas as abas renderizadas.

Persistência e aplicação da flag ficam em `Frontend/src/settings/perfSettings.js` — a tela só orquestra a UI.

---

## Estrutura

```
Telas/Editar/
├── Editar.html    ← Markup (toggle + aviso de CPU/RAM)
├── Editar.css     ← Overlay glassmorphism + switch
└── Editar.js      ← window.EditarScreen
```

---

## API pública

```js
window.EditarScreen = { open(), close(), focus(), isOpen() }

window.PerfSettings = {
  init(),
  isRenderAllTabs(),      // boolean
  setRenderAllTabs(bool),
  onChange(fn),           // → unsubscribe
}
```

---

## Opção: Manter todas as abas renderizadas

| | |
|--|--|
| **Padrão** | Desligado |
| **Persistência** | `localStorage` → `dragonsx.settings.perf` → `{ renderAllTabs }` |
| **Efeito DOM** | Classe `perf-render-all` no `<body>` |
| **CSS** | `Browser.css` — webviews inativos empilhados com `opacity: 0` (não `display: none`) |
| **Benefício** | Troca de aba sem repaint (instantânea) |
| **Custo** | Mais CPU/GPU e RAM — aviso exibido na UI quando ativo |

---

## Entrada na UI

| Entrada | Wiring |
|---------|--------|
| `#editarBtn` (nav direita) | `Top/Top.js` → `EditarScreen.open()` |
| Menu → Editar | `Top/Menu/Menu.js` → `handleMenuClick` |

Ícone do botão: sliders (ajustes) em `Top/Top.html`.

---

## Boot

`js/app.js` chama `PerfSettings.init()` após `TopBar.init()`, para aplicar a classe no body antes do uso.

---

## Como mudar comportamento

| Objetivo | Onde |
|----------|------|
| Nova opção de desempenho | Estender `perfSettings.js` + controle em `Editar.html`/`Editar.js` |
| Visual do aviso | `Editar.css` → `.editar-warning` |
| CSS do modo render-all | `Browser/Browser.css` → `body.perf-render-all …` |

---

## Documentação relacionada

- [`Browser.MD`](./Browser.MD) — CSS do modo render-all e fundo opaco
- [`Tabs.MD`](./Tabs.MD) — troca instantânea de conteúdo
- [`Log v1.3.MD`](../../Lançamento/Log%20v1.3.MD)
