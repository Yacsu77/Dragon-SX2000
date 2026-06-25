# DSX — Log de Lançamento

> O produto passou a se chamar **DSX** (antes Dragon SX2000). Executáveis e releases usam o prefixo `DSX`.

## Versão 1.2.4

| | |
|---|---|
| **Versão** | 1.2.4 |
| **Data de lançamento** | Jun/2026 |
| **Próximo lançamento** | 06/07/2026 |
| **Plataforma** | Desktop (Electron) |
| **Downloads** | [GitHub Releases](https://github.com/Yacsu77/Dragon-SX2000/releases) |

---

## O que foi implementado

### Refatoração modular do Frontend

| Área | Descrição |
|---|---|
| **CSS modular** | `styles.css` monolítico substituído por módulos em `core/`, `Top/`, `Tabs/`, `Home/`, `Browser/`, etc. |
| **Agregador** | `core/manifest.css` como único `<link>` no `index.html` |
| **Shell mínimo** | `index.html` reduzido (~65 linhas) com containers montados por `core/Shell.js` |
| **Top** | Menu, ButtonGo, Search, TopActions (Downloads, Arquivos, NewTab, Config) |
| **Tabs** | Dividido em `Tabs.state`, `.core`, `.anim`, `.reorder`, `.visibility` |
| **Home** | Área transparente (wallpaper visível); busca na barra superior |
| **Tabline + Browser** | Idgets laterais e navegação webview com CustomEvents |
| **Favoritos** | CRUD com `localStorage` (`dragon-favoritos-v1`) |
| **Arquivos** | Gerenciador local via IPC Electron (`DragonFiles`) |
| **Config** | Visão geral de abas estilo Safari |

### Fragmentos HTML extraídos

| Fragmento | Arquivo |
|---|---|
| Background | `core/background.html` |
| Barra superior | `Top/Top.html` |
| Barra de abas | `Tabs/Tabs.html` |
| Wallpaper | `Wallpaper/Wallpaper.html` |
| Catálogo AutoTune | `UserINTer/Tabline/idget/AutoTune/catalog.html` |

### Comunicação entre módulos

CustomEvents em `document`: `app:tab-changed`, `app:tab-created`, `app:tab-closed`, `app:home-shown`, `app:browser-shown`, `app:webview-navigated`.

### Build e identidade DSX

| Item | Detalhe |
|---|---|
| **productName** | `DSX` |
| **Artefatos** | `DSX-${version}-${os}-${arch}.${ext}` |
| **Ícones** | `Image/Icons/DSX_ICO_WIN.svg`, `DSX_ICO_MAC.svg`, `DSX_ICO_LINUX.svg` → `scripts/prepare-icons.js` |
| **CI/CD** | Build e release apenas na branch `main` (`.github/workflows/release.yml`) |

---

## Documentação

Nova pasta modular em `Version/Docs/Frontend/` — um guia por área do `src/`:

| Arquivo | Descrição |
|---|---|
| [`Inicial.MD`](../Docs/Frontend/Inicial.MD) | Visão geral, estrutura, CustomEvents, guia rápido de mudanças |
| [`index.MD`](../Docs/Frontend/index.MD) | Shell `index.html`, mount points, ordem de scripts |
| [`core.MD`](../Docs/Frontend/core.MD) | AppShell, Shell, CSS base, manifest |
| [`Top.MD`](../Docs/Frontend/Top.MD) | Menu, ButtonGo, Search |
| [`TopActions.MD`](../Docs/Frontend/TopActions.MD) | Downloads, Arquivos, NewTab, Config |
| [`Tabs.MD`](../Docs/Frontend/Tabs.MD) | Sistema de abas (core, anim, reorder, visibility) |
| [`Tabline.MD`](../Docs/Frontend/Tabline.MD) | Idgets laterais |
| [`Home.MD`](../Docs/Frontend/Home.MD) | Home tab + HomeSearch |
| [`Browser.MD`](../Docs/Frontend/Browser.MD) | Webview e layout |
| [`Favoritos.MD`](../Docs/Frontend/Favoritos.MD) | CRUD localStorage |
| [`Wallpaper.MD`](../Docs/Frontend/Wallpaper.MD) | Markup do painel Wallpaper |
| [`js.MD`](../Docs/Frontend/js.MD) | Bootstrap, histórico, media bridge |
| [`shortcuts.MD`](../Docs/Frontend/shortcuts.MD) | Atalhos globais (espelho técnico do README em `src/`) |

Outros documentos atualizados:

| Arquivo | Descrição |
|---|---|
| [`TaskPlanejamento.MD`](../Docs/TaskPlanejamento.MD) | Checklist da refatoração (Fases 0–7 concluídas) |
| [`ChecklistRegressao.MD`](../Docs/ChecklistRegressao.MD) | Testes manuais por fase |
| [`Autotune.md`](../Docs/Autotune.md) | Paths do catálogo `catalog.html` e Shell |
| [`Planejamento.MD`](../Docs/Planejamento.MD) | Arquitetura completa da migração |
| [`Frontend/src/shortcuts/README.md`](../../Frontend/src/shortcuts/README.md) | Atalhos + versão DSX e link para Releases |

---

## Arquivos removidos

- `Frontend/src/css/styles.css` (agregador legado)
- `Frontend/src/js/tabs.js`, `search.js`, `mainMenu.js` (migrados em fases anteriores)
- Protótipo React (`App.jsx`, `Home.jsx`, `SearchBar.jsx`)

---

## Downloads

Instaladores publicados **somente** em [GitHub Releases](https://github.com/Yacsu77/Dragon-SX2000/releases):

- Windows: `DSX-1.2.4-win-x64.exe`
- macOS: `DSX-1.2.4-mac-x64.dmg`
- Linux: `DSX-1.2.4-linux-x64.deb` e `.AppImage`
