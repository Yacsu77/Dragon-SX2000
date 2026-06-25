# core/ — Fundação da aplicação

**Caminho:** `Frontend/src/core/`

---

## Responsabilidade

CSS base, montagem de fragmentos HTML, estado global home/navegador e agregador de estilos.

---

## Arquivos

| Arquivo | Função |
|---------|--------|
| `manifest.css` | Único `@import` de todos os CSS do Frontend (linkado no `index.html`) |
| `reset.css` | Reset global (`*`, `body` flex column, `100vh`) |
| `variables.css` | Tokens CSS (`:root`, `[data-theme="light"]`) |
| `background.css` | `.background`, `.background-video` (fixo atrás da UI) |
| `shell.css` | Visibilidade inicial: esconde nav, tabs, home, browser até ativação |
| `background.html` | Fragmento do vídeo de fundo |
| `Shell.js` | `Shell.mountAll()` — fetch dos fragmentos nos mount points |
| `AppShell.js` | `showHome()` / `showBrowser()` + CustomEvents |

---

## API pública

```js
window.Shell = { mountAll() }
window.AppShell = { showHome(), showBrowser(), init() }
window.showHome / window.showBrowser  // compatibilidade legada
```

---

## CustomEvents (`AppShell.js`)

| Evento | Quando |
|--------|--------|
| `app:home-shown` | Home tab visível; limpa barra de endereço; mostra AutoTune |
| `app:browser-shown` | Webview visível; esconde widgets AutoTune na home |

---

## Como mudar o comportamento

### Adicionar fragmento HTML ao shell

1. Criar o `.html` (ex.: `MeuModulo/MeuModulo.html`)
2. Adicionar `<div id="meuRoot"></div>` no `index.html`
3. Em `Shell.js`, incluir em `FRAGMENTS`:

```js
{ mountId: 'meuRoot', path: 'MeuModulo/MeuModulo.html' }
```

### Alterar tema / cores globais

Editar `variables.css` — tokens `--app-bg`, `--nav-bg`, `--app-text`, etc.

Tema claro/escuro alternado pelo idget Tema (`UserINTer/Tabline/idget/Tema/`).

### Mudar o que acontece ao entrar na home

Editar `AppShell.js` → função `showHome()`:

- Limpar barra: `NavSearch.clearAddressBar()`
- Visibilidade AutoTune: `setAutoTuneHomeVisible(true)`
- Adicionar listeners: escutar `app:home-shown` em outro módulo (preferível)

### Adicionar CSS de um módulo novo

Incluir linha em `manifest.css`:

```css
@import url('../MeuModulo/MeuModulo.css');
```

### Esconder/mostrar painéis no boot

`shell.css` define `display: none` inicial para `.nav-bar`, `.tabs-bar`, `.home-page`, `.browser-container`. Módulos removem/adicionam classes (`hidden`, `active`) em runtime.
