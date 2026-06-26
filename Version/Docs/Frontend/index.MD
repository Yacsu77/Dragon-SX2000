# index.html — Shell da aplicação

**Caminho:** `Frontend/src/index.html` (~65 linhas)

---

## Responsabilidade

Ponto de entrada HTML mínimo: mount points vazios, um link CSS (`core/manifest.css`) e a ordem de carregamento dos scripts.

Não contém markup de nav, wallpaper, AutoTune ou tabline — tudo montado por `core/Shell.js` no bootstrap.

---

## Mount points no `<body>`

| ID / elemento | Montado por | Conteúdo |
|---------------|-------------|----------|
| `#backgroundRoot` | `Shell.js` | Vídeo de fundo (`core/background.html`) |
| `#topRoot` | `Shell.js` | Barra de navegação (`Top/Top.html`) |
| `#tabsRoot` | `Shell.js` | Barra de abas (`Tabs/Tabs.html`) |
| `#tablineRoot` | `Tabline.js` | Idgets laterais (`Tabline/Tabline.html`) |
| `#floating-cosmetics-root` | AutoTune | Widgets flutuantes na home |
| `#homePage` | `Home.js` | Área transparente da home tab |
| `#browser` | inline | Container webview (filho direto do body) |
| `#wallpaperRoot` | `Shell.js` | Painel Wallpaper (`Wallpaper/Wallpaper.html`) |
| `#autotuneRoot` | `Shell.js` | Catálogo AutoTune (`UserINTer/.../catalog.html`) |

> **Importante:** `#browser` deve permanecer filho direto de `body` com classe `browser-container` para o webview ocupar 100% da altura restante.

---

## Ordem de scripts

```
dragon-media-bridge → AppShell → Tabs.* → Browser → HomeSearch → ButtonGo → Search
→ history* → MiniHistorico → Telas → Favoritos → Menu → TopActions → Home
→ Tabline → Top → lucide → Factory → Shell → app.js → shortcuts/*
```

---

## Como mudar o comportamento

| Objetivo | Ação |
|----------|------|
| Adicionar novo script global | Inserir `<script src="...">` **antes** de `app.js`; respeitar dependências |
| Adicionar novo CSS | Incluir `@import` em `core/manifest.css` |
| Novo fragmento HTML no shell | Adicionar mount point aqui + entrada em `core/Shell.js` → `FRAGMENTS` |
| Alterar ordem de init | Editar `js/app.js` (não o HTML, salvo ordem de scripts) |
