# DSX — Log de Lançamento

> O produto passou a se chamar **DSX** (antes Dragon SX2000). Executáveis e releases usam o prefixo `DSX`.

## Versão 1.3.0 (Beta)

| | |
|---|---|
| **Versão** | 1.3.0 Beta |
| **Data de lançamento** | Jul/2026 |
| **Plataforma** | Desktop (Electron) |
| **Downloads** | [GitHub Releases](https://github.com/Yacsu77/Dragon-SX2000/releases) |
| **Sucessor** | [Log v1.4.MD](Log%20v1.4.MD) — lançamento **04/08/2026** em [dragonsx.com.br](https://dragonsx.com.br) |

---

## O que foi implementado

### Wallpaper — persistência em disco

| Item | Descrição |
|---|---|
| **Bug corrigido** | Wallpaper animado (`.mp4`) voltava para a foto antiga após fechar e reabrir o app |
| **Causa** | Fotos salvas em `localStorage` (base64) estouravam a quota e impediam gravar o vídeo; caminho do arquivo também falhava no Electron recente |
| **Solução** | Persistência via IPC Electron em `userData/wallpapers/` |
| **Arquivos copiados** | Imagem ou vídeo aplicado é copiado para `wallpaper.{ext}` na pasta do app |
| **Estado** | Metadados em `userData/wallpapers/state.json` (tipo, caminho, transformações) |
| **API preload** | `window.DragonWallpaper` — `readState`, `saveState`, `importFile`, `importDataUrl`, `importBlob`, `getFilePath` |
| **Resolução de path** | `webUtils.getPathForFile()` com fallback para `file.path` |
| **Fallback blob** | Se o caminho não estiver disponível, o vídeo é copiado do blob para disco |
| **Migração** | `localStorage` legado (`wallpaperState`) ainda é lido na primeira carga; removido ao salvar via disco |

**Arquivos alterados:** `main.js`, `preload.js`, `UserINTer/Tabline/idget/Wallpaper/index.js`

---

### AutoTune Music — modo minimalista (Beta)

| Funcionalidade | Descrição |
|---|---|
| **Player compacto** | Barra fina acoplada abaixo da barra de abas / topo, com capa, título, artista e progresso |
| **Ativação** | Habilitável no catálogo AutoTune (`minimal.js` + `minimal.css`) |
| **Posição** | Offset horizontal arrastável; persistido em `settingsAUTO.music.minimalOffsetX` |
| **Controle de volume** | Zona lateral com slider vertical; nível persistido em `settingsAUTO.music.minimalVolumeLevel` |
| **Integração SDK** | Now playing e controles via Dragon Media SDK (WebSocket) |

**Arquivos:** `UserINTer/Tabline/idget/AutoTune/Music/minimal.js`, `minimal.css`

---

### Dragon Media SDK — controle de volume

| Plataforma | Implementação |
|---|---|
| **Windows** | SMTC via `windows-smtc-control.ps1` |
| **macOS** | `nowplaying-cli` |
| **Linux** | `pactl set-sink-volume` (+5% / −5%) |
| **Ações** | `volume_up` / `volume_down` (aliases: `vol_up`, `vol_down`) expostas no `BaseController` |
| **Frontend** | Widget Music minimal consome volume via bridge WebSocket |

**Arquivos:** `Backend/SDK/src/control/BaseController.js`, `WindowsController.js`, `MacOSController.js`, `LinuxController.js`

---

### AutoTune Music — visibilidade na tela principal

| Funcionalidade | Descrição |
|---|---|
| **Mini player na Home** | Widget Music visível na área principal, integrado ao SDK |
| **Volume na UI** | Controles de volume no player minimal acoplado ao topo |
| **Persistência** | Estado ativo/inativo e preferências em `settingsAUTO` |

---

### Abas — correção de abertura

| Correção | Descrição |
|---|---|
| **Nova aba via página aberta** | Fix na abertura de aba a partir de link/página já aberta (`Fix: Tab New Aba`) |

---

### Barra de endereço — URL fantasma na aba Home

| Item | Descrição |
|---|---|
| **Bug** | Na aba Home/principal, a barra de pesquisa às vezes exibia a URL da última aba aberta |
| **Causa** | `onWebviewNavigated` atualizava a barra para **qualquer** webview (incluindo abas em segundo plano); `updateAddressBar` não limpava quando não havia webview ativa |
| **Correção** | Só a webview `.active` atualiza a barra; na Home (sem webview ativa) a barra é sempre limpa |
| **Arquivo** | `Frontend/src/Top/Search/Search.js` |

---

### Atalhos globais — disponíveis dentro de sites e inputs

| Item | Descrição |
|---|---|
| **Problema** | `Ctrl+Space`, `Ctrl+T`, `Ctrl+W` e demais atalhos falhavam ao navegar em um site (foco no webview) ou ao digitar em inputs |
| **Causa (webview)** | Teclas capturadas pelo processo do site; o listener do renderer host não recebia o evento |
| **Causa (inputs)** | `ShortcutManager` bloqueava atalhos em `INPUT`/`TEXTAREA` sem `allowInInputs` |
| **Solução** | Flag `global: true` + interceptação no main via `before-input-event` nos webviews; reenvio IPC `shortcuts:global-combo` |
| **Bridge** | `window.DragonShortcuts` (`setGlobalCombos`, `onGlobalCombo`) em `preload.js` |
| **Atalhos marcados** | Paleta (`Ctrl+Space`), abas (`Ctrl+T/W/Tab`), histórico (`Ctrl+H`), navegação (`Ctrl+R`, Voltar/Avançar) |

**Arquivos:** `ShortcutManager.js`, `main.js`, `preload.js`, overlays/actions de shortcuts

---

### Tela de Atalhos + MiniAtalhos

| Funcionalidade | Descrição |
|---|---|
| **Tela cheia** | `Frontend/Telas/Atalhos/` — lista todos os atalhos por categoria, botão Editar, captura de nova combinação |
| **Captura** | Retângulo central: teclado **ou** botão extra do mouse; conflito detectado; Aplicar / Remover / Restaurar padrão |
| **Arquitetura** | Camadas SOLID: `Atalhos.format` · `Atalhos.render` · `Atalhos.capture` · `AtalhosScreen` (Facade) |
| **Mini preview** | `Frontend/MiniTelas/MiniAtalhos/` — 3 atalhos principais (Paleta, Nova aba, Fechar aba) + “Ver todos” |
| **Menu** | Item “Atalhos” no menu lateral: preview no hover, abre tela no clique |
| **Persistência** | `ShortcutManager.setBinding` → `localStorage` (`dragonsx.shortcuts.bindings`) |

---

### Novos atalhos de navegação + mouse

| ID | Default | Descrição |
|---|---|---|
| `nav-back` | *(sem tecla)* | Voltar — usuário mapeia (teclado ou mouse) |
| `nav-forward` | *(sem tecla)* | Avançar — usuário mapeia |
| `page-reload` | `Ctrl+R` | Recarrega a aba ativa |
| **Mouse extras** | `Mouse3+` | Botões laterais (≥ 3) mapeáveis; esquerdo/central/direito/scroll reservados |
| **Menu Electron** | Win/Linux | Menu padrão removido para não conflitar com `Ctrl+R` / `Ctrl+W` |

**Arquivos:** `shortcuts/actions/navigation-controls/`, `ShortcutManager.js` (`comboFromMouseEvent`, `dispatchCombo`)

---

### Performance — troca de abas e carregamento

| Item | Descrição |
|---|---|
| **Flash ao trocar aba** | Conteúdo era desativado antes da animação (~250–400 ms de fundo vazio); agora a webview troca **na hora** e a animação da barra é só cosmética |
| **Flash ao abrir site** | `.browser-container` / `webview` sem fundo deixavam o wallpaper vazar; fundo opaco `--content-bg` |
| **#1 Prefetch (padrão)** | `ConnectionPrefetch` — `dns-prefetch` + `preconnect` ao digitar na barra |
| **#3 Cache persistente** | Webviews com `partition="persist:dragon"` (cache/cookies/conexões compartilhados) via `buildWebview()` |
| **#2 Render-all (opcional)** | Preferência em `PerfSettings` + classe `body.perf-render-all`; abas inativas ficam empilhadas (troca instantânea; mais CPU/RAM) |
| **Tela Editar** | Botão no canto superior direito (`#editarBtn`) + item do menu → `Frontend/Telas/Editar/` com toggle e aviso de recursos |

**Arquivos:** `Tabs.core.js`, `Browser.css`, `variables.css`, `js/connectionPrefetch.js`, `settings/perfSettings.js`, `Telas/Editar/`

---

### CursorControll e ações do mouse

| Funcionalidade | Descrição |
|---|---|
| **Menu de contexto** | Menu personalizado para páginas, links, textos selecionados, campos editáveis e abas |
| **Ações de edição** | Copiar, colar, cortar e colar e ir em campos de texto via API do webview |
| **Navegação** | Voltar, recarregar, abrir links (aba atual, nova aba, nova janela) |
| **Abas** | Duplicar, fechar, copiar URL, silenciar/ativar som (`webview.setAudioMuted`) |
| **Favoritos** | Adicionar/remover via `Favoritos.toggle()` reutilizando `localStorage` existente |
| **Busca** | Pesquisar texto selecionado no Google em nova aba à direita |
| **Autoscroll** | Botão do meio na página ativa rolagem automática com indicador visual |
| **Fechar aba** | Botão do meio na barra de abas fecha a aba correspondente |
| **Teclado** | Navegação por setas, Enter, Escape no menu |
| **IPC** | `DragonCursorControl.createWindow()` para nova janela segura |
| **Documentação** | `Frontend/src/CursorControll/CursorDocs.MD` |
| **Testes** | `npm run test:cursor-controll` (lógica pura) |

**Arquivos:** `Frontend/src/CursorControll/`, `Tabs.core.js`, `Favoritos.js`, `main.js`, `preload.js`

**Pendente nesta versão:** tradução de texto (item exibido como "Em breve").

---

### SDK — melhorias por plataforma

| Plataforma | Melhoria |
|---|---|
| **Windows** | Controller SMTC nativo (play, pause, next, previous) sem depender de `keybd_event` |
| **macOS** | Captura de mídia via `nowplaying-cli` desacoplado; orquestração e dependências de build |
| **Linux** | Capture com biblioteca dedicada; ajustes no build e config JSON |
| **Build** | Scripts `prebuild:mac` / `prebuild:linux` / `prebuild:win` atualizados para dependências da SDK |

---

## Persistência de dados (atualizado)

| Módulo | Armazenamento | O que salva |
|---|---|---|
| **Wallpaper** | `userData/wallpapers/state.json` + arquivo de mídia | Tipo (imagem/vídeo), caminho persistente, transformações |
| **Wallpaper (legado)** | `localStorage` → `wallpaperState` | Migrado na leitura; substituído ao aplicar novo wallpaper |
| **AutoTune Music minimal** | `settingsAUTO.music` | `minimal`, `minimalOffsetX`, `minimalVolumeLevel` |
| **Atalhos (bindings)** | `localStorage` → `dragonsx.shortcuts.bindings` | Combos customizados por id de atalho |
| **Desempenho** | `localStorage` → `dragonsx.settings.perf` | `renderAllTabs` (manter abas renderizadas) |
| **Sessão webview** | Electron `partition: persist:dragon` | Cache HTTP, cookies e conexões entre abas/sessões |
| **Demais módulos** | Sem alteração em relação à v1.2 | Ver [`Log v1.2.MD`](Log%20v1.2.MD) e [`Log 1.0.MD`](Log%201.0.MD) |

---

## Documentação

| Arquivo | Descrição |
|---|---|
| [`Wallpaper.MD`](../Docs/Frontend/Wallpaper.MD) | Persistência em disco e API `DragonWallpaper` |
| [`shortcuts.MD`](../Docs/Frontend/shortcuts.MD) | Atalhos globais, mouse, navegação, tela de gestão |
| [`Atalhos.MD`](../Docs/Frontend/Atalhos.MD) | Tela cheia + MiniAtalhos + captura de combos |
| [`Editar.MD`](../Docs/Frontend/Editar.MD) | Preferências de desempenho (render-all) |
| [`Tabs.MD`](../Docs/Frontend/Tabs.MD) | Troca instantânea, `buildWebview`, partição persistente |
| [`Browser.MD`](../Docs/Frontend/Browser.MD) | Fundo opaco, modo `perf-render-all` |
| [`Top.MD`](../Docs/Frontend/Top.MD) | Menu Atalhos/Editar, botão Editar, Search |
| [`js.MD`](../Docs/Frontend/js.MD) | `ConnectionPrefetch`, boot com `PerfSettings` |
| [`core.MD`](../Docs/Frontend/core.MD) | Token `--content-bg` |
| [`Inicial.MD`](../Docs/Frontend/Inicial.MD) / [`index.MD`](../Docs/Frontend/index.MD) | Mapa e ordem de scripts atualizados |
| [`Log v1.4.MD`](Log%20v1.4.MD) | **Próximo release** (04/08/2026 · dragonsx.com.br) |
| [`Log v1.2.MD`](Log%20v1.2.MD) | Release anterior (refatoração modular Frontend) |
| [`Log v1.1.MD`](Log%20v1.1.MD) | AutoTune Clock, Factory, histórico API-DSX |
| [`Log 1.0.MD`](Log%201.0.MD) | Release beta inicial |

---

## Downloads

Instaladores publicados em [GitHub Releases](https://github.com/Yacsu77/Dragon-SX2000/releases):

- Windows: `DSX-1.3.0-win-x64.exe`
- macOS: `DSX-1.3.0-mac-x64.dmg` / `arm64`
- Linux: `DSX-1.3.0-linux-x64.deb` e `.AppImage`

---

<p align="center">
  <sub>DSX 1.3.0 Beta — © Pedro Henrique Carneichuk Rosa</sub>
</p>
