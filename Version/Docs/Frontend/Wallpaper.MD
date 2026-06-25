# Wallpaper/ — Painel Wallpaper (markup)

**Caminho:** `Frontend/src/Wallpaper/`

---

## Responsabilidade

**Somente o markup HTML** do overlay `#wallpaper-widget`. A lógica (upload, preview, aplicar ao fundo) está em `UserINTer/Tabline/idget/Wallpaper/index.js`.

Montado em `#wallpaperRoot` pelo `core/Shell.js`.

---

## Estrutura

```
Wallpaper/
└── Wallpaper.html      ← Overlay completo #wallpaper-widget
```

CSS: `UserINTer/Tabline/idget/Wallpaper/index.css` (via `manifest.css`).

JS: `UserINTer/Tabline/idget/Wallpaper/index.js` (carregado por `Tabline.js`).

---

## IDs importantes (consumidos pelo JS UserINTer)

| ID | Uso |
|----|-----|
| `#wallpaperPreview` | Container do preview |
| `#previewLayer` | Camada arrastável |
| `#wallpaperImageInput` / `#wallpaperVideoInput` | Upload |
| `#rotateControl`, `#flipHorizontal`, `#flipVertical` | Ajustes |
| `#applyWallpaper` | Aplicar ao `.background-video` |
| `#wallpaperStatus` | Mensagem de status |

---

## Abertura

Link na Tabline: `href="#wallpaper-widget"` → hash navigation + lógica em `Wallpaper/index.js`.

---

## Como mudar comportamento

| Objetivo | Onde editar |
|----------|-------------|
| Layout do painel | `Wallpaper.html` + `UserINTer/.../Wallpaper/index.css` |
| Upload / aplicar / persistência | `UserINTer/Tabline/idget/Wallpaper/index.js` |
| Vídeo de fundo padrão | `core/background.html` → `<source src="...">` |
| Adicionar barra de progresso no apply | incluir `#applyProgress*` no HTML (JS já suporta opcional) |

---

## Relação com core/background

- `core/background.html` — vídeo loop atrás de toda a UI
- `Wallpaper.html` — UI de configuração; ao aplicar, altera o `.background-video` em runtime
