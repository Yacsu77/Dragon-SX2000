# DSX — Log de Lançamento

> O produto passou a se chamar **DSX** (antes Dragon SX2000). Executáveis e releases usam o prefixo `DSX`.

## Versão 1.4.0 (Beta)

| | |
|---|---|
| **Versão** | 1.4.0 Beta |
| **Data de lançamento** | **04/08/2026** |
| **Disponível em** | [dragonsx.com.br](https://dragonsx.com.br) |
| **Plataforma** | Desktop (Electron) |
| **Downloads** | [dragonsx.com.br](https://dragonsx.com.br) · [GitHub Releases](https://github.com/Yacsu77/Dragon-SX2000/releases) |

---

## Destaques desta versão

- **Grupos de abas** por usuário (API + UI + sincronização de snapshots)
- **Layout Topo Global** no Customise (busca, botões, Music, acabamento, abas)
- **Busca Inteligente** compartilhada (topo, AutoTune, Shortcuts) com autocomplete por domínio e sugestões do Google
- **Gerenciador de senhas** estilo Safari (Observer) com login automático por formulário e por URL
- **Music minimal** com posições: esquerda, direita (entre busca e botões) ou embaixo
- **Multijanelas (Janelas)** — preview, detach, transfer, split in-window, layouts e animações no Customise
- **Desempenho P0–P4** — idle, drag leve, TabWarmth, troca de tela sem piscar, RGB estável em multi-monitor
- Barra de abas mais estável: destaque, condensação com 7+, borda LED opcional
- Isolamento correto da API SQLite + boot resiliente (`boot.js`, `/ready` com `starting`)
- **Build empacotado**: API-DSX + Media SDK e deps nativas vão em `extraResources`; wallpapers WWP incluídos

---

## O que foi implementado

### Grupos de abas (API + Frontend)

| Item | Descrição |
|---|---|
| **Tabelas** | `tab_groups` e `tab_group_tabs` no SQLite (`API-DSX/DB/sqlite.js`) |
| **API** | Rotas `/tab-groups` — CRUD de grupos + replace de abas; isolado por `user_id` |
| **Camadas** | DTO · Service · Controller · Routes (`tabGroups*`) |
| **Cascade** | Exclusão de usuário remove grupos/abas do grupo |
| **Frontend** | `TabGroups.state` · `TabGroups.service` · `TabGroups.runtime` · `TabGroups.render` |
| **Cliente** | `TabGroupsApi` em `Frontend/src/js/userApi.js` |
| **Comportamento** | Só o grupo ativo mantém webviews no DOM; inativos ficam em snapshot |
| **UI** | Botão de grupos à esquerda da barra; painel minimalista; hover com 5 primeiras abas; reordenação por arraste |
| **Cursor** | Menu de contexto: adicionar/mover/criar grupo |

**Arquivos:** `Backend/API-DSX/**/tabGroups*`, `Frontend/src/Tabs/TabGroups.*`, `Tabs.core.js`, `Tabs.html` / `Tabs.css`

---

### Layout Topo Global (Customise)

| Item | Descrição |
|---|---|
| **Nome** | Antes “Chrome Layout”; agora **Layout Topo Global** no catálogo Customise |
| **Persistência** | `dragonsx.chrome.layout` via `ChromeLayoutSettings` + `UserStorage` |
| **Seções** | Busca · Botões · Music · Acabamento · Abas |
| **Preview** | Espelho visual fiel do Top com ícones SVG originais |
| **Edição ao vivo** | Overlay transparente no topo para ver o Top real enquanto ajusta |
| **Busca** | Sempre centralizada; largura `260–820px` (`--nav-search-width`) |
| **Botões** | Fixos à **direita**; On/Off + reordenação por arraste (`rightOrder`) |
| **Acabamento** | Cor e intensidade das bordas do chrome |
| **Abas (Customise)** | Opacidade da aba ativa + borda LED animada |

**Arquivos:** `UserINTer/Tabline/idget/Customise/components/topoGlobal/`, `chromeLayoutSettings.js`, `ChromeLayout.js`, `Top.html` / `Top.css`  
**Arquitetura:** ver [`Customise.md`](../Docs/Customise.md) (Factory + Adapters por componente)

---

### Busca Inteligente (topo · AutoTune · Shortcuts)

| Item | Descrição |
|---|---|
| **Núcleo** | `SmartSearch.attach()` / `SmartSearch.navigate()` compartilhado pelos três buscadores |
| **Fontes** | Histórico (frecência) · logins do Vault · sessões ativas · sugestões do Google |
| **Sites visitados** | Até 2 recomendações, os mais acessados |
| **Google** | 5 sugestões com recomendação local, 7 sem — via `client=gws-wiz` (igual google.com), fallback `client=chrome` |
| **Autocomplete** | Observa o domínio: `senac` → `senac.br`, `yo` → `youtube.com`; `Enter` entra na URL real |
| **Navegação** | Topo e AutoTune usam a **aba atual**; Shortcuts abre **aba nova** |
| **Login automático** | Navegar por URL arma tentativa de preenchimento por 20s (integra Password Manager) |
| **Privacidade** | `session:listKnownOrigins` expõe só origens com sessão, nunca cookies |
| **UI** | Painel 10% maior; posiciona-se abaixo das abas; animação “descida”; borda LED RGB ou 1 cor |
| **Customise** | Item **Buscadores** (`dragonsx.smart-search`): borda, opacidade, fonte, animação |
| **API** | `GET /history/suggestions` → `{ sites, google }`; feature `smart-suggestions` no `/ready` |

**Arquivos:** `Frontend/src/search/SmartSearch.*`, `Backend/API-DSX/Services/historyService.js`, `Backend/API-DSX/DB/redis.js`, `UserINTer/Tabline/idget/Customise/components/smartSearch/`, `Top/Search/Search.js`, `shortcuts/overlays/search-palette/`, `AutoTune/Share/index.js`  
**Documentação:** ver [`BuscaInteligente.md`](../Docs/BuscaInteligente.md)

---

### Top — grid centrado e slots de Music

| Item | Descrição |
|---|---|
| **Layout** | Grid `1fr \| busca \| 1fr` — busca permanece no centro real da janela |
| **Slots** | `navMusicSlotLeft` / `navMusicSlotRight` entre navegação e botões |
| **Music · Esquerda** | Entre botões de voltar/avançar e a busca |
| **Music · Direita** | Entre a busca e os botões da direita |
| **Music · Embaixo** | Posição legada sob as abas (arraste horizontal liberado) |
| **Espaçamento** | `--nav-music-gap` simétrico entre busca ↔ Music e Music ↔ botões |

**Arquivos:** `Frontend/src/Top/Top.html`, `Top.css`, `Search/Search.css`

---

### AutoTune Music minimal — posições

| Posição | Comportamento |
|---|---|
| **right** (padrão) | Inline no Top, entre busca e botões; sem arraste |
| **left** | Inline no Top, entre nav esquerda e busca; sem arraste |
| **bottom** | Fixed sob a tabs-bar; grip de arraste ativo (offset persistido) |
| **Controle** | Customise → Layout Topo Global → Music |

**Arquivos:** `UserINTer/Tabline/idget/AutoTune/Music/minimal.js`, `minimal.css`

---

### Barra de abas — UX e estabilidade

| Item | Descrição |
|---|---|
| **Aba ativa** | Destaque configurável (opacidade); mais escura/sólida conforme slider |
| **Borda LED** | Linha luminosa animada na aba selecionada (opcional) |
| **7+ abas** | Ativa mantém largura ≈ `containerWidth / 5`; demais dividem o restante |
| **Botão fechar (X)** | Sempre à esquerda; clique estável (não conflita com LED) |
| **Alinhamento** | Botão de grupos alinhado em altura com as abas |
| **Laterais** | Padding horizontal maior na barra |

**Arquivos:** `Frontend/src/Tabs/Tabs.css`, `Tabs.visibility.js`, `Tabs.core.js`

---

### API-DSX — saúde do processo e banco

| Item | Descrição |
|---|---|
| **`/ready`** | Reporta `project_root`, `api_root`, `db_path`, `pid` |
| **main.js** | Só reutiliza API se `project_root` bater com o app atual; senão reinicia |
| **Bug** | Processo stale (ex.: cópia na Lixeira) causava `SQLITE_READONLY` no login/CRUD |
| **Feature flag** | Grupos de abas anunciados no payload de `/ready` |

**Arquivos:** `Backend/API-DSX/app.js`, `Backend/API-DSX/DB/sqlite.js`, `main.js`

---

### SessionTabs × grupos

| Item | Descrição |
|---|---|
| **Conflito** | Com runtime de grupos ativo, restauração genérica de sessão de abas fica desabilitada |
| **Motivo** | Snapshots por grupo passam a ser a fonte de verdade por usuário |

---

### Multijanelas — módulo `Frontend/src/Janelas/` (SOLID)

| Feature | Descrição |
|---|---|
| **1 · Preview** | Hover ≥ 0.5s em aba inativa → miniatura (`TabPreview` + `ThumbnailCache`); RMB/drag cancelam; aba ativa sem preview |
| **2 · Detach** | Arrastar aba abaixo do limiar Y → ghost + nova `BrowserWindow` com snapshot (`DetachController` / IPC) |
| **3 · Transfer** | Drop na barra de outra janela OS → move snapshot (`TransferController` / `receive-tab`) |
| **4 · Split** | Menu Dividir E/D; dois painéis no `#browser`; divisor bolinha→X; fechar volta à aba esquerda (`SplitHost`) |
| **5 · Customise** | Abas Janela / Multi / Geral: layouts padrão/flutuante, bordas, RGB, `tabTransition` none\|flip\|file-drop |

**Arquivos:** `Frontend/src/Janelas/**`, `UserINTer/.../Customise/components/janelas/`, IPC em `main.js` / `WindowBridge.js`  
**Docs:** [`Janelas.MD`](../Docs/Frontend/Janelas.MD)

---

### Desempenho e troca de tela (P0–P4)

| Fase | O que mudou |
|---|---|
| **P0** | `PerfIdle`; ThumbnailCache sem loop 2.5s; Transfer bounds sob demanda; PiP poll só com menu/PiP ativo |
| **P1** | Um listener global de drag + rAF; sem `backdrop-filter` por frame no arraste |
| **P2** | Blur só na barra/aba ativa; `perf-window-idle` / `perf-window-hidden` |
| **P3** | `activateTab` por refs; `capturePage` só com cache frio |
| **P4 · TabWarmth** | `deferLoad`, fila de hidratação, discard frio (>8); hydrate **depois** do 1º paint na troca |
| **Crossfade** | Conteúdo↔conteúdo: tela nova opaca por baixo, anterior some por cima (~320ms, só opacity — sem `filter:blur` no guest) |
| **New Tab ↔ conteúdo** | `AppShell` crossfade home↔browser (`surface-crossfade`) |
| **Flip/drop** | Só quando a troca envolve New Tab/home; sem baixar opacity do `#browser` (evita piscar) |
| **Split** | Limpa `is-leaving`/filter residual; painéis sempre legíveis |
| **RGB** | `RgbClock` (ângulo via JS) + `backgroundThrottling: false`; continua em outro monitor |
| **Many-tabs** | Larguras só via CSS vars; chrome sólido durante `janelas-content-switching` |

**Arquivos:** `TabWarmth.js`, `Tabs.core.js`, `Browser.css`, `AppShell.js`, `shell.css`, `AnimationHook.js`, `RgbClock.js`, `PerfIdle.js`, `main.js`

---

### API-DSX — boot e cold-start

| Item | Descrição |
|---|---|
| **`boot.js`** | Empacotado: usa deps bundled (`DSX_PACKAGED=1`); Dev/iCloud: runtime em userData + npm |
| **`/ready`** | Responde `starting` cedo; features incluem `tab-groups`, `smart-suggestions`, `janelas`, `tab-warmth` |
| **main.js** | Paths via `extraResources`; DB em `userData/API-DSX`; espera/retries; macOS mantém API ao fechar janela |
| **Build** | `prepare-backend.js` + `extraResources` (API + SDK + `node_modules`); wallpapers WWP no asar |

**Arquivos:** `Backend/API-DSX/boot.js`, `app.js`, `main.js`, `scripts/prepare-backend.js`, `package.json`

---

## Persistência de dados (atualizado)

| Módulo | Armazenamento | O que salva |
|---|---|---|
| **Grupos de abas** | SQLite `tab_groups` / `tab_group_tabs` | Nome, cor, ícone, posição, abas (url/title/favicon/home/active) |
| **Layout Topo Global** | `dragonsx.chrome.layout` | Busca, botões (`rightItems`/`rightOrder`), Music, bordas, opacidade/LED |
| **Busca Inteligente** | `customiseSettings['dragonsx.smart-search']` + Redis `smart-search:rank:{userId}` | Borda/opacidade/fonte/animação + ranking de URLs por frecência |
| **Janelas** | `customiseSettings` / Store Janelas (`version`, layouts, bordas, `tabTransition`) | Preferências de layout/animação por usuário |
| **AutoTune Music minimal** | `settingsAUTO.music` | `minimal`, `minimalOffsetX`, `minimalVolumeLevel` |
| **Demais módulos** | Sem alteração em relação à v1.3 | Ver [`Log v1.3.MD`](Log%20v1.3.MD) |

---

## Documentação

| Arquivo | Descrição |
|---|---|
| [`Janelas.MD`](../Docs/Frontend/Janelas.MD) | Multijanelas, split, layouts, animações, perf |
| [`Top.MD`](../Docs/Frontend/Top.MD) | Grid do Top, Music slots, ChromeLayout |
| [`Tabs.MD`](../Docs/Frontend/Tabs.MD) | Grupos, many-tabs, TabWarmth, LED |
| [`Browser.MD`](../Docs/Frontend/Browser.MD) | Crossfade de webviews, perf-render-all |
| [`core.MD`](../Docs/Frontend/core.MD) | AppShell home↔browser |
| [`Autotune.md`](../Docs/Autotune.md) | Music minimal e posições no Topo Global |
| [`Customise.md`](../Docs/Customise.md) | Customise modular (Factory + Adapters) |
| [`BuscaInteligente.md`](../Docs/BuscaInteligente.md) | Busca inteligente, autocomplete e sugestões |
| [`Inicial.MD`](../Docs/Frontend/Inicial.MD) / [`index.MD`](../Docs/Frontend/index.MD) | Mapa e scripts atualizados |
| [`DB.md`](../../Backend/API-DSX/Docs/DB.md) | Tabelas `tab_groups` / `tab_group_tabs` |
| [`Log v1.3.MD`](Log%20v1.3.MD) | Release anterior |
| [`Log v1.2.MD`](Log%20v1.2.MD) | Refatoração modular Frontend |
| [`Log v1.1.MD`](Log%20v1.1.MD) | AutoTune Clock, Factory, histórico |
| [`Log 1.0.MD`](Log%201.0.MD) | Release beta inicial |

---

## Downloads

A partir de **04/08/2026**, instaladores em [dragonsx.com.br](https://dragonsx.com.br) e espelho em [GitHub Releases](https://github.com/Yacsu77/Dragon-SX2000/releases):

- Windows: `DSX-1.4.0-win-x64.exe`
- macOS: `DSX-1.4.0-mac-x64.dmg` / `arm64`
- Linux: `DSX-1.4.0-linux-x64.deb` e `.AppImage`

---

<p align="center">
  <sub>DSX 1.4.0 Beta — lançamento 04/08/2026 · dragonsx.com.br — © Pedro Henrique Carneichuk Rosa</sub>
</p>
