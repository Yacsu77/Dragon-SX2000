# CursorControll — Documentação Técnica

Módulo responsável pelas ações do mouse no navegador DSX: menu de contexto personalizado e autoscroll com botão do meio.

---

## 1. Objetivo do módulo

Substituir o menu de contexto genérico do Electron por um menu contextual que identifica o elemento clicado e exibe somente ações válidas para aquele contexto (texto selecionado, aba, campo editável, página, link).

Também implementa autoscroll com botão do meio nas páginas e fechamento de aba com botão do meio na barra de abas.

---

## 2. Estrutura de diretórios

```text
Frontend/src/CursorControll/
├── actions/
│   ├── clipboardActions.js
│   ├── navigationActions.js
│   ├── tabActions.js
│   ├── favoriteActions.js
│   ├── linkActions.js
│   ├── searchActions.js
│   └── translationActions.js
├── components/
│   ├── CursorContextMenu.js
│   ├── CursorMenuItem.js
│   ├── CursorMenuGroup.js
│   ├── CursorMenuSeparator.js
│   └── CursorSubmenu.js
├── contexts/
│   ├── selectedTextContext.js
│   ├── tabContext.js
│   ├── textInputContext.js
│   ├── pageContext.js
│   └── linkContext.js
├── hooks/
│   ├── useCursorContextMenu.js
│   └── useMiddleMouseScroll.js
├── services/
│   ├── contextDetectionService.js
│   ├── contextMenuService.js
│   ├── mouseEventService.js
│   ├── middleMouseScrollService.js
│   ├── urlUtils.js
│   └── logger.js
├── styles/
│   └── CursorContextMenu.css
├── types/
│   └── cursorControll.types.js
├── index.js
└── CursorDocs.MD
```

Testes unitários: `scripts/test-cursor-controll.js` (raiz do projeto).

---

## 3. Responsabilidade de cada arquivo

| Arquivo | Responsabilidade |
|---|---|
| `index.js` | Inicialização do módulo e consumo de URL pendente em novas janelas |
| `types/cursorControll.types.js` | Contratos JSDoc (`CursorContext`, `CursorMenuAction`) |
| `services/urlUtils.js` | Normalização e validação de URLs (`http:`/`https:`) |
| `services/logger.js` | Logs discretos com prefixo `[CursorControll]` |
| `services/contextDetectionService.js` | Detecção centralizada de contexto |
| `services/contextMenuService.js` | Montagem de ações e cálculo de posição do menu |
| `services/mouseEventService.js` | Listeners em webviews e abas |
| `services/middleMouseScrollService.js` | Autoscroll com `requestAnimationFrame` |
| `contexts/*.js` | Listas de ações por tipo de contexto |
| `actions/*.js` | Execução de operações (clipboard, navegação, abas, etc.) |
| `components/*.js` | Renderização visual do menu |
| `hooks/*.js` | Facades para abrir menu e anexar autoscroll |
| `styles/CursorContextMenu.css` | Aparência do menu e indicador de autoscroll |

---

## 4. Fluxo de detecção do contexto

1. Usuário clica com botão direito.
2. **Webview:** evento `context-menu` do Electron fornece `params` (`selectionText`, `linkURL`, `isEditable`, `editFlags`).
3. **Aba:** evento `contextmenu` na `.tab` identifica `tabId`.
4. `contextDetectionService` normaliza os dados em `CursorContext`.
5. `resolveContextType()` aplica regra de prioridade.
6. O contexto correspondente retorna lista de `CursorMenuAction`.
7. `CursorContextMenu` renderiza e posiciona o menu.

---

## 5. Ordem de prioridade dos contextos

1. Campo editável (`isEditable` e não `readonly`/`disabled`)
2. Texto selecionado
3. Link
4. Aba
5. Página comum
6. Desconhecido

Ações duplicadas são filtradas por `id` em `contextMenuService`.

---

## 6. Lista de ações disponíveis

### Texto selecionado
- Pesquisar no Google (nova aba à direita)
- Copiar
- Traduzir *(Em breve — desabilitado)*

### Aba
- Duplicar aba
- Fechar aba
- Copiar URL
- Silenciar aba / Ativar som da aba
- Adicionar aos favoritos / Remover dos favoritos

### Campo de texto
- Colar
- Copiar *(somente com seleção)*
- Cortar *(somente com seleção)*
- Colar e ir

### Página comum
- Voltar
- Recarregar página
- Adicionar aos favoritos / Remover dos favoritos

### Link
- Abrir link
- Abrir link em nova aba
- Abrir link em nova janela
- Copiar link
- Adicionar link aos favoritos

---

## 7. Funcionamento do botão direito

- **Páginas (webview):** `context-menu` → menu contextual customizado.
- **Abas:** `contextmenu` na barra de abas → menu de aba.
- Menu fecha ao: clicar fora, executar ação, `Escape`, trocar aba, navegar, perder foco da janela.
- Apenas um menu aberto por vez.

---

## 8. Funcionamento do botão do meio

| Área | Comportamento |
|---|---|
| Conteúdo da página (webview) | Ativa autoscroll; movimento vertical controla velocidade de rolagem |
| Barra de abas | Fecha a aba clicada |

**Autoscroll:**
- Zona neutra de 12px ao redor do ponto de ativação
- Velocidade máxima 28px/frame com suavização
- Indicador visual circular no ponto de ativação
- Desativa em: novo clique meio/esquerdo, `Escape`, troca de aba, navegação, blur, fechamento

---

## 9. Fluxo de comunicação IPC

| Canal | Direção | Uso |
|---|---|---|
| `cursor:create-window` | renderer → main | Abre nova janela do navegador com URL |
| `cursor:consume-pending-url` | renderer → main | Nova janela consome URL pendente na inicialização |

API preload: `window.DragonCursorControl.createWindow(url)` e `consumePendingUrl()`.

Validação de URL no main process via `isAllowedNavigationUrl()` (somente `http:`/`https:`).

---

## 10. Integração com abas

- Usa `window.createTab`, `window.createTabAfter`, `window.closeTab`, `window.activateTab`.
- `createTabAfter(referenceTabId, url, title, icon, activate)` inserido em `Tabs.core.js`.
- Eventos ouvidos: `app:tab-changed`, `app:tab-closed`, `app:webview-navigated`.
- Indicador visual `tab--muted` para abas silenciadas.

---

## 11. Integração com favoritos

Reutiliza `window.Favoritos` com APIs estendidas:
- `isFavorite(url)`
- `removeByUrl(url)`
- `toggle(title, url)`

Armazenamento: `localStorage` (`dragon-favoritos-v1`) — sem segundo repositório.

---

## 12. Integração com clipboard

- Texto no shell: `navigator.clipboard.writeText/readText`
- Campos no webview: `webview.copy()`, `webview.cut()`, `webview.paste()`
- Erros tratados e logados; ações não executam silenciosamente em falha

---

## 13. Regras de segurança

- `contextIsolation: true` mantido
- Sem `nodeIntegration` no renderer
- URLs validadas antes de navegação (`http:`/`https:` apenas)
- Nova janela via IPC no main process (não `window.open` direto)
- Dados do `context-menu` tratados como não confiáveis; apenas campos declarados do `params` são usados

---

## 14. Navegação por teclado

| Tecla | Ação |
|---|---|
| `ArrowDown` | Próximo item habilitado |
| `ArrowUp` | Item anterior habilitado |
| `Enter` / `Space` | Executar item |
| `Escape` | Fechar menu |

Atributos ARIA: `role="menu"`, `role="menuitem"`, `role="separator"`.

---

## 15. Como adicionar uma nova ação

1. Implemente a lógica em `actions/<domínio>Actions.js`.
2. Adicione entrada no contexto correspondente em `contexts/`.
3. Defina `id`, `label`, `icon` (Lucide), `execute` e flags (`disabled`, `separatorBefore`).
4. Não duplique `id` entre ações do mesmo menu.

---

## 16. Como adicionar um novo contexto

1. Adicione tipo em `cursorControll.types.js`.
2. Atualize `resolveContextType()` com prioridade documentada.
3. Crie `contexts/<nome>Context.js` com `getActions(context)`.
4. Registre em `CONTEXT_MAP` de `contextMenuService.js`.
5. Adicione detecção em `contextDetectionService.js` se necessário.

---

## 17. Limitações conhecidas

- Rolagem horizontal do autoscroll não implementada (apenas vertical).
- Submenus preparados estruturalmente, mas não utilizados nesta versão.
- Tradução exibida como "Em breve" sem integração de API.
- Testes de interface (DOM) dependem de validação manual no Electron.
- `createTab` padrão ainda adiciona ao final; `createTabAfter` usado onde posição importa.

---

## 18. Recursos futuros

- Tradução de texto selecionado
- Submenus funcionais
- Rolagem horizontal no autoscroll
- Atalho de teclado para recarregar (F5) integrado ao módulo
- Extração de `urlUtils` para módulo global compartilhado do Frontend

---

## 19. Procedimento de testes

### Automatizados
```bash
npm run test:cursor-controll
```

Cobre: URL utils, prioridade de contexto, posicionamento do menu, física do autoscroll.

### Manuais (Electron)
- [ ] Botão direito em texto selecionado → copiar e pesquisar
- [ ] Botão direito em link → abrir, nova aba, nova janela, copiar
- [ ] Botão direito em campo → colar, copiar, cortar, colar e ir
- [ ] Botão direito em página → voltar, recarregar, favorito
- [ ] Botão direito em aba → duplicar, fechar, copiar URL, silenciar, favorito
- [ ] Botão do meio na página → autoscroll com indicador
- [ ] Botão do meio na aba → fecha aba
- [ ] Menu não ultrapassa bordas da tela
- [ ] Navegação por teclado no menu
- [ ] Tema claro e escuro

---

## 20. Arquivos alterados durante o desenvolvimento

### Criados
- `Frontend/src/CursorControll/**` (módulo completo)
- `scripts/test-cursor-controll.js`

### Modificados
- `Frontend/src/index.html` — scripts do módulo
- `Frontend/src/core/manifest.css` — import CSS
- `Frontend/src/js/app.js` — inicialização
- `Frontend/src/Tabs/Tabs.core.js` — `createTabAfter`, integração de eventos
- `Frontend/src/Favoritos/Favoritos.js` — `isFavorite`, `removeByUrl`, `toggle`
- `main.js` — IPC `cursor:*`, `createBrowserWindow`
- `preload.js` — `DragonCursorControl`
- `package.json` — script `test:cursor-controll`
- `Version/Lançamento/Log v1.3.MD` — registro da feature
