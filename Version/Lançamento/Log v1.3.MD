# DSX — Log de Lançamento

> O produto passou a se chamar **DSX** (antes Dragon SX2000). Executáveis e releases usam o prefixo `DSX`.

## Versão 1.3.0 (Beta)

| | |
|---|---|
| **Versão** | 1.3.0 Beta |
| **Data de lançamento** | Jul/2026 |
| **Plataforma** | Desktop (Electron) |
| **Downloads** | [GitHub Releases](https://github.com/Yacsu77/Dragon-SX2000/releases) |

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
| **Demais módulos** | Sem alteração em relação à v1.2 | Ver [`Log v1.2.MD`](Log%20v1.2.MD) e [`Log 1.0.MD`](Log%201.0.MD) |

---

## Documentação

| Arquivo | Descrição |
|---|---|
| [`Wallpaper.MD`](../Docs/Frontend/Wallpaper.MD) | Atualizado — persistência em disco e API `DragonWallpaper` |
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
