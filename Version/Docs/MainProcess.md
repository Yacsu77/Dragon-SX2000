# Main Process — Arquitetura

Documentação do processo **main** do Electron no Dragon-SX2000.

Entry: `main.js` → `createMainApp(...).start()`.  
Código: `Main/`. DRM: `MediaDrm/` (fora desta pasta, injetado no bootstrap).

---

## 1. Papel da Main

A Main:

1. Monta os domínios (Composition Root).
2. Registra IPC de cada domínio.
3. Liga o ciclo de vida do Electron (ready, activate, quit, signals).

Ela **não** contém regra de negócio de UA, wallpaper, API, drag de abas, etc. Cada domínio vive na sua pasta e expõe um contrato estreito (`Main/contracts/`).

---

## 2. Fluxo de uso

### 2.1 Entry

```js
// main.js
createMainApp({
  app, BrowserWindow, ipcMain, dialog, session, screen, desktopCapturer,
  projectRoot: __dirname,
  MediaDrmManager,
}).start();
```

### 2.2 Composition (`createMainApp`)

Ordem de montagem:

```
createMainApp
  ├─ backend          (API-DSX + Media SDK)
  ├─ browser          (UA, session, OAuth popup, guest)
  ├─ user             → register(ipcMain)
  ├─ wallpaper        → register(ipcMain)   [usa user.get()]
  ├─ files            → register(ipcMain)
  ├─ downloads        [usa user.get()]
  ├─ shortcuts        → register(ipcMain)
  ├─ windows          [guest ← browser+shortcuts; onClosed limpa janelas+shortcuts]
  ├─ janelas          → register(ipcMain)
  └─ AppLifecycle     → start(app)
```

Dependências cruzadas passam só por **funções injetadas** (`getActiveUserId`, `isAllowedNavigationUrl`, etc.), nunca por import entre pastas de domínio.

### 2.3 Ciclo de vida (`AppLifecycle.start`)

```
installEarly          → switches Chromium (MediaDrm) antes do ready
web-contents-created  → downloads.attach + browser.attachToWebContents
whenReady             → DRM bootstrap → identity → menu → SDK → API → 1ª janela
activate (macOS)      → se sem janelas: DRM + API + nova janela
window-all-closed     → fora do macOS: para backends e quit
before-quit / will-quit → marca quitting, destrói ghost, para backends
SIGINT / SIGTERM / exit → para backends
```

### 2.4 Diagrama de dependência

```
                    ┌─────────────┐
                    │  bootstrap  │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      backend          windows         MediaDrm
           │               │
           │         ┌─────┴──────┐
           │         ▼            ▼
           │      browser      shortcuts
           │         │
           ▼         ▼
      downloads ← user → wallpaper
                       │
                       └── files (isolado)
                       └── janelas ← windows + user + browser (URL)
```

---

## 3. Mapa de pastas

```
Main/
├── bootstrap/     # Composition Root + ciclo de vida
├── backend/       # API-DSX + Media SDK
├── browser/       # UA, session, OAuth popup, guest webview
├── windows/       # BrowserWindow shell + pending boot + menu
├── janelas/       # multi-janela, drag/drop de abas, ghost
├── shortcuts/     # atalhos com foco no guest
├── user/          # perfil ativo, avatar, origins
├── wallpaper/     # estado e import de wallpaper
├── files/         # readDir / home / pickFolder
├── downloads/     # will-download → API :3333
├── contracts/     # ISP (JSDoc + duck-check)
└── index.js       # re-exports
```

---

## 4. Domínios — o que cada classe faz

### 4.1 bootstrap

| Classe / factory | Serviço |
|------------------|---------|
| **`createMainApp`** | Monta todos os domínios, registra IPC, devolve `{ start, lifecycle }`. |
| **`AppLifecycle`** | Handlers do Electron: early switches, ready, activate, quit, signals. Orquestra DRM + backend + identity + 1ª janela. |

**Não faz:** regra de UA, spawn detalhado, IPC de domínio.

Contrato: `IAppBootstrap` — `installEarly`, `whenReady`, `onActivate`, `onBeforeQuit`, `onAllWindowsClosed`.

---

### 4.2 backend

| Classe / factory | Serviço |
|------------------|---------|
| **`BackendServices`** | Facade: `startMediaSdk`, `startApiDsx`, `stopAll`. |
| **`PathResolver`** | Resolve caminhos em `Backend/` (dev vs packaged) e monta `env` dos filhos. |
| **`MediaSdkSupervisor`** | Sobe/para o Dragon Media SDK (`ws://127.0.0.1:8974`). |
| **`ApiDsxSupervisor`** | Sobe/para a API-DSX (`http://127.0.0.1:3333`), probe, wait ready, auto-restart. |

**Não faz:** BrowserWindow, UA, wallpaper, IPC de UI.

Contratos: `IBackendPathResolver`, `IProcessSupervisor`, `IApiProbe`.

Factory: `createBackendServices({ app, projectRoot, getIsQuitting })`.

---

### 4.3 browser

| Classe / factory | Serviço |
|------------------|---------|
| **`BrowserServices`** | Facade: identity, harden, attach guest, URL policy. |
| **`UserAgentPolicy`** | Decide UA: Chrome “puro” só para hosts que precisam (WhatsApp/Discord/Spotify); Electron honesto no restante (inclui Google). |
| **`SessionHardener`** | Permissões, display-media, headers de UA na `Session`. |
| **`AuthPopupPolicy`** | Login/OAuth em popup nativo (preserva `window.opener`). **Não** cria aba. |
| **`GuestWebviewAttach`** | Liga `<webview>`: prefs, popup OAuth, UA no filho; atalhos via getters injetados. |

**Não faz:** criar BrowserWindow shell, IPC de Janelas, downloads.

Contratos: `IUserAgentPolicy`, `ISessionHardener`, `IPopupPolicy`.

Factory: `createBrowserServices({ app, session, desktopCapturer })`.

---

### 4.4 windows

| Classe / factory | Serviço |
|------------------|---------|
| **`WindowServices`** | Facade: criar janela, pending boot, menu. |
| **`WindowFactory`** | Cria `BrowserWindow` do shell DSX; anexa guest; limpa estado no `closed`. |
| **`PendingBootStore`** | Estado transitório por `webContents.id` (URL / tab / boot). Consume uma vez. |
| **`setupApplicationMenu`** | Win/Linux: limpa menu nativo (atalhos ficam no renderer). macOS: mantém default. |

**Não faz:** IPC `janelas:*`, ghost de drag, wallpaper.

Contratos: `IWindowFactory`, `IPendingBootStore`.

Factory: `createWindowServices({ BrowserWindow, projectRoot, isAllowedNavigationUrl, getActiveUserId, attachGuest, onClosed })`.

---

### 4.5 janelas

| Classe / factory | Serviço |
|------------------|---------|
| **`JanelasServices`** | Facade: drop registry + ghost + registro IPC. |
| **`JanelasIpc`** | Canais multi-janela / drag / ghost / cursor. |
| **`TabsDropRegistry`** | Bounds da barra de abas + resolve alvo de drop entre janelas. |
| **`DragGhost`** | Janela transparente que segue o cursor no drag de aba. |

**Não faz:** spawn de API, UA, wallpaper.

Contratos: `IJanelasIpcRegistrar`, `ITabsDropRegistry`, `IDragGhost`.

Factory: `createJanelasServices({ BrowserWindow, screen, windows, getActiveUserId, isAllowedNavigationUrl })`.

**IPC (resumo):** `cursor:create-window`, `cursor:consume-pending-url`, `janelas:create-with-tab`, `janelas:consume-pending-*`, `janelas:report-tabs-bounds`, `janelas:resolve-drop-target`, `janelas:drag-hover*`, `janelas:move-tab`, `janelas:drag-ghost-*`, `janelas:get-cursor-screen-point`.

---

### 4.6 shortcuts

| Classe / factory | Serviço |
|------------------|---------|
| **`ShortcutsServices`** | Facade + `register(ipcMain)`. |
| **`GuestShortcutBridge`** | Combos globais com foco no guest (espelha o ShortcutManager do renderer). |
| **`ShortcutsIpc`** | Recebe combos do renderer e grava por `webContents.id`. |

**Não faz:** criar janela, OAuth, downloads.

Contrato: `IGuestShortcutBridge` — `setCombos`, `setHoldCombos`, `clear`, `getPressCombos`, `getHoldCombos`, `comboFromInput`.

IPC: `shortcuts:set-global-combos`, `shortcuts:set-global-hold-combos`.

---

### 4.7 user

| Classe / factory | Serviço |
|------------------|---------|
| **`UserServices`** | Facade: `get` / `set` + IPC. |
| **`ActiveUser`** | Perfil ativo, pasta do usuário, avatar, limpeza de dados, origins conhecidas da session. |
| **`UserIpc`** | Canais `user:*` e `session:listKnownOrigins`. |

**Não faz:** wallpaper, dialogs de arquivo, downloads.

Contrato: `IActiveUser` — `get`, `set`, `ensureDir`, `saveAvatarDataUrl`, `deleteUserData`, `listKnownOrigins`.

IPC: `user:setActive`, `user:getActive`, `user:saveAvatarDataUrl`, `user:deleteUserData`, `session:listKnownOrigins`.

---

### 4.8 wallpaper

| Classe / factory | Serviço |
|------------------|---------|
| **`WallpaperServices`** | Facade: store + IPC. |
| **`WallpaperStore`** | Lê/grava `state.json`, importa arquivo/dataUrl/blob, seed default — por usuário ativo. |
| **`WallpaperIpc`** | Canais `wallpaper:*`. |

**Não faz:** gerenciar ActiveUser (só consome `getActiveUserId`), dialogs.

Contrato: `IWallpaperStore` — `readState`, `saveState`, `importFile`, `importDataUrl`, `importBlob`, `seedDefault`.

---

### 4.9 files

| Classe / factory | Serviço |
|------------------|---------|
| **`FilesServices`** | Facade + IPC. |
| **`FileDialogs`** | `readDir`, `getHome`, `pickFolder`. |
| **`FilesIpc`** | Canais `files:*`. |

Contrato: `IFileDialogs`.

IPC: `files:readDir`, `files:getHome`, `files:pickFolder`.

---

### 4.10 downloads

| Classe / factory | Serviço |
|------------------|---------|
| **`DownloadsServices`** | Facade: `attach(webContents)`. |
| **`DownloadTracker`** | Hook `will-download` → POST/PATCH na API `:3333` com `user_id` ativo. |

**Não faz:** conhecer Janelas ou Wallpaper.

Contrato: `IDownloadTracker` — `attach`.

Factory: `createDownloadsServices({ getActiveUserId })`.

---

## 5. Contratos (`Main/contracts/`)

Cada arquivo exporta um duck-check (`isX`) e documenta a superfície mínima em JSDoc.

| Contrato | Quem implementa | Para quem |
|----------|-----------------|-----------|
| `IAppBootstrap` | `AppLifecycle` | entry / lifecycle |
| `IBackendPathResolver` | `PathResolver` | supervisores backend |
| `IProcessSupervisor` | `ApiDsxSupervisor`, `MediaSdkSupervisor` | bootstrap (start/stop) |
| `IApiProbe` | `ApiDsxSupervisor` | quem espera a API pronta |
| `IUserAgentPolicy` | `UserAgentPolicy` | session + guest |
| `ISessionHardener` | `SessionHardener` | bootstrap + web-contents |
| `IPopupPolicy` | `AuthPopupPolicy` | guest attach |
| `IWindowFactory` | `WindowFactory` | janelas / cursor |
| `IPendingBootStore` | `PendingBootStore` | windows + janelas IPC |
| `ITabsDropRegistry` | `TabsDropRegistry` | drag entre janelas |
| `IDragGhost` | `DragGhost` | visual do drag |
| `IJanelasIpcRegistrar` | `JanelasIpc` | bootstrap (`register`) |
| `IActiveUser` | `ActiveUser` | wallpaper, downloads, windows |
| `IWallpaperStore` | `WallpaperStore` | UI wallpaper |
| `IFileDialogs` | `FileDialogs` | UI arquivos |
| `IDownloadTracker` | `DownloadTracker` | web-contents-created |
| `IGuestShortcutBridge` | `GuestShortcutBridge` | guest + IPC shortcuts |

Regra: se o cliente não usa o método, o método não entra no contrato desse cliente.

---

## 6. Regras de dependência

1. `contracts/` não depende de ninguém.
2. Serviços dependem de contratos + Electron + deps injetadas.
3. `janelas` usa `windows` + `getActiveUserId` + URL policy — **não** wallpaper/API.
4. `downloads` usa só `getActiveUserId` + HTTP — **não** Janelas.
5. `AuthPopupPolicy` só decide allow/deny — **não** cria aba.
6. Extensão nova: adapter no domínio + `register(ipcMain)`; o Composition Root ganha no máximo uma linha de wire.

---

## 7. Decisões que importam

| Tema | Decisão |
|------|--------|
| UA Google | Electron honesto (evita bloqueio de login). |
| UA WhatsApp / Discord / Spotify | Spoof Chrome “puro” (UI / players). |
| OAuth Google | Popup nativo (`window.opener`); não forçar em aba. |
| API packaged | Paths via `userData` / resolver — não assumir cwd do repo. |
| macOS quit | App pode ficar vivo no dock; API/SDK continuam ligados até quit real. |
| Atalhos Win/Linux | Menu nativo limpo; ShortcutManager no renderer + bridge no guest. |

---

## 8. Extender a Main

1. Criar pasta em `Main/<domínio>/` + contrato em `Main/contracts/` se precisar de ISP.
2. Expor `createXServices` + `register(ipcMain)` quando houver IPC.
3. Injetar deps no `createMainApp` (uma linha).
4. Não importar outro domínio diretamente — passar getter/callback pelo Composition Root.

`package.json` `build.files` já inclui `Main/**`.
