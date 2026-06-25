# DSX — Shortcuts

Sistema de atalhos globais do navegador **DSX** (anteriormente Dragon SX2000). Centraliza registro, persistência de bindings customizados pelo usuário e a UI dos overlays acionados pelos atalhos.

---

## Versão e downloads

| | |
|---|---|
| **Versão disponível** | **v1.2.4** |
| **Próximo lançamento** | **06/07/2026** |
| **Executáveis** | Somente via [GitHub Releases](https://github.com/Yacsu77/Dragon-SX2000/releases) |

Os instaladores (`.exe`, `.dmg`, `.deb`, `.AppImage`) são publicados automaticamente na branch `main` com o nome **DSX** — ex.: `DSX-1.2.4-win-x64.exe`. Não há distribuição de binários fora do Release.

---

## Estrutura

```
Frontend/src/shortcuts/
├── README.md                          # Este arquivo
├── index.js                           # Bootstrap: chama ShortcutManager.start()
├── core/
│   └── ShortcutManager.js             # Registry, parse de combos, persistência, listener global
├── overlays/                          # Atalhos COM UI flutuante
│   └── search-palette/                # Ctrl+Space
│       ├── index.js
│       └── index.css
└── actions/                           # Atalhos SEM UI (apenas disparam ações)
    ├── tab-controls/                  # Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+Shift+Tab
    │   └── index.js
    └── history-controls/              # Atalhos de histórico
        └── index.js
```

Convenção:
- `overlays/<nome>/` — atalhos que abrem uma camada visual (palette, painel, modal). Tem `index.js` + `index.css`.
- `actions/<nome>/` — atalhos que apenas disparam uma função (abrir aba, fechar aba, ativar widget, etc.). Só `index.js`.

Cada arquivo registra seu próprio atalho via `window.ShortcutManager.register({ ... })` no momento em que o script é carregado.

Documentação geral do Frontend: [`Version/Docs/Frontend/Inicial.MD`](../../../Version/Docs/Frontend/Inicial.MD) · módulo shortcuts: [`Version/Docs/Frontend/shortcuts.MD`](../../../Version/Docs/Frontend/shortcuts.MD)

---

## Atalhos disponíveis

| ID | Default | Categoria | O que faz |
|----|---------|-----------|-----------|
| `search-palette` | `Ctrl+Space` | Navegação | Abre a paleta de busca flutuante. Aceita texto (busca no Google) ou URL (abre nova aba). `Esc` ou clique fora cancela sem buscar. |
| `tab-new` | `Ctrl+T` | Abas | Abre uma nova aba na página inicial. |
| `tab-close` | `Ctrl+W` | Abas | Fecha a aba atualmente ativa. |
| `tab-next` | `Ctrl+Tab` | Abas | Alterna para a próxima aba (com retorno ao início). |
| `tab-prev` | `Ctrl+Shift+Tab` | Abas | Alterna para a aba anterior (com retorno ao fim). |

> Adicione novos atalhos aqui e mantenha esta tabela em sincronia com a próxima versão da settings page.

---

## Como funcionam os combos

Formato canônico: modificadores em ordem fixa **`Ctrl+Shift+Alt+Meta+Tecla`**, separados por `+`.

Exemplos válidos:
- `Ctrl+Space`
- `Ctrl+Shift+K`
- `Alt+ArrowLeft`
- `F5`
- `Ctrl+Plus` / `Ctrl+Minus`

O `ShortcutManager.normalizeCombo()` aceita variações (`ctrl+space`, `CTRL + space`, `control+space`) e devolve a forma canônica.

Bindings vazios (`""`) significam "atalho desabilitado" — não dispara mais.

---

## API pública (`window.ShortcutManager`)

```js
ShortcutManager.register({
  id:           "meu-atalho",          // único por shortcut
  label:        "Nome amigável",        // aparece na settings page
  description:  "Explicação completa.",
  defaultKeys:  "Ctrl+Shift+K",        // combo no formato canônico
  category:     "Navegação",            // agrupamento na UI
  allowInInputs: false,                 // se true, dispara mesmo dentro de <input>
  handler: (event, ctx) => {
    // Disparado quando o combo é pressionado.
    // Retornar `false` para deixar o evento passar (sem preventDefault).
  },
});

ShortcutManager.unregister("meu-atalho");

// Lista todos com bindings atuais (default ou customizado pelo usuário)
ShortcutManager.getAll(); // → ShortcutEntry[]

// Mudar binding (persistido em localStorage automaticamente)
ShortcutManager.setBinding("meu-atalho", "Ctrl+K");
ShortcutManager.resetBinding("meu-atalho"); // volta pro defaultKeys

// Notificações de mudança de bindings (para a settings page)
const off = ShortcutManager.onChange((shortcuts) => {
  console.log("bindings atualizados:", shortcuts);
});
off(); // remove listener

// Helpers de parse
ShortcutManager.normalizeCombo("ctrl + space"); // → "Ctrl+Space"
ShortcutManager.comboFromEvent(keyboardEvent);  // → "Ctrl+Space"
```

### Schema (`ShortcutEntry`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `string` | Identificador único do atalho. |
| `label` | `string` | Nome amigável exibido ao usuário. |
| `description` | `string` | Texto explicativo (1–2 frases). |
| `defaultKeys` | `string` | Combo canônico de fábrica. |
| `keys` | `string` | Combo atual (default ou override do usuário). `""` = desabilitado. |
| `handler` | `function(event, ctx)` | Callback executado ao disparar. |
| `allowInInputs` | `boolean` | Se `true`, dispara mesmo com foco em `<input>/<textarea>/contenteditable`. |
| `category` | `string` | Grupo na UI da settings page. |

---

## Persistência

Os overrides do usuário são gravados em `localStorage` na chave **`dragonsx.shortcuts.bindings`** como um objeto:

```json
{
  "search-palette": "Ctrl+K"
}
```

Atalhos que estão no default não são salvos (mantém o storage limpo e permite alterar defaults no código sem prender o usuário a um valor antigo).

---

## Como adicionar um novo atalho

1. **Crie a pasta do overlay** (se houver UI):

   ```
   shortcuts/overlays/meu-atalho/
   ├── index.js
   └── index.css
   ```

2. **No `index.js` do overlay**, registre o atalho:

   ```js
   (function () {
     function open() { /* monta DOM, mostra overlay, foca input, etc. */ }

     window.MeuAtalho = { open };

     function tryRegister() {
       if (!window.ShortcutManager) { setTimeout(tryRegister, 50); return; }
       window.ShortcutManager.register({
         id: "meu-atalho",
         label: "Abrir meu atalho",
         description: "O que esse atalho faz, em uma frase.",
         defaultKeys: "Ctrl+Shift+K",
         category: "Navegação",
         handler: () => open(),
       });
     }
     if (document.readyState === "loading") {
       document.addEventListener("DOMContentLoaded", tryRegister);
     } else {
       tryRegister();
     }
   })();
   ```

3. **Inclua os arquivos no `Frontend/src/index.html`** (CSS no `<head>`, JS no fim do `<body>`, antes do `shortcuts/index.js`).

4. **Atualize a tabela "Atalhos disponíveis"** acima.

Não edite `core/ShortcutManager.js` para adicionar atalhos — ele é genérico.

---

## Regras de UX

- **Não disparar dentro de inputs**: o manager ignora atalhos quando o usuário está digitando, exceto se `allowInInputs: true`.
- **Cancelamento sem efeito colateral**: overlays de "comando" (search palette, command palette futura, etc.) devem fechar via `Esc` ou clique no backdrop **sem** executar nenhuma ação.
- **Toggle**: pressionar o atalho de novo enquanto o overlay está aberto deve fechar (já implementado no search-palette).
- **Foco**: ao abrir, focar o primeiro elemento interativo. Ao fechar, devolver foco ao elemento que estava focado antes (ou ao body).
- **z-index**: overlays de atalhos devem ficar acima de qualquer widget AutoTune. Use `z-index >= 9000`.

---

## Settings page (próximo passo)

Já temos toda a base para uma página de configuração de atalhos. O fluxo planejado:

1. Adicionar uma entrada **"Atalhos"** ao painel lateral (`UserINTer/Tabline/`)
2. Página em `UserINTer/Tabline/idget/Shortcuts/`:
   - Lista todos os shortcuts via `ShortcutManager.getAll()`
   - Agrupa por `category`
   - Para cada item, mostra: label, description, current keys, defaultKeys
   - Botão "Editar" → abre um capturador de teclas que escuta o próximo `keydown` e chama `setBinding(id, comboFromEvent(event))`
   - Botão "Resetar" → `resetBinding(id)`
   - Validação: avisar se o combo digitado já está em uso por outro shortcut (consultando `getAll()`)
3. Integração: a página assina `ShortcutManager.onChange` para refletir mudanças vindas de outras telas (se houver).

Schema do conflito a tratar:
- Mesmo combo em mais de um shortcut → o primeiro registrado vence. A settings page deve avisar e oferecer trocar.

---

## Debugging

```js
// No DevTools, lista todos os atalhos com bindings atuais:
console.table(window.ShortcutManager.getAll());

// Forçar uma mudança:
window.ShortcutManager.setBinding("search-palette", "Ctrl+K");

// Resetar:
window.ShortcutManager.resetBinding("search-palette");

// Simular o disparo (chamada direta do handler do search-palette):
window.SearchPalette.toggle();
```

---

## Licença

ISC — DSX / Pedro Henrique Carneichuk Rosa
