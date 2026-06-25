# TopActions/ — Botões direitos da barra

**Caminho:** `Frontend/src/TopActions/`

---

## Responsabilidade

Handlers dos botões no canto direito da nav. Cada pasta = um botão. Telas fullscreen ficam em `Frontend/Telas/` quando aplicável.

---

## Estrutura

```
TopActions/
├── Downloads/
│   └── Downloads.js      ← #downloadBtn → Telas/Downloads/
├── Arquivos/
│   └── Arquivos.js       ← #arquivosBtn → Telas/Arquivos/
├── NewTab/
│   └── NewTab.js         ← #newTabBtn → createNewTab()
└── Config/
    ├── Config.html       ← Grid de abas (overlay)
    ├── Config.css
    ├── Config.js         ← Visão geral estilo Safari
    └── Config.anim.js    ← Abrir/fechar overlay
```

---

## Downloads/Downloads.js

| Botão | `#downloadBtn` |
| Ação | `DownloadsScreen.open()` |
| Tela | `Frontend/Telas/Downloads/` (HTML, CSS, JS) |

**Mudar conteúdo da tela:** editar `Frontend/Telas/Downloads/Downloads.html` e `.js`.

**Mudar ícone/título do botão:** `Top/Top.html`.

---

## Arquivos/Arquivos.js

| Botão | `#arquivosBtn` |
| Ação | `ArquivosScreen.open()` |
| Tela | `Frontend/Telas/Arquivos/` |
| API Electron | `window.DragonFiles` (preload.js) |

Funções IPC: `readDir`, `getHome`, `pickFolder`.

**Mudar pasta inicial:** `Telas/Arquivos/Arquivos.js` → `getInitialPath()`.

**Abrir arquivo em nova aba:** handler de click em arquivo chama `createTab('file://...')`.

**Requer Electron** — no browser puro a API não existe.

---

## NewTab/NewTab.js

| Botão | `#newTabBtn` |
| Ação | `window.createNewTab()` → `Tabs.core` → `createHomeTab()` |

O "+" nas abas (`.new-tab-dot`) é gerenciado por `Tabs/Tabs.visibility.js`, não por este módulo.

**Mudar para aba em branco vs home tab:** editar `Tabs/Tabs.core.js` → `createNewTab()`.

---

## Config/Config.js

| Botão | `#configBtn` |
| Ação | Abre overlay com grid de todas as abas |

Escuta `app:tab-changed`, `app:tab-created`, `app:tab-closed` para atualizar o grid enquanto aberto.

| Interação | Comportamento |
|-----------|---------------|
| Click no card | `activateTab()` ou `activateHomeTab()` |
| Botão × no card | `closeTab()` |

**API:**

```js
window.ConfigOverview = { open(), close(), init(), renderGrid() }
```

**Mudar layout do grid:** `Config.css` → `.config-grid`, `.config-card`.

**Adicionar preview real do webview:** estender `renderGrid()` em `Config.js` (hoje usa ícone/favicon).

**Mudar animação abrir/fechar:** `Config.anim.js`.

---

## Como adicionar novo botão TopActions

1. Adicionar `<button id="meuBtn">` em `Top/Top.html`
2. Criar `TopActions/MeuBotao/MeuBotao.js`:

```js
(function () {
  function init() {
    document.getElementById('meuBtn')?.addEventListener('click', () => {
      // ação
    });
  }
  window.TopMeuBotao = { init };
})();
```

3. Registrar em `Top/Top.js` → `init()`
4. Adicionar `<script>` em `index.html` antes de `Top/Top.js`
