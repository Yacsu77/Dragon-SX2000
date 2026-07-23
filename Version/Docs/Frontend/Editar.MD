# Editar — Preferências de desempenho

**Caminho:** `Frontend/Telas/Editar/`

---

## Responsabilidade

Tela de ajustes acessível pelo botão **Editar** no canto superior direito da nav (`#editarBtn`) e pelo item “Editar” do menu principal. Expõe opções de desempenho (renderização de abas) e sessão (restaurar abas ao abrir).

Persistência e aplicação das flags ficam em `Frontend/src/settings/perfSettings.js`; o snapshot das abas fica em `sessionTabs.js` — a tela só orquestra a UI.

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
  isRestoreSessionTabs(), // boolean
  setRestoreSessionTabs(bool),
  onChange(fn),           // → unsubscribe
}

window.SessionTabs = {
  init(),
  saveNow(),
  restore(),              // boolean
  clear(),
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

## Opção: Restaurar abas ao abrir

| | |
|--|--|
| **Padrão** | Desligado |
| **Flag** | `dragonsx.settings.perf` → `{ restoreSessionTabs }` |
| **Snapshot** | `localStorage` → `dragonsx.session.tabs` |
| **Módulo** | `Frontend/src/settings/sessionTabs.js` |
| **Efeito** | Ao fechar, salva URL/título/ordem/aba ativa; ao abrir, recria as abas |
| **Custo** | Mais CPU/RAM na inicialização (todas as abas carregam de uma vez) — aviso na UI |

---

## Entrada na UI

| Entrada | Wiring |
|---------|--------|
| `#editarBtn` (nav direita) | `Top/Top.js` → `EditarScreen.open()` |
| Menu → Editar | `Top/Menu/Menu.js` → `handleMenuClick` |

Ícone do botão: sliders (ajustes) em `Top/Top.html`.

---

## Boot

`js/app.js` chama `PerfSettings.init()` e `SessionTabs.init()` após `TopBar.init()`. Se `restoreSessionTabs` estiver ativo e houver snapshot, `SessionTabs.restore()` recria as abas; caso contrário, `AppShell.showHome()`.

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
- [`Log v1.4.MD`](../../Lançamento/Log%20v1.4.MD) · [`Log v1.3.MD`](../../Lançamento/Log%20v1.3.MD)
